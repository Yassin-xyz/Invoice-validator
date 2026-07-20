import * as fs from 'fs';
import { DetectionResult } from '../validation/types';

const UBL_NS_PREFIX = 'urn:oasis:names:specification:ubl:schema:xsd:';
const CII_NS = 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100';

/** Racines UBL pertinentes pour la facturation. */
const UBL_INVOICE_ROOTS = new Set(['Invoice', 'CreditNote', 'DebitNote', 'FreightInvoice']);

/**
 * Détecte la syntaxe d'un fichier de facture.
 * - PDF (magic bytes %PDF) => Factur-X potentiel
 * - XML racine CrossIndustryInvoice (NS UN/CEFACT) => CII
 * - XML racine Invoice/CreditNote (NS OASIS UBL)   => UBL
 */
export function detectFile(filePath: string): DetectionResult {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') {
        return { syntax: 'facturx-pdf' };
    }
    return detectXmlContent(buffer.toString('utf8'));
}

export function detectXmlContent(content: string): DetectionResult {
    // Retire BOM et prologue/commentaires pour trouver la racine.
    const withoutProlog = content
        .replace(/^\uFEFF/, '')
        .replace(/<\?[\s\S]*?\?>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '');

    const rootMatch = withoutProlog.match(/<([A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)([^>]*)>/);
    if (!rootMatch) {
        return { syntax: 'unknown' };
    }

    const localName = rootMatch[2];
    // Cherche les déclarations xmlns dans les ~4 premiers Ko (la racine peut être longue).
    const head = withoutProlog.slice(0, 4096);

    if (localName === 'CrossIndustryInvoice' || head.includes(CII_NS)) {
        return { syntax: 'cii', rootElement: localName, namespace: CII_NS };
    }

    if (UBL_INVOICE_ROOTS.has(localName) && head.includes(UBL_NS_PREFIX)) {
        return {
            syntax: 'ubl',
            rootElement: localName,
            namespace: `${UBL_NS_PREFIX}${localName}-2`,
        };
    }

    // UBL sans namespace détectable dans l'entête, ou autre document.
    if (UBL_INVOICE_ROOTS.has(localName)) {
        return { syntax: 'ubl', rootElement: localName };
    }

    return { syntax: 'unknown', rootElement: localName };
}
