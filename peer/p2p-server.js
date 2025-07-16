import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { decryptFile } from './encryption.js';

// Resolve __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempPath = path.resolve(__dirname, '../storage/inbox/temp'); 


// Settings
const PORT = 5001;
const inboxPath = path.resolve(__dirname, '../storage/inbox');

// Ensure folders exist
fs.mkdirSync(inboxPath, { recursive: true });
fs.mkdirSync(tempPath, { recursive: true });

const server = net.createServer((socket) => {
    console.log('Incoming connection from:', socket.remoteAddress);

    let fileStream;
    let state = 'waiting-metadata';
    let filename = '';
    let filesize = 0;
    let receivedBytes = 0;
    let buffer = '';
    let iv;

    socket.on('data', (chunk) => {
        console.log('Received data chunk:', chunk.length, 'bytes');
        if (state === 'waiting-metadata') {
            buffer += chunk.toString();
        
            if (buffer.includes('\n')) {
                const [metaJSON, rest] = buffer.split('\n', 2);
                try {
                    const metadata = JSON.parse(metaJSON);
                    filename = metadata.filename;
                    filesize = metadata.filesize;
                    iv = Buffer.from(metadata.iv, 'hex'); // Convert hex str to Buffer

                    console.log(`Receiving file: ${filename}, size: ${filesize} bytes`);

                    const encFilePath = path.join(tempPath, `${filename}.enc`);
                    fileStream = fs.createWriteStream(encFilePath);
                    state = 'receiving-file';

                    // Pass remaining data to file stream
                    const remainingBuffer = Buffer.from(rest, 'binary');
                    receivedBytes += remainingBuffer.length;
                    fileStream.write(remainingBuffer);
                } catch (error) {
                    console.error('Error parsing metadata:', error);
                    socket.destroy();
                }
            }
        } else if (state === 'receiving-file') {
            receivedBytes += chunk.length;
            fileStream.write(chunk);

            if (receivedBytes >= filesize) {
                fileStream.end();
                console.log(`File ${filename} received successfully.`);

                const encFilePath = path.join(tempPath, `${filename}.enc`);
                const finalPath = path.join(inboxPath, filename);
        
                (async () => {
                    try {
                        await decryptFile(encFilePath, finalPath, iv);
                        console.log(`File decrypted and saved to inbox as: ${filename}`);
                        socket.end();
                    } catch (err) {
                        console.error('Decryption failed:', err);
                        socket.end();
                    }
                })();
            }
        }
    });

    socket.on('end', () => {
        if (fileStream) {
            fileStream.end();
        }
        console.log('Connection ended.');
    });

    socket.on('error', (err) => {  
        console.error('Socket error:', err);
        if (fileStream) {
            fileStream.end();
        }
    });
});

server.listen(PORT, () => {
    console.log(`P2P server listening on port ${PORT}`);
});
