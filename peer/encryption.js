import crypto from 'crypto';
import fs from 'fs';

const ALGORITHM = 'aes-256-cbc';

// Generating a strong key and save it to disk for reuse
const SECRET_KEY = crypto
    .createHash('sha256')
    .update('my-super-secret-key')
    .digest(); // => 32 byte buffer

export function encryptFile(inputPath, outputPath) {
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
        input.pipe(cipher).pipe(output);

        output.on('finish', () => {
            resolve(iv);
        });

        output.on('error', reject);
        input.on('error', reject);
    });
}

export function decryptFile(inputPath, outputPath, iv) {
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);

    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
        input.pipe(decipher).pipe(output);

        output.on('finish', resolve);
        output.on('error', reject);
        input.on('error', reject);
    });
}