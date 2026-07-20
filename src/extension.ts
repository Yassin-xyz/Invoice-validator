import * as vscode from 'vscode';
import { validateInvoice } from './commands/validateCommand';
import { annotateBtCommand, removeBtCommand } from './commands/annotateCommand';
import { FacturePanelProvider } from './ui/panelView';
import { inventoryCommand } from './commands/inventoryCommand';
import { detectXmlContent } from './detection/formatDetector';

export function activate(context: vscode.ExtensionContext): void {
    const diagnostics = vscode.languages.createDiagnosticCollection('facture-schematron');
    context.subscriptions.push(diagnostics);

    const panel = new FacturePanelProvider(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('factureValidator.validate', (uri?: vscode.Uri) =>
            validateInvoice(uri, context, diagnostics, panel)
        ),
        vscode.commands.registerCommand('factureValidator.clearDiagnostics', () =>
            diagnostics.clear()
        ),
        vscode.commands.registerCommand('factureValidator.annotateBt', (uri?: vscode.Uri) =>
            annotateBtCommand(uri, context)
        ),
        vscode.commands.registerCommand('factureValidator.removeBtComments', (uri?: vscode.Uri) =>
            removeBtCommand(uri)
        ),
        vscode.commands.registerCommand('factureValidator.inventory', (uri?: vscode.Uri) =>
            inventoryCommand(uri, context)
        )
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            FacturePanelProvider.viewType,
            panel
        )
    );

    // Validation à l'enregistrement (optionnelle).
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
            const enabled = vscode.workspace
                .getConfiguration('factureValidator')
                .get<boolean>('validateOnSave', false);
            if (!enabled || doc.languageId !== 'xml') {
                return;
            }
            const detection = detectXmlContent(doc.getText());
            if (detection.syntax === 'ubl' || detection.syntax === 'cii') {
                void validateInvoice(doc.uri, context, diagnostics, panel);
            }
        })
    );
}

export function deactivate(): void {
    /* rien à libérer */
}
