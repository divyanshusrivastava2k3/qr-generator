// Vercel serverless function: self-hosted image upload.
// Writes to the function's ephemeral /tmp directory (Vercel's own storage).
// No third-party API is involved.

const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = '/tmp';

function getExtension(contentType) {
  if (!contentType) return 'png';
  const part = contentType.split(';')[0].split('/')[1] || 'png';
  return part.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
}

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Vercel parses body into a Buffer when Content-Type is not JSON/form.
  const body = req.body;
  if (!body || (Buffer.isBuffer(body) && body.length === 0)) {
    res.status(400).json({ success: false, error: 'Empty file payload' });
    return;
  }

  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  if (buffer.length === 0) {
    res.status(400).json({ success: false, error: 'Empty file payload' });
    return;
  }

  const ext = getExtension(req.headers['content-type']);
  const filename = `uploaded-${Date.now()}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  try {
    fs.writeFileSync(filepath, buffer);
    // Return a path under our own serve endpoint so the client builds the URL
    // against its origin. No third-party service is involved.
    res.status(200).json({ success: true, url: `/api/image?filename=${encodeURIComponent(filename)}` });
  } catch (err) {
    console.error('Vercel upload save failed:', err);
    res.status(500).json({ success: false, error: 'Failed to write image to disk' });
  }
};
