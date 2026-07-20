import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/** Localise le jar Saxon-HE embarqué dans lib/. */
export function findSaxonJar(extensionPath: string): string {
    const libDir = path.join(extensionPath, 'lib');
    const jar = fs
        .readdirSync(libDir)
        .find((f) => f.toLowerCase().startsWith('saxon') && f.endsWith('.jar'));
    if (!jar) {
        throw new Error(
            `Saxon-HE introuvable dans ${libDir}. Exécutez scripts/download-artifacts.sh.`
        );
    }
    return path.join(libDir, jar);
}

/**
 * Applique une feuille XSLT à un fichier source via Saxon-HE et
 * retourne la sortie (le rapport SVRL pour un Schematron compilé).
 */
export function runSaxonTransform(
    javaPath: string,
    saxonJar: string,
    sourceFile: string,
    xsltFile: string,
    params?: Record<string, string>
): Promise<string> {
    return new Promise((resolve, reject) => {
        const args = ['-jar', saxonJar, `-s:${sourceFile}`, `-xsl:${xsltFile}`];
        for (const [key, value] of Object.entries(params ?? {})) {
            args.push(`?${key}=${value}`); // ?name= : valeur évaluée en XPath (type décimal)
        }
        const proc = spawn(javaPath, args);

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => (stdout += d.toString()));
        proc.stderr.on('data', (d) => (stderr += d.toString()));

        proc.on('error', (err) => {
            reject(
                new Error(
                    `Impossible de lancer Java (« ${javaPath} »). Java 11+ est requis. Détail : ${err.message}`
                )
            );
        });
        proc.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`Saxon a échoué (code ${code}) : ${stderr.slice(0, 2000)}`));
            }
        });
    });
}
