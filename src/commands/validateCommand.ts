import * as vscode from 'vscode';
import * as fs from 'fs';
import { detectFile, detectXmlContent } from '../detection/formatDetector';
import { extractFacturXXml } from '../facturx/extractFacturX';
import {
    resolveRulesets,
    validateXmlFile,
    ValidatorOptions,
} from '../validation/schematronValidator';
import { toDiagnostics } from '../validation/diagnostics';
import { InvoiceSyntax } from '../validation/types';
import { writeTempFile } from '../utils/tempFile';
import { applyTranslations, MessageLanguage } from '../i18n/translator';
import { pickSchema, validateXsd } from '../validation/xsdValidator';
import { FacturePanelProvider, PanelIssue } from '../ui/panelView';

export async function validateInvoice(
    uri: vscode.Uri | undefined,
    context: vscode.ExtensionContext,
    diagnostics: vscode.DiagnosticCollection,
    panel?: FacturePanelProvider
): Promise<void> {
    const target = uri ?? vscode.window.activeTextEditor?.document.uri;
    if (!target) {
        vscode.window.showWarningMessage('Aucun fichier à valider.');
        return;
    }

    const config = vscode.workspace.getConfiguration('factureValidator');
    const filePath = target.fsPath;

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Validation Schematron de la facture…',
        },
        async () => {
            try {
                const detection = detectFile(filePath);
                let syntax: InvoiceSyntax = detection.syntax;
                let xmlPath = filePath;
                let xmlText: string | undefined;
                let cleanup: (() => void) | undefined;
                let facturxNote = '';

                if (syntax === 'facturx-pdf') {
                    const extracted = await extractFacturXXml(fs.readFileSync(filePath));
                    if (!extracted) {
                        vscode.window.showErrorMessage(
                            'Aucun XML embarqué trouvé dans ce PDF : ce n\'est probablement pas un Factur-X.'
                        );
                        return;
                    }
                    const inner = detectXmlContent(extracted.xml);
                    syntax = inner.syntax === 'unknown' ? 'cii' : inner.syntax;
                    const tmp = writeTempFile(extracted.xml, '.xml');
                    xmlPath = tmp.filePath;
                    xmlText = extracted.xml;
                    cleanup = tmp.cleanup;
                    facturxNote = ` (XML « ${extracted.fileName} » extrait du PDF, syntaxe ${syntax.toUpperCase()})`;
                } else if (syntax === 'unknown') {
                    vscode.window.showErrorMessage(
                        `Format non reconnu (racine « ${detection.rootElement ?? '?'} »). Formats pris en charge : UBL Invoice/CreditNote, CII CrossIndustryInvoice, PDF Factur-X.`
                    );
                    return;
                } else {
                    xmlText = fs.readFileSync(filePath, 'utf8');
                }

                const options: ValidatorOptions = {
                    extensionPath: context.extensionPath,
                    javaPath: config.get<string>('javaPath', 'java'),
                    enabledBuiltins: config.get<string[]>(
                        `rulesets.${syntax}`,
                        syntax === 'ubl' ? ['en16931'] : ['en16931']
                    ),
                    customXsltPaths: config.get<string[]>('customSchematronXslt', []),
                    frProfile: config.get<'strict' | 'tolerant'>('frSeverityProfile', 'strict'),
                    arithmeticTolerance: config.get<number>('arithmeticTolerance', 0.0001),
                };

                const runs = resolveRulesets(syntax, options);
                if (runs.length === 0) {
                    vscode.window.showWarningMessage(
                        `Aucun jeu de règles actif pour la syntaxe ${syntax.toUpperCase()}. Vérifiez les paramètres factureValidator.*`
                    );
                    return;
                }

                let issues: import('../validation/types').ValidationIssue[] = [];
                const xsdEnabled = config.get<boolean>('xsdValidation', true);
                if (xsdEnabled && (syntax === 'ubl' || syntax === 'cii')) {
                    const schema = pickSchema(context.extensionPath, syntax, detection.rootElement);
                    if (schema) {
                        const lang = config.get<string>('messageLanguage', 'fr');
                        issues.push(
                            ...(await validateXsd(context.extensionPath, options.javaPath, schema, xmlPath, lang === 'fr'))
                        );
                    }
                }
                issues.push(...(await validateXmlFile(xmlPath, runs, options)));

                // Non-duplication avec Peppol : si l'équivalent standard a tiré
                // au même endroit, le contrôle complémentaire s'efface.
                const PEPPOL_EQUIV: Record<string, string> = {
                    'PRIX-01': 'PEPPOL-EN16931-R046',
                    'PRIX-03': 'PEPPOL-EN16931-R121',
                };
                issues = issues.filter((it) => {
                    const equiv = PEPPOL_EQUIV[it.ruleId];
                    return !equiv || !issues.some(
                        (other) => other.ruleId === equiv && other.location === it.location
                    );
                });

                // Filet anti-doublons : même règle au même endroit -> une seule
                // occurrence, en conservant la sévérité la plus forte.
                const rank = { error: 0, warning: 1, info: 2 } as const;
                const seen = new Map<string, number>();
                issues = issues.filter((it, idx) => {
                    const key = `${it.ruleId}|${it.location}|${it.line ?? ''}`;
                    const prev = seen.get(key);
                    if (prev === undefined) {
                        seen.set(key, idx);
                        return true;
                    }
                    if (rank[it.severity] < rank[issues[prev].severity]) {
                        issues[prev].severity = it.severity;
                    }
                    return false;
                });
                cleanup?.();

                const language = config.get<MessageLanguage>('messageLanguage', 'fr');
                issues = applyTranslations(issues, context.extensionPath, language);

                const effectiveSyntax = syntax === 'ubl' ? 'ubl' : 'cii';
                let diagTarget = target;
                if (detection.syntax === 'facturx-pdf' && xmlText) {
                    // On ne peut pas pointer dans un PDF : on ouvre le XML extrait
                    // dans l'éditeur et on y attache les diagnostics.
                    const doc = await vscode.workspace.openTextDocument({
                        content: xmlText,
                        language: 'xml',
                    });
                    await vscode.window.showTextDocument(doc, { preview: false });
                    diagTarget = doc.uri;
                }
                const diags = toDiagnostics(issues, xmlText, effectiveSyntax, context.extensionPath);
                diagnostics.set(diagTarget, diags);

                // Publication vers le panneau latéral (liste cliquable).
                const panelItems: PanelIssue[] = diags.map((d, i) => ({
                    ruleId: issues[i].ruleId,
                    message: d.message,
                    severity: issues[i].severity,
                    ruleset: issues[i].ruleset,
                    line: d.range.start.line,
                    col: d.range.start.character,
                    endCol: d.range.end.character,
                }));
                panel?.setResults({
                    uri: diagTarget.toString(),
                    fileName: diagTarget.path.split('/').pop() ?? diagTarget.toString(),
                    syntax: effectiveSyntax,
                    when: new Date().toISOString(),
                    items: panelItems,
                });

                const errors = issues.filter((i) => i.severity === 'error').length;
                const warnings = issues.filter((i) => i.severity !== 'error').length;
                const rulesetNames = runs.map((r) => r.ruleset).join(', ');

                if (issues.length === 0) {
                    vscode.window.showInformationMessage(
                        `✔ Facture conforme aux règles [${rulesetNames}]${facturxNote}.`
                    );
                } else {
                    vscode.window.showWarningMessage(
                        `Validation [${rulesetNames}]${facturxNote} : ${errors} erreur(s), ${warnings} avertissement(s). Voir l'onglet Problèmes.`
                    );
                }
            } catch (err) {
                vscode.window.showErrorMessage(
                    `Échec de la validation : ${err instanceof Error ? err.message : String(err)}`
                );
            }
        }
    );
}
