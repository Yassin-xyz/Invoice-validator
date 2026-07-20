import * as fs from 'fs';
import * as path from 'path';
import { ValidationIssue } from '../validation/types';

export type MessageLanguage = 'fr' | 'original';

let catalog: Record<string, string> | null = null;

function loadCatalog(extensionPath: string): Record<string, string> {
    if (!catalog) {
        const file = path.join(extensionPath, 'validation-artifacts', 'i18n', 'fr.json');
        try {
            catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
            catalog = {};
        }
    }
    return catalog!;
}

/** Retire le préfixe « [BR-XX]- » redondant du message d'origine. */
function stripIdPrefix(message: string): string {
    return message.replace(/^\[[^\]]+\]\s*-?\s*/, '').trim();
}

/**
 * Traduit les messages de validation en français à partir du catalogue
 * embarqué (règles EN 16931 et syntaxiques). Les règles déjà en français
 * (BR-FR du FNFE) et les règles sans traduction restent inchangées.
 */
export function applyTranslations(
    issues: ValidationIssue[],
    extensionPath: string,
    language: MessageLanguage
): ValidationIssue[] {
    if (language === 'original') {
        return issues;
    }
    const cat = loadCatalog(extensionPath);
    return issues.map((issue) => {
        const translated = cat[issue.ruleId];
        return translated
            ? { ...issue, message: translated }
            : { ...issue, message: stripIdPrefix(issue.message) };
    });
}
