// Vercel serverless function: serves an uploaded image back from /tmp.
// Self-hosted — reads from Vercel's own ephemeral storage.
// URL pattern: /api/image/:filename

const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = '/tmp';

const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

module.exports = async (req, res) => {
  const filename = req.query.filename;
  if (!filename) {
    res.status(400).json({ success: false, error: 'Missing filename' });
    return;
  }

  // Prevent path traversal — only allow a bare filename.
  if (filename !== path.basename(filename) || filename.includes('..')) {
    res.status(400).json({ success: false, error: 'Invalid filename' });
    return;
  }

  const filepath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filepath)) {
    res.status(404).json({ success: false, error: 'Image not found' });
    return;
  }

  const ext = filename.split('.').pop().toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filepath);

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(data);
};
