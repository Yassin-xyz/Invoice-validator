export type InvoiceSyntax = 'ubl' | 'cii' | 'facturx-pdf' | 'unknown';

export interface DetectionResult {
    syntax: InvoiceSyntax;
    /** Élément racine détecté (Invoice, CreditNote, CrossIndustryInvoice…) */
    rootElement?: string;
    namespace?: string;
}

export type Severity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
    /** Identifiant de la règle (ex. BR-CO-17, BR-FR-01) */
    ruleId: string;
    message: string;
    /** XPath fourni par le rapport SVRL */
    location: string;
    severity: Severity;
    /** Ligne 0-based quand connue directement (validation XSD) */
    line?: number;
    /** Nom du jeu de règles (en16931, peppol, fr-custom…) */
    ruleset: string;
}

export interface RulesetRun {
    ruleset: string;
    xsltPath: string;
    /** Paramètres XSLT passés à Saxon (ex. tolerance=0.0001). */
    params?: Record<string, string>;
}
