import https from 'https';
import fs from 'fs';
import path from 'path'; 
import express from 'express';
import { Server } from 'socket.io';

// Configure HTTPS options (private key and certificate)
const options = {
    key: fs.readFileSync(path.resolve('certifications/MyServerHTTPS.key')),
    cert: fs.readFileSync(path.resolve('certifications/MyServerHTTPS.crt')),
};

const app = express();

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Create HTTPS server
const server = https.createServer(options, app);

// Initialize socket.io with the HTTPS server
const io = new Server(server);

// Handle socket.io connections
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Define a test route
app.get('/hello', (req, res) => {
    res.send('HTTPS server with socket.io running and serving static files.');
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`HTTPS server running at https://localhost:${PORT}`);
});
