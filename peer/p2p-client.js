import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Settings
const PEER_IP = '127.0.0.1';
const PORT = 5001;
const FILENAME = 'testfile.txt'; // File to send
const outboxPath = path.resolve(__dirname, '../storage/outbox', FILENAME);

// Send file function
function sendFile() {
    const socket = net.createConnection(PORT, PEER_IP, () => {
        console.log(`Connected to peer at ${PEER_IP}:${PORT}`);
        
        // Prepare metadata
        const stats = fs.statSync(outboxPath);
        const metadata = {
            filename: FILENAME,
            filesize: stats.size
        };
        
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

// Start sending the file
sendFile();