import * as fs from 'fs';
import * as path from 'path';

/**
 * Détection des cas d'usage (onglet « Cas d'usage » des spécifications
 * externes) : chaque cas est signalé par des données dépendantes. Les
 * marqueurs distinctifs (EXT-FR / BT-X, absents d'une facture simple)
 * fondent la détection ; les BT courants ne servent qu'à l'appui.
 */

export interface UseCase {
    id: number;
    titre: string;
    termes: string[];
    note: string;
}

export interface UseCaseMatch {
    useCase: UseCase;
    matched: string[];        // marqueurs distinctifs présents
    missing: string[];        // marqueurs distinctifs absents
    supporting: string[];     // BT courants du cas également présents
    confidence: number;       // matched / (matched + missing)
}

const DISTINCTIVE = /^(EXT-FR|BT-X-)/;

/** Base d'un identifiant (sans suffixe de variante) : BT-21-PMT → BT-21. */
function baseOf(id: string): string {
    const m = id.match(/^((?:EXT-FR-FE(?:-BG)?|BT-X|BT|BG)-\d+)/);
    return m ? m[1] : id;
}

export function loadUseCases(extensionPath: string): UseCase[] {
    try {
        return JSON.parse(
            fs.readFileSync(
                path.join(extensionPath, 'validation-artifacts', 'i18n', 'use-cases.json'),
                'utf8'
            )
        );
    } catch {
        return [];
    }
}

function toSet(ids: string[]): Set<string> {
    const set = new Set<string>();
    for (const raw of ids) {
        for (const id of raw.split('/')) {
            const clean = id.replace(/ \+\d+$/, '').trim();
            set.add(clean);
            set.add(baseOf(clean));
        }
    }
    return set;
}

/**
 * @param strongIds identifiants EXT détectés en propre (section EXT de
 *        l'inventaire) : seules preuves recevables. Un EXT fusionné avec
 *        un BT standard sur la même balise n'est pas probant.
 * @param allIds tous les identifiants présents (termes d'appui).
 */
export function detectUseCases(
    strongIds: string[],
    allIds: string[],
    useCases: UseCase[]
): UseCaseMatch[] {
    const strong = toSet(strongIds);
    const present = toSet(allIds);
    const hasStrong = (term: string) => strong.has(term) || strong.has(baseOf(term));
    const has = (term: string) => present.has(term) || present.has(baseOf(term));

    const matches: UseCaseMatch[] = [];
    for (const uc of useCases) {
        const distinct = uc.termes.filter((t) => DISTINCTIVE.test(t));
        if (distinct.length === 0) {
            continue; // non détectable structurellement
        }
        const matched = distinct.filter(hasStrong);
        if (matched.length === 0) {
            continue;
        }
        const supporting = uc.termes.filter((t) => !DISTINCTIVE.test(t) && has(t));
        matches.push({
            useCase: uc,
            matched,
            missing: distinct.filter((t) => !has(t)),
            supporting,
            confidence: matched.length / distinct.length,
        });
    }
    return matches.sort(
        (a, b) => b.confidence - a.confidence || b.matched.length - a.matched.length
    );
}
