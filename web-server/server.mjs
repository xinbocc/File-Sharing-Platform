process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
import http from 'http';
import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import crypto from 'crypto';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


// Get local IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (let name in interfaces) {
    for (let iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address; // e.g., '192.168.1.100'
      }
    }
  }
  return 'localhost'; // fallback
}

const ip = getLocalIp();



// Store active file shares (in production, use a database)
const activeShares = new Map();

// Serve static frontend
app.use(express.static(path.join(__dirname, '../client/dist')));

// Configure multer to save files with original names in outbox
const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve(__dirname, '../storage/outbox/'),
    filename: (req, file, cb) => {
      // Keep original filename for P2P system compatibility
      cb(null, file.originalname);
    }
  })
});

// Start P2P server in background when web server starts
let p2pServerProcess = null;

function startP2PServer() {
  const p2pServerPath = path.resolve(__dirname, '../peer/p2p-server.js');
  
  if (fs.existsSync(p2pServerPath)) {
    console.log('🔄 Starting P2P server...');
    p2pServerProcess = spawn('node', [p2pServerPath], {
      stdio: 'inherit',
      cwd: path.dirname(p2pServerPath)
    });
    
    p2pServerProcess.on('error', (err) => {
      console.error('❌ P2P server error:', err);
    });
    
    console.log('✅ P2P server started');
  } else {
    console.error('❌ P2P server not found at:', p2pServerPath);
  }
}

// NEW: Upload endpoint that generates share links
app.post('/send', upload.single('file'), async (req, res) => {
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  
  try {
    // Generate unique share ID
    const shareId = crypto.randomBytes(16).toString('hex');
    
    // Store share info
    activeShares.set(shareId, {
      filename: file.filename, // original filename
      originalName: file.originalname,
      filepath: file.path,
      uploadTime: new Date(),
      downloads: 0,
      size: file.size
    });
    
    // Generate share link
    const shareLink = `http://${ip}:3000/share/${shareId}`;
    
    console.log(`📤 File uploaded: ${file.originalname}`);
    console.log(`🔗 Share link: ${shareLink}`);
    
    res.json({
      success: true,
      shareLink: shareLink,
      shareId: shareId,
      filename: file.originalname,
      size: file.size
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// NEW: Share endpoint that triggers P2P transfer
app.get('/share/:shareId', async (req, res) => {
  const shareId = req.params.shareId;
  const shareInfo = activeShares.get(shareId);
  
  if (!shareInfo) {
    return res.status(404).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>❌ Share Not Found</h2>
          <p>This share link has expired or doesn't exist.</p>
        </body>
      </html>
    `);
  }
  
  try {
    console.log(`🔗 Share accessed: ${shareInfo.filename}`);
    
    // Trigger P2P client to process the file
    const success = await triggerP2PTransfer(shareInfo.filename);
    
    if (success) {
      shareInfo.downloads++;
      
      // Path where decrypted file should be after P2P processing
      const decryptedPath = path.resolve(__dirname, '../storage/inbox', shareInfo.filename);
      
      // Wait for P2P process to complete
      await waitForFile(decryptedPath, 10000); // Wait up to 10 seconds
      
      if (fs.existsSync(decryptedPath)) {
        console.log(`📥 Sending file: ${shareInfo.filename}`);
        res.download(decryptedPath, shareInfo.originalName, (err) => {
          if (err) {
            console.error('❌ Download error:', err);
          } else {
            console.log(`✅ Download completed: ${shareInfo.filename}`);
          }
        });
      } else {
        throw new Error('File not found after P2P processing');
      }
    } else {
      throw new Error('P2P transfer failed');
    }
    
  } catch (error) {
    console.error('❌ Share error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>❌ Download Failed</h2>
          <p>Error: ${error.message}</p>
          <p>Please try again later.</p>
        </body>
      </html>
    `);
  }
});

// Function to trigger P2P client
function triggerP2PTransfer(filename) {
  return new Promise((resolve) => {
    const p2pClientPath = path.resolve(__dirname, '../peer/p2p-client.js');
    
    if (!fs.existsSync(p2pClientPath)) {
      console.error('❌ P2P client not found at:', p2pClientPath);
      resolve(false);
      return;
    }
    
    console.log(`🔄 Triggering P2P transfer for: ${filename}`);
    
    const p2pClient = spawn('node', [p2pClientPath], {
      stdio: 'inherit',
      cwd: path.dirname(p2pClientPath)
    });
    
    p2pClient.on('close', (code) => {
      console.log(`P2P client exited with code ${code}`);
      resolve(code === 0);
    });
    
    p2pClient.on('error', (error) => {
      console.error('❌ P2P client error:', error);
      resolve(false);
    });
    
    // Timeout after 8 seconds
    setTimeout(() => {
      p2pClient.kill();
      resolve(true); // Assume success for now
    }, 8000);
  });
}

// Helper function to wait for file to exist
function waitForFile(filePath, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkFile = () => {
      if (fs.existsSync(filePath)) {
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('File wait timeout'));
      } else {
        setTimeout(checkFile, 500);
      }
    };
    
    checkFile();
  });
}

// API endpoint to get share info
app.get('/api/share/:shareId/info', (req, res) => {
  const shareId = req.params.shareId;
  const shareInfo = activeShares.get(shareId);
  
  if (!shareInfo) {
    return res.status(404).json({ error: 'Share not found' });
  }
  
  res.json({
    filename: shareInfo.originalName,
    size: shareInfo.size,
    uploadTime: shareInfo.uploadTime,
    downloads: shareInfo.downloads
  });
});

// Keep the old endpoint for backward compatibility (but discouraged)
app.post('/send', upload.single('file'), async (req, res) => {
  res.status(400).json({ 
    success: false, 
    error: 'This endpoint is deprecated. Use /upload to generate share links instead.' 
  });
});

// Start server
const server = http.createServer(app);
const PORT = 3000;

server.listen(PORT, () => {
  console.log(`🚀 HTTP server running at http://localhost:${PORT}`);
  
  // Start P2P server
  startP2PServer();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Shutting down...');
  if (p2pServerProcess) {
    p2pServerProcess.kill();
  }
  process.exit(0);
});