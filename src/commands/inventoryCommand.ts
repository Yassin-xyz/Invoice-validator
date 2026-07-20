import * as vscode from 'vscode';
import { buildInventory, Inventory, InventoryEntry } from '../inventory/inventory';
import { loadBtMap } from '../annotation/btAnnotator';
import { detectXmlContent } from '../detection/formatDetector';
import { loadUseCases, detectUseCases, UseCaseMatch } from '../inventory/useCases';
import * as fs from 'fs';
import * as path from 'path';

interface TermDetail {
    t?: string; f?: string; l?: string;
    o0?: string; o1?: string; o2?: string;
    c?: string; d?: string; uc?: number[]; r?: string[];
}

function loadDetails(extensionPath: string): Record<string, TermDetail> {
    try {
        return JSON.parse(fs.readFileSync(
            path.join(extensionPath, 'validation-artifacts', 'i18n', 'term-details.json'), 'utf8'));
    } catch { return {}; }
}

function findDetail(id: string, details: Record<string, TermDetail>): TermDetail | undefined {
    for (const candidate of id.split('/')) {
        const clean = candidate.replace(/ \+\d+$/, '').trim();
        if (details[clean]) { return details[clean]; }
        const base = clean.match(/^((?:EXT-FR-FE(?:-BG)?|BT-X|BT|BG)-\d+)/)?.[1];
        if (base && details[base]) { return details[base]; }
    }
    return undefined;
}

const OB: Record<string, string> = { X: 'obligatoire', D: 'selon condition', '': 'facultatif' };

function detailHtml(d: TermDetail | undefined): string {
    if (!d) { return '<span class="dim">Pas de fiche détaillée pour ce terme.</span>'; }
    const parts: string[] = [];
    if (d.t) { parts.push(`<b>Type</b> ${esc(d.t)}`); }
    if (d.f) { parts.push(`<b>Format</b> ${esc(d.f)}`); }
    if (d.c) { parts.push(`<b>Cardinalité</b> ${esc(d.c)}`); }
    parts.push(`<b>Obligatoire</b> 2026 (démarrage) : ${OB[d.o1 ?? ''] ?? esc(d.o1 ?? '')} · 2027 (cible) : ${OB[d.o2 ?? ''] ?? esc(d.o2 ?? '')}`);
    if (d.l) { parts.push(`<b>Liste de valeurs</b> ${esc(d.l)}`); }
    if (d.d) { parts.push(`<b>Condition</b> ${esc(d.d)}`); }
    if (d.uc?.length) { parts.push(`<b>Cas d'usage</b> ${d.uc.map((n) => 'n°' + n).join(', ')}`); }
    if (d.r?.length) { parts.push(`<b>Règles associées</b> ${d.r.map((x) => `<code>${esc(x)}</code>`).join(' ')}`); }
    return parts.join('<br>');
}

/**
 * Ouvre un rapport « Inventaire des termes » : liste unitaire des BG, BT
 * et éléments non cartographiés (candidats EXT) présents dans la facture,
 * avec occurrences, exemple de valeur et saut à la première occurrence.
 */
