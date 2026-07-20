import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ValidationIssue } from './types';
import { buildPositionIndex, resolveSvrlLocation } from './xmlLocator';

interface BtEntry {
    label: string;
    ubl: string;
    cii: string;
}

let btMap: Record<string, BtEntry> | null = null;

function loadBtMap(extensionPath: string): Record<string, BtEntry> {
    if (!btMap) {
        try {
            btMap = JSON.parse(
                fs.readFileSync(
                    path.join(extensionPath, 'validation-artifacts', 'i18n', 'bt-map.json'),
                    'utf8'
                )
            );
        } catch {
            btMap = {};
        }
    }
    return btMap!;
}

/**
 * Convertit les issues en diagnostics VS Code :
 * - localisation exacte via l'index positionnel + XPath du SVRL ;
 * - message enrichi de la balise correspondant au premier BT cité
 *   (précieux quand l'élément est absent du document).
 */
export function toDiagnostics(
    issues: ValidationIssue[],
    documentText: string | undefined,
    syntax: 'ubl' | 'cii',
    extensionPath: string
): vscode.Diagnostic[] {
    const index = documentText ? buildPositionIndex(documentText) : undefined;
    const bts = loadBtMap(extensionPath);

    return issues.map((issue) => {
        let range = new vscode.Range(0, 0, 0, 1);
        if (issue.line !== undefined) {
            const lineText = documentText?.split('\n')[issue.line] ?? '';
            const col = Math.max(lineText.search(/\S/), 0);
            range = new vscode.Range(issue.line, col, issue.line, Math.max(lineText.length, col + 1));
        } else if (index) {
            const pos = resolveSvrlLocation(issue.location, index);
            if (pos) {
                range = new vscode.Range(
                    pos.line,
                    pos.column,
                    pos.line,
                    pos.column + pos.length
                );
            }
        }

        let message = `[${issue.ruleId}] ${issue.message}`;
        const btRef = `${issue.ruleId} ${issue.message}`.match(/B[TG]-\d+/);
        const entry = btRef ? bts[btRef[0]] : undefined;
        if (entry) {
            message += `\n→ ${btRef![0]} (${entry.label}) : balise ${entry[syntax]}`;
        }

        const diagnostic = new vscode.Diagnostic(range, message, severity(issue));
        diagnostic.source = `schematron/${issue.ruleset}`;
        diagnostic.code = issue.ruleId;
        return diagnostic;
    });
}

function severity(issue: ValidationIssue): vscode.DiagnosticSeverity {
    switch (issue.severity) {
        case 'warning':
            return vscode.DiagnosticSeverity.Warning;
        case 'info':
            return vscode.DiagnosticSeverity.Information;
        default:
            return vscode.DiagnosticSeverity.Error;
    }
}
