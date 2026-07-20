import { Severity, ValidationIssue } from './types';

/**
 * Parse un rapport SVRL (Schematron Validation Report Language) et
 * en extrait les failed-assert / successful-report.
 *
 * Un parsing par expressions régulières suffit ici : le SVRL est généré
 * par Saxon avec une structure très régulière.
 */
export function parseSvrl(svrl: string, ruleset: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const pattern =
        /<svrl:(failed-assert|successful-report)\b([^>]*)>([\s\S]*?)<\/svrl:\1>/g;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(svrl)) !== null) {
        const attrs = match[2];
        const inner = match[3];

        const ruleId = readAttr(attrs, 'id') ?? 'schematron';
        const location = readAttr(attrs, 'location') ?? '';
        const flag = (readAttr(attrs, 'flag') ?? '').toLowerCase();

        const textMatch = inner.match(/<svrl:text[^>]*>([\s\S]*?)<\/svrl:text>/);
        const message = decodeEntities(
            (textMatch ? textMatch[1] : inner).replace(/<[^>]+>/g, '').trim()
        );

        issues.push({
            ruleId,
            message,
            location: decodeEntities(location),
            severity: severityFromFlag(flag, match[1]),
            ruleset,
        });
    }
    return issues;
}

function readAttr(attrs: string, name: string): string | undefined {
    const m = attrs.match(new RegExp(`${name}="([^"]*)"`));
    return m ? m[1] : undefined;
}

function severityFromFlag(flag: string, elementName: string): Severity {
    if (flag === 'warning' || flag === 'warn') {
        return 'warning';
    }
    if (flag === 'info' || flag === 'information') {
        return 'info';
    }
    // Les successful-report sont le plus souvent informatifs sauf flag contraire.
    if (elementName === 'successful-report' && flag === '') {
        return 'warning';
    }
    return 'error';
}

function decodeEntities(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&amp;/g, '&');
}
