import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encryptFile } from './encryption';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Settings
const PEER_IP = '127.0.0.1';
const PORT = 5001;
const FILENAME = 'testfile.txt'; // File to send
const outboxPath = path.resolve(__dirname, '../storage/outbox', FILENAME);
const ORIGINAL_PATH = path.join(outboxPath, FILENAME);
const ENCRYPTED_PATH = path.join(outboxPath, `${FILENAME}.enc`);

// Send file function
async function sendFile() {
    // Encrypting file before sending
    const iv = await encryptFile(ORIGINAL_PATH, ENCRYPTED_PATH);
    const stats = fs.statSync(ENCRYPTED_PATH);

    const metadata = {
        filename: FILENAME,
        filesize: stats.size,
        iv: iv.toString('hex') // Convert Buffer to hex str
    };

    const socket = net.createConnection(PORT, PEER_IP, () => {
        console.log(`Connected to peer at ${PEER_IP}:${PORT}`);
        
        // Send metadata as JSON + newline
        socket.write(JSON.stringify(metadata) + '\n');
        
        // Send file stream
        const fileStream = fs.createReadStream(outboxPath);
        fileStream.pipe(socket);
        
        fileStream.on('end', () => {
            console.log(`File ${metadata.filename} sent successfully.`);
            socket.end();
        });
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
}

// Start the file sending process
sendFile().catch((err) => {
    console.error('>>> Encryption/send error:', err);
  });
