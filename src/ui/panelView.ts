import * as vscode from 'vscode';

export interface PanelIssue {
    ruleId: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    ruleset: string;
    line: number;   // 0-based
    col: number;
    endCol: number;
}

export interface PanelResults {
    uri: string;
    fileName: string;
    syntax: string;
    when: string;
    items: PanelIssue[];
}

/**
 * Panneau latéral « Facture » : boutons d'action, options rapides et
 * résultats de la dernière validation (filtrables, cliquables → saut
 * à la ligne concernée).
 */
export class FacturePanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'factureValidator.panel';

    private view?: vscode.WebviewView;
    private lastResults?: PanelResults;

    constructor(private readonly context: vscode.ExtensionContext) {}

    /** Appelé par la commande de validation pour publier les résultats. */
    setResults(results: PanelResults): void {
        this.lastResults = results;
        this.view?.webview.postMessage({ type: 'results', results });
        this.view?.show?.(true);
    }

    resolveWebviewView(view: vscode.WebviewView): void {
        this.view = view;
        view.webview.options = { enableScripts: true };
        view.webview.html = this.html();

        view.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.type) {
                case 'run':
                    await vscode.commands.executeCommand(msg.command);
                    break;
                case 'toggleRuleset':
                    await this.toggleRuleset(msg.ruleset, msg.enabled, msg.syntaxes);
                    break;
                case 'setConfig':
                    await vscode.workspace
                        .getConfiguration('factureValidator')
                        .update(msg.key, msg.value, vscode.ConfigurationTarget.Global);
                    break;
                case 'openIssue':
                    await this.openIssue(msg.index);
                    break;
                case 'ready':
                    view.webview.postMessage({ type: 'state', state: this.readState() });
                    if (this.lastResults) {
                        view.webview.postMessage({ type: 'results', results: this.lastResults });
                    }
                    break;
            }
        });

        const sub = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('factureValidator')) {
                view.webview.postMessage({ type: 'state', state: this.readState() });
            }
        });
        view.onDidDispose(() => {
            sub.dispose();
            this.view = undefined;
        });
    }

    private async openIssue(index: number): Promise<void> {
        const item = this.lastResults?.items[index];
        if (!item || !this.lastResults) {
            return;
        }
        try {
            const uri = vscode.Uri.parse(this.lastResults.uri);
            const doc = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(doc, { preview: false });
            const start = new vscode.Position(item.line, item.col);
            const end = new vscode.Position(item.line, Math.max(item.endCol, item.col + 1));
            editor.selection = new vscode.Selection(start, end);
            editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
        } catch {
            vscode.window.showWarningMessage(
                'Impossible de rouvrir le document validé (fermé ?). Relancez la validation.'
            );
        }
    }

    private readState() {
        const cfg = vscode.workspace.getConfiguration('factureValidator');
        const ubl = cfg.get<string[]>('rulesets.ubl', []);
        const cii = cfg.get<string[]>('rulesets.cii', []);
        return {
            frCtc: ubl.includes('fr-ctc') && cii.includes('fr-ctc'),
            peppol: ubl.includes('peppol'),
            cef: ubl.includes('en16931-cef') && cii.includes('en16931-cef'),
            cplus: ubl.includes('controles-plus') && cii.includes('controles-plus'),
            xsd: cfg.get<boolean>('xsdValidation', true),
            lang: cfg.get<string>('messageLanguage', 'fr'),
            frProfile: cfg.get<string>('frSeverityProfile', 'strict'),
        };
    }

    private async toggleRuleset(
        ruleset: string,
        enabled: boolean,
        syntaxes: Array<'ubl' | 'cii'>
    ): Promise<void> {
        const cfg = vscode.workspace.getConfiguration('factureValidator');
        for (const syntax of syntaxes) {
            const key = `rulesets.${syntax}`;
            const current = new Set(cfg.get<string[]>(key, []));
            if (enabled) {
                current.add(ruleset);
            } else {
                current.delete(ruleset);
            }
            await cfg.update(key, [...current], vscode.ConfigurationTarget.Global);
        }
    }

    private html(): string {
        const nonce = String(Math.random()).slice(2);
        return /* html */ `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground);
         padding: 8px 12px; font-size: 13px; }
  h3 { margin: 14px 0 6px; font-size: 11px; text-transform: uppercase;
       letter-spacing: .04em; color: var(--vscode-descriptionForeground); }
  button.action { display: block; width: 100%; margin: 5px 0; padding: 7px 10px;
           border: none; border-radius: 3px; cursor: pointer; text-align: left;
           background: var(--vscode-button-secondaryBackground);
           color: var(--vscode-button-secondaryForeground); }
  button.action:hover { background: var(--vscode-button-secondaryHoverBackground); }
  button.primary { background: var(--vscode-button-background);
                   color: var(--vscode-button-foreground); font-weight: 600; }
  button.primary:hover { background: var(--vscode-button-hoverBackground); }
  label { display: flex; align-items: center; gap: 7px; margin: 7px 0; cursor: pointer; }
  select, input[type=text] { width: 100%; padding: 4px; box-sizing: border-box;
           background: var(--vscode-input-background);
           color: var(--vscode-input-foreground);
           border: 1px solid var(--vscode-input-border, transparent); border-radius: 3px; }
  .hint { color: var(--vscode-descriptionForeground); font-size: 11px; margin: 2px 0 0 0; }

  /* ---- Résultats ---- */
  #summary { margin: 4px 0 8px; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 9px; font-size: 11px;
           font-weight: 600; margin-right: 5px; }
  .badge.err { background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
               color: var(--vscode-errorForeground); }
  .badge.warn { background: var(--vscode-inputValidation-warningBackground, #5a4a1d);
                color: var(--vscode-editorWarning-foreground, #cca700); }
  .badge.ok { background: var(--vscode-inputValidation-infoBackground, #1d3a5a);
              color: var(--vscode-testing-iconPassed, #73c991); }
  #filters { display: flex; gap: 6px; margin: 6px 0; align-items: center; flex-wrap: wrap; }
  #filters .chip { padding: 2px 9px; border-radius: 9px; cursor: pointer; font-size: 11px;
           border: 1px solid var(--vscode-input-border, #555); user-select: none; opacity: .45; }
  #filters .chip.on { opacity: 1; border-color: var(--vscode-focusBorder); }
  #rulesetFilter { width: auto; flex: 1; min-width: 90px; }
  #search { margin: 4px 0; }
  #list { margin: 6px 0 0; max-height: 45vh; overflow-y: auto; }
  .issue { border-left: 3px solid transparent; padding: 5px 7px; margin: 3px 0;
           cursor: pointer; border-radius: 3px;
           background: var(--vscode-list-inactiveSelectionBackground, rgba(128,128,128,.08)); }
  .issue:hover { background: var(--vscode-list-hoverBackground); }
  .issue.err { border-left-color: var(--vscode-errorForeground, #f14c4c); }
  .issue.warn { border-left-color: var(--vscode-editorWarning-foreground, #cca700); }
  .issue .head { display: flex; justify-content: space-between; gap: 6px; }
  .issue .rule { font-weight: 600; font-family: var(--vscode-editor-font-family); font-size: 12px; }
  .issue .loc { color: var(--vscode-descriptionForeground); font-size: 11px; white-space: nowrap; }
  .issue .msg { font-size: 12px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis;
                display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .issue.open .msg { display: block; -webkit-line-clamp: unset; }
  .issue .detail { display: none; margin-top: 5px; font-size: 11px;
                   color: var(--vscode-descriptionForeground);
                   border-top: 1px dashed var(--vscode-input-border, #555); padding-top: 4px; }
  .issue.open .detail { display: block; }
  #empty { color: var(--vscode-descriptionForeground); font-size: 12px; font-style: italic; }
</style>
</head>
<body>
  <h3>Actions</h3>
  <button class="action primary" data-cmd="factureValidator.validate">✓&nbsp; Valider la facture</button>
  <button class="action" data-cmd="factureValidator.annotateBt">🏷&nbsp; Annoter les balises en BT</button>
  <button class="action" data-cmd="factureValidator.removeBtComments">🧹&nbsp; Supprimer les annotations BT</button>
  <button class="action" data-cmd="factureValidator.inventory">📋&nbsp; Inventaire des termes (BT/BG/EXT)</button>

  <h3>Options de validation</h3>
  <label><input type="checkbox" id="xsd"> Structure XSD (couche 1)</label>
  <label><input type="checkbox" id="frCtc"> Règles françaises BR-FR (fr-ctc)</label>
  <label><input type="checkbox" id="peppol"> Peppol BIS 3.0 (UBL)</label>
  <label><input type="checkbox" id="cef"> Contre-contrôle EN 16931 pur (CEF)</label>
  <label><input type="checkbox" id="cplus"> Contrôles complémentaires (PRIX/MONTANT/TECH/ID)</label>
  <label>Profil BR-FR&nbsp;
    <select id="frProfile">
      <option value="strict">Strict (erreurs)</option>
      <option value="tolerant">Tolérant (avertissements)</option>
    </select>
  </label>
  <label>Langue&nbsp;
    <select id="lang">
      <option value="fr">Français</option>
      <option value="original">Texte d'origine</option>
    </select>
  </label>

  <h3>Résultats <span id="fileLabel" style="text-transform:none;font-weight:normal"></span></h3>
  <div id="summary"><span id="empty">Aucune validation lancée dans cette session.</span></div>
  <div id="filters" style="display:none">
    <span class="chip on" id="fErr">Erreurs</span>
    <span class="chip on" id="fWarn">Avertissements</span>
    <select id="rulesetFilter"><option value="">Tous les jeux</option></select>
  </div>
  <input type="text" id="search" placeholder="Filtrer (règle, texte, BT…)" style="display:none">
  <div id="list"></div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  let results = null;
  let showErr = true, showWarn = true, rulesetSel = '', query = '';

  document.querySelectorAll('button.action').forEach(b =>
    b.addEventListener('click', () => vscode.postMessage({ type: 'run', command: b.dataset.cmd })));
  document.getElementById('xsd').addEventListener('change', e =>
    vscode.postMessage({ type: 'setConfig', key: 'xsdValidation', value: e.target.checked }));
  document.getElementById('frCtc').addEventListener('change', e =>
    vscode.postMessage({ type: 'toggleRuleset', ruleset: 'fr-ctc', enabled: e.target.checked, syntaxes: ['ubl','cii'] }));
  document.getElementById('peppol').addEventListener('change', e =>
    vscode.postMessage({ type: 'toggleRuleset', ruleset: 'peppol', enabled: e.target.checked, syntaxes: ['ubl'] }));
  document.getElementById('cef').addEventListener('change', e =>
    vscode.postMessage({ type: 'toggleRuleset', ruleset: 'en16931-cef', enabled: e.target.checked, syntaxes: ['ubl','cii'] }));
  document.getElementById('cplus').addEventListener('change', e =>
    vscode.postMessage({ type: 'toggleRuleset', ruleset: 'controles-plus', enabled: e.target.checked, syntaxes: ['ubl','cii'] }));
  document.getElementById('lang').addEventListener('change', e =>
    vscode.postMessage({ type: 'setConfig', key: 'messageLanguage', value: e.target.value }));
  document.getElementById('frProfile').addEventListener('change', e =>
    vscode.postMessage({ type: 'setConfig', key: 'frSeverityProfile', value: e.target.value }));

  const chip = (id, get, set) => {
    const el = document.getElementById(id);
    el.addEventListener('click', () => { set(!get()); el.classList.toggle('on', get()); render(); });
  };
  chip('fErr', () => showErr, v => showErr = v);
  chip('fWarn', () => showWarn, v => showWarn = v);
  document.getElementById('rulesetFilter').addEventListener('change', e => { rulesetSel = e.target.value; render(); });
  document.getElementById('search').addEventListener('input', e => { query = e.target.value.toLowerCase(); render(); });

  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function render() {
    const list = document.getElementById('list');
    const summary = document.getElementById('summary');
    const filters = document.getElementById('filters');
    const search = document.getElementById('search');
    if (!results) { return; }

    const items = results.items;
    const nbErr = items.filter(i => i.severity === 'error').length;
    const nbWarn = items.length - nbErr;
    document.getElementById('fileLabel').textContent = '— ' + results.fileName + ' (' + results.syntax.toUpperCase() + ')';
    summary.innerHTML = items.length === 0
      ? '<span class="badge ok">✓ Conforme</span> aucune anomalie détectée'
      : '<span class="badge err">' + nbErr + ' erreur' + (nbErr > 1 ? 's' : '') + '</span>'
        + '<span class="badge warn">' + nbWarn + ' avert.</span>';
    filters.style.display = items.length ? 'flex' : 'none';
    search.style.display = items.length ? 'block' : 'none';

    const rs = document.getElementById('rulesetFilter');
    const sets = [...new Set(items.map(i => i.ruleset))];
    rs.innerHTML = '<option value="">Tous les jeux</option>' +
      sets.map(s => '<option' + (s === rulesetSel ? ' selected' : '') + '>' + esc(s) + '</option>').join('');

    list.innerHTML = '';
    items.forEach((it, idx) => {
      const isErr = it.severity === 'error';
      if ((isErr && !showErr) || (!isErr && !showWarn)) return;
      if (rulesetSel && it.ruleset !== rulesetSel) return;
      if (query && !(it.ruleId + ' ' + it.message + ' ' + it.ruleset).toLowerCase().includes(query)) return;

      const div = document.createElement('div');
      div.className = 'issue ' + (isErr ? 'err' : 'warn');
      div.innerHTML =
        '<div class="head"><span class="rule">' + esc(it.ruleId) + '</span>'
        + '<span class="loc">ligne ' + (it.line + 1) + '</span></div>'
        + '<div class="msg">' + esc(it.message) + '</div>'
        + '<div class="detail">Jeu de règles : ' + esc(it.ruleset)
        + ' · Gravité : ' + (isErr ? 'erreur' : 'avertissement')
        + ' · Cliquer replie le détail, le curseur est positionné ligne ' + (it.line + 1) + '.</div>';
      div.addEventListener('click', () => {
        div.classList.toggle('open');
        vscode.postMessage({ type: 'openIssue', index: idx });
      });
      list.appendChild(div);
    });
  }

  window.addEventListener('message', ev => {
    if (ev.data.type === 'state') {
      const s = ev.data.state;
      document.getElementById('xsd').checked = s.xsd;
      document.getElementById('frCtc').checked = s.frCtc;
      document.getElementById('peppol').checked = s.peppol;
      document.getElementById('cef').checked = s.cef;
      document.getElementById('cplus').checked = s.cplus;
      document.getElementById('lang').value = s.lang;
      document.getElementById('frProfile').value = s.frProfile;
    } else if (ev.data.type === 'results') {
      results = ev.data.results;
      render();
    }
  });
  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
    }
}
