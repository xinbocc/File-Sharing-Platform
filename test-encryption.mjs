import { encryptFile, decryptFile } from './peer/encryption.js';

const inputFile = 'storage/outbox/testfile.txt';
const encryptedFile = 'storage/outbox/testfile.txt.enc';
const decryptedFile = 'storage/outbox/testfile-decrypted.txt';

console.log('🔐 Encrypting...');

const iv = await encryptFile(inputFile, encryptedFile);
console.log('✅ Encrypted! IV:', iv.toString('hex'));

console.log('🔓 Decrypting...');

await decryptFile(encryptedFile, decryptedFile, iv);
console.log('✅ Decryption complete. Check the file:', decryptedFile);