export async function inventoryCommand(
    uri: vscode.Uri | undefined,
    context: vscode.ExtensionContext
): Promise<void> {
    const target = uri
        ? await vscode.workspace.openTextDocument(uri)
        : vscode.window.activeTextEditor?.document;
    if (!target) {
        vscode.window.showWarningMessage('Ouvrez une facture XML pour en dresser l\'inventaire.');
        return;
    }
    const xml = target.getText();
    const detection = detectXmlContent(xml);
    if (detection.syntax !== 'ubl' && detection.syntax !== 'cii') {
        vscode.window.showErrorMessage(
            'Inventaire : le document doit être une facture UBL ou CII (pour un Factur-X, validez le PDF puis lancez l\'inventaire sur le XML extrait).'
        );
        return;
    }

    const inventory = buildInventory(xml, detection.syntax, loadBtMap(context.extensionPath));
    const details = loadDetails(context.extensionPath);
    const strongIds = inventory.ext.map((e) => e.id);
    const allIds = [...inventory.bt, ...inventory.ext, ...inventory.bg].map((e) => e.id);
    const useCaseMatches = detectUseCases(strongIds, allIds, loadUseCases(context.extensionPath));
    const fileName = target.uri.path.split('/').pop() ?? 'facture';

    const panel = vscode.window.createWebviewPanel(
        'factureValidator.inventory',
        `Inventaire — ${fileName}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );
    panel.webview.html = renderHtml(inventory, fileName, detection.syntax, useCaseMatches, details);

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.type !== 'goto') {
            return;
        }
        const editor = await vscode.window.showTextDocument(target, {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: false,
            preview: false,
        });
        const pos = new vscode.Position(msg.line, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
    });
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function rows(
    entries: InventoryEntry[],
    showLabel: boolean,
    showBg: boolean,
    details: Record<string, TermDetail>
): string {
    const cols = 3 + (showLabel ? 1 : 0) + (showBg ? 1 : 0) + 1;
    return entries
        .map(
            (e) => `<tr data-line="${e.firstLine}" class="main">
  <td class="id">${esc(e.id)}</td>
  ${showLabel ? `<td>${esc(e.label)}</td>` : ''}
  ${showBg ? `<td class="id dim">${e.bg ? esc(e.bg) : '<span class="dim">racine</span>'}</td>` : ''}
  <td class="num">${e.count}</td>
  <td class="ex">${e.example ? esc(e.example) : '<span class="dim">—</span>'}</td>
  <td class="num dim">l. ${e.firstLine + 1}</td>
</tr>
<tr class="drow"><td colspan="${cols}">${detailHtml(findDetail(e.id, details))}</td></tr>`
        )
        .join('');
}

function useCaseSection(matches: UseCaseMatch[]): string {
    if (matches.length === 0) {
        return `<div class="note">Aucun marqueur distinctif de cas d'usage détecté — facture au schéma simple.
Certains cas (détaxe, marge bénéficiaire, arrhes…) ne sont pas détectables par la seule structure.</div>`;
    }
    return matches
        .map((m) => {
            const pct = Math.round(m.confidence * 100);
            const strong = m.confidence >= 0.5;
            return `<div class="uc ${strong ? 'strong' : ''}">
  <div class="uc-head"><span class="badge ${strong ? '' : 'dim'}">Cas ${m.useCase.id}</span>
    <strong>${esc(m.useCase.titre)}</strong>
    <span class="dim">${m.matched.length}/${m.matched.length + m.missing.length} marqueurs (${pct}%)</span></div>
  <div class="uc-body">Preuves : ${m.matched.map((t) => `<code>${esc(t)}</code>`).join(' ')}
    ${m.missing.length ? `· absents : ${m.missing.slice(0, 4).map((t) => `<code class="dim">${esc(t)}</code>`).join(' ')}${m.missing.length > 4 ? ' …' : ''}` : ''}
    ${m.supporting.length ? `<br><span class="dim">Termes d'appui présents : ${esc(m.supporting.slice(0, 8).join(', '))}</span>` : ''}
    ${m.useCase.note ? `<br><span class="dim">${esc(m.useCase.note.slice(0, 180))}…</span>` : ''}</div>
</div>`;
        })
        .join('');
}

function renderHtml(inv: Inventory, fileName: string, syntax: string, ucMatches: UseCaseMatch[], details: Record<string, TermDetail>): string {
    const nonce = String(Math.random()).slice(2);
    return /* html */ `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground);
         padding: 14px 18px; font-size: 13px; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .sub { color: var(--vscode-descriptionForeground); margin-bottom: 14px; }
  h2 { font-size: 13px; margin: 18px 0 6px; }
  .badge { display: inline-block; padding: 0 8px; border-radius: 9px; font-size: 11px;
           font-weight: 600; background: var(--vscode-badge-background);
           color: var(--vscode-badge-foreground); margin-left: 6px; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .03em;
       color: var(--vscode-descriptionForeground); padding: 4px 8px;
       border-bottom: 1px solid var(--vscode-input-border, #555); }
  td { padding: 4px 8px; border-bottom: 1px solid var(--vscode-input-border, rgba(128,128,128,.15)); }
  tr { cursor: pointer; }
  tbody tr:hover { background: var(--vscode-list-hoverBackground); }
  .id { font-family: var(--vscode-editor-font-family); font-weight: 600; white-space: nowrap; }
  .num { text-align: right; white-space: nowrap; }
  .ex { font-family: var(--vscode-editor-font-family); font-size: 12px; }
  .dim { color: var(--vscode-descriptionForeground); }
  .note { color: var(--vscode-descriptionForeground); font-size: 12px; margin: 4px 0 8px; }
  tr.drow { display: none; }
  tr.drow.open { display: table-row; }
  tr.drow td { font-size: 12px; padding: 7px 10px 9px 22px; cursor: default;
               background: var(--vscode-list-inactiveSelectionBackground, rgba(128,128,128,.06));
               border-left: 3px solid var(--vscode-focusBorder, #888); line-height: 1.55; }
  .uc { border-left: 3px solid var(--vscode-input-border, #666); padding: 6px 10px; margin: 6px 0;
        background: var(--vscode-list-inactiveSelectionBackground, rgba(128,128,128,.07)); border-radius: 3px; }
  .uc.strong { border-left-color: var(--vscode-testing-iconPassed, #73c991); }
  .uc-head { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
  .uc-body { font-size: 12px; margin-top: 3px; }
  code { font-family: var(--vscode-editor-font-family); font-size: 11px;
         background: var(--vscode-textCodeBlock-background, rgba(128,128,128,.15));
         padding: 0 4px; border-radius: 3px; }
</style></head><body>
<h1>Inventaire des termes — ${esc(fileName)}</h1>
<div class="sub">Syntaxe ${syntax.toUpperCase()} · ${inv.totalElements} éléments ·
${inv.bg.length} groupes BG · ${inv.bt.length} termes BT · ${inv.ext.length} termes EXT · ${inv.unmapped.length} non cartographiés.
Cliquez sur une ligne pour déplier sa fiche (type, format, obligations 2026/2027, cas d'usage) et aller à la première occurrence.
Obligations : X = obligatoire, D = selon condition, vide = facultatif (source : dictionnaire officiel V5.5.6).</div>

<h2>Groupes métier présents <span class="badge">BG</span></h2>
<table><thead><tr><th>ID</th><th>Libellé</th><th>Occ.</th><th>Exemple</th><th>1ʳᵉ occ.</th></tr></thead>
<tbody>${rows(inv.bg, true, false, details)}</tbody></table>

<h2>Termes métier présents <span class="badge">BT</span></h2>
<table><thead><tr><th>ID</th><th>Libellé</th><th>Groupe</th><th>Occ.</th><th>Exemple de valeur</th><th>1ʳᵉ occ.</th></tr></thead>
<tbody>${rows(inv.bt, true, true, details)}</tbody></table>

<h2>Termes étendus présents <span class="badge">EXT-FR</span></h2>
${inv.ext.length === 0
  ? '<div class="note">Aucun terme étendu EXT-FR détecté (profil EN 16931 simple).</div>'
  : `<table><thead><tr><th>ID</th><th>Libellé</th><th>Groupe</th><th>Occ.</th><th>Exemple de valeur</th><th>1ʳᵉ occ.</th></tr></thead>
<tbody>${rows(inv.ext, true, true, details)}</tbody></table>`}

<h2>Cas d'usage détectés <span class="badge">spécifications externes</span></h2>
${useCaseSection(ucMatches)}

<h2>Éléments porteurs de données non cartographiés <span class="badge">candidats EXT / hors socle</span></h2>
<div class="note">Éléments feuilles contenant une valeur mais absents de la carte BT/BG :
données étendues (EXT-FR), spécificités du format, ou termes à ajouter dans bt-map.json.</div>
<table><thead><tr><th>Chemin (2 derniers segments)</th><th>Occ.</th><th>Exemple de valeur</th><th>1ʳᵉ occ.</th></tr></thead>
<tbody>${rows(inv.unmapped, false, false, details)}</tbody></table>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  document.querySelectorAll('tbody tr.main').forEach(tr =>
    tr.addEventListener('click', () => {
      tr.nextElementSibling?.classList.toggle('open');
      vscode.postMessage({ type: 'goto', line: Number(tr.dataset.line) });
    }));
</script>
</body></html>`;
}
