/**
 * Index positionnel d'un document XML : associe chaque élément
 * (chemin canonique « Nom[i]/Nom[j]/… » en noms locaux, index 1-based
 * par nom local entre frères) à sa position (ligne/colonne) dans le texte.
 *
 * Permet de résoudre les XPath des rapports SVRL, de la forme :
 *   /*:Invoice[namespace-uri()='…'][1]/*:AccountingSupplierParty[…][1]/…
 * ou /rsm:CrossIndustryInvoice[1]/ram:…[1]
 */

export interface XmlPosition {
    line: number;      // 0-based
    column: number;    // 0-based
    length: number;    // longueur à surligner (nom de balise + '<')
}

const TOKEN =
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!(?:"[^"]*"|'[^']*'|[^>])*>|<(\/)?([A-Za-z_][\w.:\-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(\/)?>/g;

export function buildPositionIndex(xml: string): Map<string, XmlPosition> {
    const index = new Map<string, XmlPosition>();
    const stack: Array<{ path: string; counters: Map<string, number> }> = [
        { path: '', counters: new Map() },
    ];

    let line = 0;
    let lineStart = 0;
    let scanned = 0;

    const advanceTo = (offset: number) => {
        for (let i = scanned; i < offset; i++) {
            if (xml.charCodeAt(i) === 10 /* \n */) {
                line++;
                lineStart = i + 1;
            }
        }
        scanned = offset;
    };

    let m: RegExpExecArray | null;
    while ((m = TOKEN.exec(xml)) !== null) {
        const [, closing, name, , selfClosing] = m;
        if (!name) {
            continue; // commentaire, CDATA, PI, DOCTYPE
        }
        advanceTo(m.index);

        if (closing) {
            if (stack.length > 1) {
                stack.pop();
            }
            continue;
        }

        const local = name.includes(':') ? name.slice(name.lastIndexOf(':') + 1) : name;
        const parent = stack[stack.length - 1];
        const count = (parent.counters.get(local) ?? 0) + 1;
        parent.counters.set(local, count);

        const path = parent.path ? `${parent.path}/${local}[${count}]` : `${local}[${count}]`;
        if (!index.has(path)) {
            index.set(path, {
                line,
                column: m.index - lineStart,
                length: name.length + 1,
            });
        }

        if (!selfClosing) {
            stack.push({ path, counters: new Map() });
        }
    }
    return index;
}

/**
 * Normalise un XPath SVRL en chemin canonique « Nom[i]/… ».
 * Gère les formes *:Nom[namespace-uri()='…'][2], prefix:Nom[1], Nom.
 * Les segments d'attribut (@xxx) sont ignorés (on pointe l'élément porteur).
 */
export function svrlLocationToKey(location: string): string | null {
    if (!location) {
        return null;
    }
    const segments: string[] = [];
    // Découpe sur '/' hors crochets
    const raw = location.split(/\/(?![^\[]*\])/).filter((s) => s.length > 0);
    for (const seg of raw) {
        if (seg.startsWith('@')) {
            continue;
        }
        const nameMatch = seg.match(/^(?:\*:)?(?:[\w.\-]+:)?([\w.\-]+)/);
        if (!nameMatch) {
            return null;
        }
        const local = nameMatch[1];
        // Dernier prédicat numérique = index de position
        const idxMatches = seg.match(/\[(\d+)\]/g);
        const idx = idxMatches ? idxMatches[idxMatches.length - 1].slice(1, -1) : '1';
        segments.push(`${local}[${idx}]`);
    }
    return segments.length > 0 ? segments.join('/') : null;
}

/** Résout un XPath SVRL en position ; remonte au parent si le nœud exact est introuvable. */
export function resolveSvrlLocation(
    location: string,
    index: Map<string, XmlPosition>
): XmlPosition | undefined {
    let key = svrlLocationToKey(location);
    while (key) {
        const pos = index.get(key);
        if (pos) {
            return pos;
        }
        const cut = key.lastIndexOf('/');
        key = cut > 0 ? key.slice(0, cut) : null;
    }
    return undefined;
}
