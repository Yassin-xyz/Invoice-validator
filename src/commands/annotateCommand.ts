import * as vscode from 'vscode';
import { annotateBt, removeBtComments, loadBtMap } from '../annotation/btAnnotator';
import { detectXmlContent } from '../detection/formatDetector';

async function getActiveXmlEditor(uri?: vscode.Uri): Promise<vscode.TextEditor | undefined> {
    if (uri) {
        const doc = await vscode.workspace.openTextDocument(uri);
        return vscode.window.showTextDocument(doc, { preview: false });
    }
    return vscode.window.activeTextEditor;
}

/** Remplace tout le contenu de l'éditeur (annulable avec Ctrl+Z). */
async function replaceAll(editor: vscode.TextEditor, newText: string): Promise<void> {
    const doc = editor.document;
    const full = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
    await editor.edit((edit) => edit.replace(full, newText));
}

export async function annotateBtCommand(
    uri: vscode.Uri | undefined,
    context: vscode.ExtensionContext
): Promise<void> {
    const editor = await getActiveXmlEditor(uri);
    if (!editor) {
        vscode.window.showWarningMessage('Ouvrez une facture XML à annoter.');
        return;
    }
    const xml = editor.document.getText();
    const detection = detectXmlContent(xml);
    if (detection.syntax !== 'ubl' && detection.syntax !== 'cii') {
        vscode.window.showErrorMessage(
            'Annotation BT : le document doit être une facture UBL ou CII. Pour un Factur-X, validez d\'abord le PDF puis annotez le XML extrait.'
        );
        return;
    }
    const { annotated, count } = annotateBt(xml, detection.syntax, loadBtMap(context.extensionPath));
    await replaceAll(editor, annotated);
    vscode.window.showInformationMessage(
        `${count} balise(s) annotée(s) en termes métier (BT). Les annotations <!--@BT …--> se retirent via « Facture: Supprimer les annotations BT » (ou Ctrl+Z).`
    );
}

export async function removeBtCommand(uri: vscode.Uri | undefined): Promise<void> {
    const editor = await getActiveXmlEditor(uri);
    if (!editor) {
        vscode.window.showWarningMessage('Ouvrez la facture XML à nettoyer.');
        return;
    }
    const xml = editor.document.getText();
    const cleaned = removeBtComments(xml);
    if (cleaned === xml) {
        vscode.window.showInformationMessage('Aucune annotation @BT trouvée : rien à supprimer.');
        return;
    }
    await replaceAll(editor, cleaned);
    vscode.window.showInformationMessage(
        'Annotations BT supprimées. Les commentaires d\'origine du document sont préservés.'
    );
}
