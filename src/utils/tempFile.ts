import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

export interface TempFile {
    filePath: string;
    cleanup: () => void;
}

export function writeTempFile(content: string, extension: string): TempFile {
    const name = `facture-validator-${crypto.randomBytes(8).toString('hex')}${extension}`;
    const filePath = path.join(os.tmpdir(), name);
    fs.writeFileSync(filePath, content, 'utf8');
    return {
        filePath,
        cleanup: () => {
            try {
                fs.unlinkSync(filePath);
            } catch {
                /* ignore */
            }
        },
    };
}
