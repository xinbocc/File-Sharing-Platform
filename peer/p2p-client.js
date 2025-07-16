import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encryptFile } from './encryption.js';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Settings
const PEER_IP = '127.0.0.1';
const PORT = 5001;
const OUTBOX = path.resolve(__dirname, '../storage/outbox');

// Send file function
async function sendFile(filename) {
    const originalPath = path.join(OUTBOX, filename);
    const encryptedPath = path.join(OUTBOX, `${filename}.enc`);
    // Encrypting file before sending
    const iv = await encryptFile(originalPath, encryptedPath);
    const stats = fs.statSync(encryptedPath);

    const metadata = {
        filename: filename,
        filesize: stats.size,
        iv: iv.toString('hex') // Convert Buffer to hex str
    };

    const socket = net.createConnection(PORT, PEER_IP, () => {
        console.log(`Connected to peer at ${PEER_IP}:${PORT}`);
        
        // Send metadata as JSON + newline
        socket.write(JSON.stringify(metadata) + '\n');
        
        // Send file stream
        const fileStream = fs.createReadStream(encryptedPath);
        fileStream.pipe(socket);
        
        fileStream.on('end', () => {
            console.log(`File ${metadata.filename} sent successfully.`);
            fs.unlinkSync(encryptedPath); // optional cleanup
            socket.end();
        });
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
}

// loop for sending all files in the outbox
async function sendAllFiles() {
    const files = fs.readdirSync(OUTBOX).filter(f => !f.endsWith('.enc'));

    if (files.length === 0) {
        console.log('No files to send in storage/outbox/');
        return;
    }

    for (const file of files) {
        try {
            await sendFile(file);
        } catch (err) {
            console.error(`<> Failed to send ${file}:`, err.message);
        }
        
    }

    console.log('All files processed.');
}



// Start the file sending process
sendAllFiles().catch(err => {
    console.error('Unexpected error:', err);
});
