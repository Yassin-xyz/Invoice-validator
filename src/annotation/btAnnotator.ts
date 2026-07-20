import * as fs from 'fs';
import * as path from 'path';

/**
 * Annotation d'une facture XML : insère devant chaque balise correspondant
 * à un terme métier EN 16931 un commentaire « <!--@BT BT-x : libellé--> ».
 * Le marqueur @BT garantit une suppression ciblée (les commentaires
 * d'origine du document ne sont jamais touchés).
 */

export interface BtEntry {
    label: string;
    ubl: string;
    cii: string;
    bg?: string;
}

const MARKER_START = '<!--@BT ';
const MARKER_REGEX = /<!--@BT [\s\S]*?-->/g;

/** Noms locaux trop génériques pour un appariement sur un seul segment. */
const GENERIC_NAMES = new Set([
    'ID', 'Name', 'Amount', 'Value', 'Description', 'Note', 'CompanyID',
    'IssueDate', 'Percent', 'IdentificationCode', 'Content', 'TypeCode',
]);

const TOKEN =
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!(?:"[^"]*"|'[^']*'|[^>])*>|<(\/)?([A-Za-z_][\w.:\-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(\/)?>/g;

export interface Binding {
    btIds: string[];
    labels: string[];
    segments: string[]; // noms locaux, de haut en bas
    attribute?: string; // si le BT vise un attribut
}

function localName(tag: string): string {
    return tag.includes(':') ? tag.slice(tag.lastIndexOf(':') + 1) : tag;
}

/** Prépare (et fusionne) les correspondances chemin → BT pour une syntaxe. */
export function buildBindings(btMap: Record<string, BtEntry>, syntax: 'ubl' | 'cii'): Binding[] {
    const byKey = new Map<string, Binding>();
    for (const [btId, entry] of Object.entries(btMap)) {
        const raw = entry[syntax];
        if (!raw) {
            continue;
        }
        let attribute: string | undefined;
        const parts = raw.split('/').filter((p) => {
            if (p.startsWith('@')) {
                attribute = p.slice(1);
                return false;
            }
            return true;
        });
        const segments = parts.map(localName);
        const key = segments.join('/');
        const existing = byKey.get(key);
        if (existing) {
            if (!existing.btIds.includes(btId)) {
                existing.btIds.push(btId);
                existing.labels.push(entry.label);
            }
        } else {
            byKey.set(key, { btIds: [btId], labels: [entry.label], segments, attribute });
        }
    }
    return [...byKey.values()];
}

export function matchBinding(pathSegments: string[], bindings: Binding[]): Binding | undefined {
    let best: Binding | undefined;
    let bestLen = 0;
    for (const b of bindings) {
        const n = b.segments.length;
        if (n > pathSegments.length || n <= bestLen) {
            continue;
        }
        let ok = true;
        for (let i = 0; i < n; i++) {
            if (pathSegments[pathSegments.length - n + i] !== b.segments[i]) {
                ok = false;
                break;
            }
        }
        if (!ok) {
            continue;
        }
        // Garde-fou : un segment unique trop générique ne s'apparie
        // qu'en enfant direct de la racine.
        if (n === 1 && GENERIC_NAMES.has(b.segments[0]) && pathSegments.length !== 2) {
            continue;
        }
        best = b;
        bestLen = n;
    }
    return best;
}


/**
 * Résout l'affichage d'un binding fusionné.
 * Le dictionnaire officiel décline certains termes par valeur de code
 * (BT-21-REG, BT-21-PMT…) sur une même balise : si la valeur de l'élément
 * correspond au suffixe d'une variante, seule celle-ci est retenue.
 * À défaut, les variantes d'une même base sont regroupées, et l'affichage
 * est borné (3 identifiants, 90 caractères de libellé).
 */
export function resolveBindingIds(
    binding: Binding,
    value: string | undefined,
    btMap: Record<string, BtEntry>
): { ids: string; label: string } {
    let pairs = binding.btIds.map((id, i) => ({ id, label: binding.labels[i] ?? '' }));

    if (pairs.length > 1 && value) {
        const v = value.trim().toUpperCase();
        const matched = pairs.filter((p) => p.id.toUpperCase().endsWith('-' + v));
        if (matched.length > 0) {
            pairs = matched;
        }
    }

    if (pairs.length > 3) {
        const bases = [...new Set(pairs.map((p) => p.id.replace(/-[A-Z0-9]{2,4}$/i, '')))];
        if (bases.length <= 2) {
            const label =
                bases.map((b) => btMap[b]?.label).filter(Boolean).join(' ou ') ||
                `${pairs.length} variantes selon la valeur du code`;
            return { ids: bases.join('/'), label: truncate(label) };
        }
        return {
            ids: `${pairs[0].id}/${pairs[1].id} +${pairs.length - 2}`,
            label: truncate([...new Set(pairs.slice(0, 2).map((p) => p.label))].join(' ou ')),
        };
    }

    return {
        ids: pairs.map((p) => p.id).join('/'),
        label: truncate([...new Set(pairs.map((p) => p.label))].join(' ou ')),
    };
}

function truncate(s: string): string {
    return s.length > 90 ? s.slice(0, 89).trimEnd() + '…' : s;
}

/** Valeur textuelle immédiate après une balise ouvrante (élément feuille). */
export function leafValueAt(xml: string, afterOffset: number): string | undefined {
    const next = xml.indexOf('<', afterOffset);
    if (next < 0) {
        return undefined;
    }
    const value = xml.slice(afterOffset, next).trim();
    return value.length > 0 ? value.slice(0, 60) : undefined;
}

export function loadBtMap(extensionPath: string): Record<string, BtEntry> {
    return JSON.parse(
        fs.readFileSync(
            path.join(extensionPath, 'validation-artifacts', 'i18n', 'bt-map.json'),
            'utf8'
        )
    );
}

/** Retire toutes les annotations @BT (et uniquement elles). */
export function removeBtComments(xml: string): string {
    return xml.replace(MARKER_REGEX, '');
}

/**
 * Insère les annotations BT. Idempotent : les annotations existantes
 * sont d'abord retirées puis regénérées.
 */
export function annotateBt(
    xml: string,
    syntax: 'ubl' | 'cii',
    btMap: Record<string, BtEntry>
): { annotated: string; count: number } {
    const clean = removeBtComments(xml);
    const bindings = buildBindings(btMap, syntax);

    const insertions: Array<{ offset: number; text: string }> = [];
    const stack: string[] = [];

    let m: RegExpExecArray | null;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(clean)) !== null) {
        const [, closing, name, , selfClosing] = m;
        if (!name) {
            continue;
        }
        if (closing) {
            stack.pop();
            continue;
        }
        stack.push(localName(name));
        const binding = matchBinding(stack, bindings);
        if (binding) {
            const value = selfClosing ? undefined : leafValueAt(clean, m.index + m[0].length);
            const { ids, label } = resolveBindingIds(binding, value, btMap);
            const attr = binding.attribute ? ` (attribut ${binding.attribute})` : '';
            insertions.push({
                offset: m.index,
                text: `${MARKER_START}${ids} : ${label}${attr}-->`,
            });
        }
        if (selfClosing) {
            stack.pop();
        }
    }

    // Insertion de la fin vers le début pour préserver les offsets.
    let out = clean;
    for (let i = insertions.length - 1; i >= 0; i--) {
        out = out.slice(0, insertions[i].offset) + insertions[i].text + out.slice(insertions[i].offset);
    }
    return { annotated: out, count: insertions.length };
}
