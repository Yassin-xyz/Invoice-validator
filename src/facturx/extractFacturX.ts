import {
    PDFArray,
    PDFDict,
    PDFDocument,
    PDFHexString,
    PDFName,
    PDFRawStream,
    PDFString,
    decodePDFRawStream,
} from 'pdf-lib';

export interface ExtractedXml {
    fileName: string;
    xml: string;
}

/** Noms de fichiers connus des profils hybrides (par ordre de priorité). */
const KNOWN_NAMES = [
    'factur-x.xml',
    'zugferd-invoice.xml',
    'ZUGFeRD-invoice.xml',
    'xrechnung.xml',
    'order-x.xml',
    'cii.xml',
];

/**
 * Extrait le XML de facture embarqué dans un PDF Factur-X / ZUGFeRD.
 * Parcourt l'arbre Names/EmbeddedFiles du catalogue, avec repli sur /AF
 * (Associated Files, obligatoire en PDF/A-3 Factur-X).
 */
export async function extractFacturXXml(pdfBytes: Uint8Array): Promise<ExtractedXml | null> {
    const doc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
        updateMetadata: false,
    });

    const fileSpecs: PDFDict[] = [];

    const namesDict = doc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
    const embeddedFiles = namesDict?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict);
    collectFileSpecs(embeddedFiles, fileSpecs);

    const af = doc.catalog.lookupMaybe(PDFName.of('AF'), PDFArray);
    if (af) {
        for (let i = 0; i < af.size(); i++) {
            const spec = af.lookupMaybe(i, PDFDict);
            if (spec) {
                fileSpecs.push(spec);
            }
        }
    }

    const extracted: ExtractedXml[] = [];
    for (const spec of fileSpecs) {
        const item = readFileSpec(spec);
        if (item) {
            extracted.push(item);
        }
    }

    if (extracted.length === 0) {
        return null;
    }

    for (const known of KNOWN_NAMES) {
        const match = extracted.find((e) => e.fileName.toLowerCase() === known.toLowerCase());
        if (match) {
            return match;
        }
    }
    // Repli : premier fichier XML embarqué.
    return extracted.find((e) => e.fileName.toLowerCase().endsWith('.xml')) ?? null;
}

/** Parcours récursif d'un name tree (Kids / Names). */
function collectFileSpecs(node: PDFDict | undefined, out: PDFDict[]): void {
    if (!node) {
        return;
    }
    const kids = node.lookupMaybe(PDFName.of('Kids'), PDFArray);
    if (kids) {
        for (let i = 0; i < kids.size(); i++) {
            collectFileSpecs(kids.lookupMaybe(i, PDFDict), out);
        }
    }
    const names = node.lookupMaybe(PDFName.of('Names'), PDFArray);
    if (names) {
        // Le tableau alterne [nom, filespec, nom, filespec, ...]
        for (let i = 1; i < names.size(); i += 2) {
            const spec = names.lookupMaybe(i, PDFDict);
            if (spec) {
                out.push(spec);
            }
        }
    }
}

function readFileSpec(spec: PDFDict): ExtractedXml | null {
    const nameObj =
        spec.lookup(PDFName.of('UF')) ?? spec.lookup(PDFName.of('F'));
    let fileName = '';
    if (nameObj instanceof PDFString || nameObj instanceof PDFHexString) {
        fileName = nameObj.decodeText();
    }

    const ef = spec.lookupMaybe(PDFName.of('EF'), PDFDict);
    if (!ef) {
        return null;
    }
    const streamObj = ef.lookup(PDFName.of('F')) ?? ef.lookup(PDFName.of('UF'));
    if (!(streamObj instanceof PDFRawStream)) {
        return null;
    }

    try {
        const bytes = decodePDFRawStream(streamObj).decode();
        const xml = Buffer.from(bytes).toString('utf8');
        return { fileName: fileName || 'embedded.xml', xml };
    } catch {
        return null;
    }
}
