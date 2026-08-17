const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Enable raw body parsing for image uploads up to 10MB
app.use(express.raw({ type: 'image/*', limit: '10mb' }));

// Serve all static files directly from the root workspace directory
app.use(express.static(__dirname));

// Function to automatically detect the local IPv4 address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!name.toLowerCase().includes('virtualbox') && !name.toLowerCase().includes('vmware')) {
          return iface.address;
        }
      }
    }
  }
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// API endpoint to retrieve connection information
app.get('/api/info', (req, res) => {
  const localIp = getLocalIpAddress();
  res.json({
    localIp,
    port: PORT
  });
});

// POST endpoint to handle local image uploads
app.post('/api/upload', (req, res) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ success: false, error: 'Empty file payload' });
  }

  // Get extension from Content-Type or default to png
  const contentType = req.headers['content-type'] || '';
  const ext = contentType.split('/')[1] || 'png';
  const filename = `uploaded-${Date.now()}.${ext}`;
  const filepath = path.join(__dirname, filename);

  fs.writeFile(filepath, req.body, (err) => {
    if (err) {
      console.error('Local upload save failed:', err);
      return res.status(500).json({ success: false, error: 'Failed to write image to disk' });
    }
    const localIp = getLocalIpAddress();
    res.json({
      success: true,
      url: `http://${localIp}:${PORT}/${filename}`
    });
  });
});

// Serve root index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`=================================================`);
  console.log(`QR Code Server running successfully!`);
  console.log(`Dashboard (Desktop): http://localhost:${PORT}`);
  console.log(`Mobile Scan Base:    http://${localIp}:${PORT}`);
  console.log(`=================================================`);
});
