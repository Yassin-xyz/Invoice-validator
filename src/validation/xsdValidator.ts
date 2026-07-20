import * as path from 'path';
import { spawn } from 'child_process';
import { InvoiceSyntax, ValidationIssue } from './types';

/** Sélectionne le schéma XSD racine selon la syntaxe et l'élément racine. */
export function pickSchema(
    extensionPath: string,
    syntax: InvoiceSyntax,
    rootElement?: string
): string | undefined {
    const xsdRoot = path.join(extensionPath, 'validation-artifacts', 'xsd');
    if (syntax === 'ubl') {
        const doc = rootElement === 'CreditNote' ? 'UBL-CreditNote-2.1.xsd' : 'UBL-Invoice-2.1.xsd';
        return path.join(xsdRoot, 'ubl-2.1', 'maindoc', doc);
    }
    if (syntax === 'cii') {
        return path.join(
            xsdRoot, 'cii-d16b', 'CII', 'uncefact', 'data', 'standard',
            'CrossIndustryInvoice_100pD16B.xsd'
        );
    }
    return undefined;
}

/** Traductions des messages Xerces les plus courants (appliquées après nettoyage des namespaces). */
const XSD_FR: Array<[RegExp, string]> = [
    [/Invalid content was found starting with element '?([\w.:-]+)'?\. One of '(.+?)' is expected\./,
        "Contenu invalide : l'élément « $1 » n'est pas attendu ici. Élément(s) attendu(s) : $2"],
    [/The content of element '([\w.:-]+)' is not complete\. One of '(.+?)' is expected\./,
        "L'élément « $1 » est incomplet. Élément(s) attendu(s) : $2"],
    [/Cannot find the declaration of element '([\w.:-]+)'\./,
        "Élément racine « $1 » inconnu du schéma."],
    [/'(.+?)' is not a valid value for '([\w.:-]+)'\./,
        "« $1 » n'est pas une valeur valide pour le type « $2 »."],
    [/Attribute '([\w.:-]+)' must appear on element '([\w.:-]+)'\./,
        "L'attribut « $1 » est obligatoire sur l'élément « $2 »."],
    [/Attribute '([\w.:-]+)' is not allowed to appear in element '([\w.:-]+)'\./,
        "L'attribut « $1 » n'est pas autorisé sur l'élément « $2 »."],
];

function frenchize(msg: string, translate: boolean): string {
    // Retire les URI de namespace et les accolades : {"urn:…":A, "urn:…":B} → A, B
    const stripped = msg.replace(/"urn:[^"]*":/g, '').replace(/[{}]/g, '');
    if (translate) {
        for (const [pattern, replacement] of XSD_FR) {
            if (pattern.test(stripped)) {
                return stripped.replace(pattern, replacement);
            }
        }
    }
    return stripped;
}

/**
 * Valide la structure du document contre le XSD (via la classe Java
 * précompilée XsdValidator, sortie compatible xmllint « fichier:ligne: … »).
 */
export function validateXsd(
    extensionPath: string,
    javaPath: string,
    schemaFile: string,
    xmlFile: string,
    translateFr: boolean
): Promise<ValidationIssue[]> {
    return new Promise((resolve, reject) => {
        const proc = spawn(javaPath, ['-cp', path.join(extensionPath, 'lib'), 'XsdValidator', schemaFile, xmlFile]);
        let stderr = '';
        proc.stderr.on('data', (d) => (stderr += d.toString()));
        proc.on('error', (err) =>
            reject(new Error(`Impossible de lancer Java pour la validation XSD : ${err.message}`))
        );
        proc.on('close', (code) => {
            if (code === 2) {
                reject(new Error(`Validation XSD impossible : ${stderr.slice(0, 500)}`));
                return;
            }
            const issues: ValidationIssue[] = [];
            for (const lineText of stderr.split('\n')) {
                const m = lineText.match(/^.*?:(\d+):.*?Schemas validity error\s*:\s*(?:cvc[\w.-]+:\s*)?(.*)$/);
                if (m) {
                    issues.push({
                        ruleId: 'XSD',
                        message: frenchize(m[2].trim(), translateFr),
                        location: '',
                        line: parseInt(m[1], 10) - 1,
                        severity: 'error',
                        ruleset: 'xsd',
                    });
                }
            }
            resolve(issues);
        });
    });
}
