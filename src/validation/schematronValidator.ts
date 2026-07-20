import * as fs from 'fs';
import * as path from 'path';
import { runSaxonTransform, findSaxonJar } from '../utils/javaRunner';
import { parseSvrl } from './svrlParser';
import { InvoiceSyntax, RulesetRun, ValidationIssue } from './types';

/** Jeux de règles embarqués, par syntaxe. */
/** Ordre d'exécution : les contrôles techniques (TECH-01) passent en premier. */
const RUN_PRIORITY: Record<string, number> = { 'controles-plus': 0 };

const BUILTIN_RULESETS: Record<'ubl' | 'cii', Record<string, string[]>> = {
    ubl: {
        // Contrôles complémentaires bi-syntaxe (TECH/PRIX/MONTANT/UNITE/ID)
        'controles-plus': [path.join('schematron', 'controles-plus', 'controles-plus.xslt')],
        // Profil EN 16931 version réforme FR (FNFE-MPE 1.4.0, norme XP Z12-012)
        en16931: [path.join('schematron', 'en16931-ubl', 'EN16931-UBL-validation.xslt')],
        peppol: [path.join('schematron', 'peppol-ubl', 'PEPPOL-EN16931-UBL.xslt')],
        // Contre-contrôle : norme européenne pure (release CEF), en complément
        // de la version FNFE ; le dédoublonnage ne garde que les écarts réels.
        'en16931-cef': [path.join('schematron', 'en16931-cef', 'EN16931-UBL-CEF.xslt')],
        // Règles de gestion françaises BR-FR-CTC (profil choisi via frSeverityProfile)
        'fr-ctc': [path.join('schematron', 'fr', 'ubl', 'BR-FR-Flux2-Schematron-UBL.xslt')],
        // Profil étendu français (remplace le profil en16931, ne pas cumuler)
        'extended-ctc-fr': [path.join('schematron', 'fr', 'ubl', 'EXTENDED-CTC-FR-UBL.xslt')],
    },
    cii: {
        'controles-plus': [path.join('schematron', 'controles-plus', 'controles-plus.xslt')],
        en16931: [path.join('schematron', 'en16931-cii', 'EN16931-CII-validation.xslt')],
        'en16931-cef': [path.join('schematron', 'en16931-cef', 'EN16931-CII-CEF.xslt')],
        'fr-ctc': [path.join('schematron', 'fr', 'cii', 'BR-FR-Flux2-Schematron-CII.xslt')],
        'extended-ctc-fr': [path.join('schematron', 'fr', 'cii', 'EXTENDED-CTC-FR-CII.xslt')],
        // Profil Factur-X EN16931 (contrôle aussi les listes de codes, via codedb)
        'facturx-en16931': [path.join('schematron', 'fr', 'facturx', 'FACTUR-X_EN16931.xslt')],
    },
};

export interface ValidatorOptions {
    extensionPath: string;
    javaPath: string;
    /** Jeux embarqués activés pour la syntaxe (ex. ['en16931','peppol']). */
    enabledBuiltins: string[];
    /** XSLT Schematron supplémentaires (ex. règles françaises compilées). */
    customXsltPaths: string[];
    /** Profil de sévérité des règles BR-FR : 'strict' (erreurs) ou 'tolerant' (avertissements). */
    frProfile?: 'strict' | 'tolerant';
    /** Tolérance d'arrondi des contrôles arithmétiques (PRIX-01, MONTANT-01). */
    arithmeticTolerance?: number;
}

/** Construit la liste des exécutions à faire pour un document donné. */
export function resolveRulesets(
    syntax: InvoiceSyntax,
    options: ValidatorOptions
): RulesetRun[] {
    const runs: RulesetRun[] = [];
    const artifactsPath = path.join(options.extensionPath, 'validation-artifacts');

    if (syntax === 'ubl' || syntax === 'cii') {
        const builtins = BUILTIN_RULESETS[syntax];
        for (const name of options.enabledBuiltins) {
            const rels = builtins[name];
            if (!rels) {
                continue;
            }
            for (let rel of rels) {
                if (name === 'fr-ctc' && options.frProfile === 'tolerant') {
                    rel = rel.replace('.xslt', '_WARNING.xslt');
                }
                const xsltPath = path.join(artifactsPath, rel);
                if (fs.existsSync(xsltPath)) {
                    const params =
                        name === 'controles-plus' && options.arithmeticTolerance !== undefined
                            ? { tolerance: String(options.arithmeticTolerance) }
                            : undefined;
                    runs.push({ ruleset: name, xsltPath, params });
                }
            }
        }
    }

    for (const custom of options.customXsltPaths) {
        if (fs.existsSync(custom)) {
            runs.push({ ruleset: `custom:${path.basename(custom)}`, xsltPath: custom });
        }
    }
    // Les jeux prioritaires (contrôles techniques) s'exécutent en premier.
    return runs.sort(
        (a, b) => (RUN_PRIORITY[a.ruleset] ?? 1) - (RUN_PRIORITY[b.ruleset] ?? 1)
    );
}

/** Valide un fichier XML contre tous les jeux de règles résolus. */
export async function validateXmlFile(
    xmlFilePath: string,
    runs: RulesetRun[],
    options: ValidatorOptions
): Promise<ValidationIssue[]> {
    const saxonJar = findSaxonJar(options.extensionPath);
    const all: ValidationIssue[] = [];

    for (const run of runs) {
        try {
            const svrl = await runSaxonTransform(
                options.javaPath,
                saxonJar,
                xmlFilePath,
                run.xsltPath,
                run.params
            );
            all.push(...parseSvrl(svrl, run.ruleset));
        } catch (err) {
            // Un jeu qui plante (ex. « null » dans un montant) ne doit pas
            // vider le rapport : on le signale et on continue.
            all.push({
                ruleId: 'MOTEUR',
                message: `Le jeu de règles « ${run.ruleset} » n'a pas pu s'exécuter — probablement une valeur non numérique dans un montant (voir TECH-01). Détail : ${err instanceof Error ? err.message.slice(0, 300) : String(err)}`,
                location: '',
                severity: 'error',
                ruleset: run.ruleset,
            });
        }
    }
    return all;
}
