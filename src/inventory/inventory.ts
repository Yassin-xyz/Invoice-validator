import { buildBindings, matchBinding, resolveBindingIds, BtEntry } from '../annotation/btAnnotator';

/**
 * Inventaire des termes métier (BT/BG) réellement présents dans une facture,
 * de manière unitaire : chaque terme apparaît une fois, avec son nombre
 * d'occurrences, la ligne de première apparition et un exemple de valeur.
 * Les éléments porteurs de données non couverts par la carte sont listés
 * à part (candidats EXT-FR / hors socle).
 */

export interface InventoryEntry {
    id: string;          // "BT-1", "BG-25", "EXT-FR-FE-163" ou chemin local
    label: string;
    bg?: string;         // groupe de rattachement (pour les BT/EXT)
    count: number;
    firstLine: number;   // 0-based
    example?: string;    // valeur de la première occurrence (éléments feuilles)
}

export interface Inventory {
    bg: InventoryEntry[];
    bt: InventoryEntry[];
    ext: InventoryEntry[];
    unmapped: InventoryEntry[];
    totalElements: number;
}

const TOKEN =
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!(?:"[^"]*"|'[^']*'|[^>])*>|<(\/)?([A-Za-z_][\w.:\-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(\/)?>/g;

function localName(tag: string): string {
    return tag.includes(':') ? tag.slice(tag.lastIndexOf(':') + 1) : tag;
}

export function buildInventory(
    xml: string,
    syntax: 'ubl' | 'cii',
    btMap: Record<string, BtEntry>
): Inventory {
    const bindings = buildBindings(btMap, syntax);
    const found = new Map<string, InventoryEntry>();
    const unmapped = new Map<string, InventoryEntry>();

    const stack: string[] = [];
    let line = 0;
    let scanned = 0;
    let totalElements = 0;

    const advanceTo = (offset: number) => {
        for (let i = scanned; i < offset; i++) {
            if (xml.charCodeAt(i) === 10) {
                line++;
            }
        }
        scanned = offset;
    };

    /** Texte immédiat après la balise ouvrante (valeur d'un élément feuille). */
    const leafValue = (afterOffset: number): string | undefined => {
        const next = xml.indexOf('<', afterOffset);
        if (next < 0) {
            return undefined;
        }
        const value = xml.slice(afterOffset, next).trim();
        return value.length > 0 ? value.slice(0, 60) : undefined;
    };

    let m: RegExpExecArray | null;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(xml)) !== null) {
        const [full, closing, name, , selfClosing] = m;
        if (!name) {
            continue;
        }
        if (closing) {
            stack.pop();
            continue;
        }
        advanceTo(m.index);
        totalElements++;
        stack.push(localName(name));

        const binding = matchBinding(stack, bindings);
        const value = selfClosing ? undefined : leafValue(m.index + full.length);

        if (binding) {
            const { ids, label } = resolveBindingIds(binding, value, btMap);
            const entry = found.get(ids);
            if (entry) {
                entry.count++;
            } else {
                const bgs = [...new Set(
                    ids.split('/').map((id) => btMap[id]?.bg).filter(Boolean)
                )];
                found.set(ids, {
                    id: ids,
                    label,
                    bg: bgs.join('/') || undefined,
                    count: 1,
                    firstLine: line,
                    example: value,
                });
            }
        } else if (value !== undefined) {
            // Élément feuille porteur de données, hors carte BT/BG.
            const key = stack.slice(-2).join('/');
            const entry = unmapped.get(key);
            if (entry) {
                entry.count++;
            } else {
                unmapped.set(key, {
                    id: key,
                    label: '',
                    count: 1,
                    firstLine: line,
                    example: value,
                });
            }
        }

        if (selfClosing) {
            stack.pop();
        }
    }

    const numOf = (id: string) => parseInt(id.match(/\d+/)?.[0] ?? '999', 10);
    const entries = [...found.values()];
    return {
        bg: entries.filter((e) => e.id.startsWith('BG')).sort((a, b) => numOf(a.id) - numOf(b.id)),
        bt: entries.filter((e) => e.id.startsWith('BT')).sort((a, b) => numOf(a.id) - numOf(b.id)),
        ext: entries.filter((e) => e.id.startsWith('EXT')).sort((a, b) => numOf(a.id) - numOf(b.id)),
        unmapped: [...unmapped.values()].sort((a, b) => b.count - a.count),
        totalElements,
    };
}
