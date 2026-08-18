// Vercel serverless function: self-hosted image upload.
// Writes to the function's ephemeral /tmp directory (Vercel's own storage).
// No third-party API is involved.

const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = '/tmp';

function getExtension(contentType, filename) {
  // Prefer the real file extension when provided by the client.
  // filename may be base64-encoded on the client (to support non-Latin names)
  // or a plain name. We only need the extension here, so decode first.
  let decodedName = filename;
  if (filename) {
    try {
      decodedName = Buffer.from(filename, 'base64').toString('utf8');
    } catch (e) {
      decodedName = filename;
    }
  }
  if (decodedName && decodedName.includes('.')) {
    const ext = decodedName.split('.').pop().toLowerCase().replace(/[^a-z0-9]/gi, '');
    if (ext) return ext;
  }
  if (!contentType) return 'png';
  const part = contentType.split(';')[0].split('/')[1] || 'png';
  return part.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
}

// Vercel only auto-parses JSON/form bodies. For raw image/* binary the body
// arrives empty, so we must collect the request stream ourselves.
function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
      return resolve(req.body);
    }
    if (req.body && typeof req.body === 'string') {
      return resolve(Buffer.from(req.body));
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  let buffer;
  try {
    buffer = await readBody(req);
  } catch (err) {
    res.status(400).json({ success: false, error: 'Failed to read upload' });
    return;
  }

  if (!buffer || buffer.length === 0) {
    res.status(400).json({ success: false, error: 'Empty file payload' });
    return;
  }

  const ext = getExtension(req.headers['content-type'], req.headers['x-filename']);
  const filename = `uploaded-${Date.now()}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  try {
    fs.writeFileSync(filepath, buffer);
    res.status(200).json({
      success: true,
      url: `/api/image?filename=${encodeURIComponent(filename)}`
    });
  } catch (err) {
    console.error('Vercel upload save failed:', err);
    res.status(500).json({ success: false, error: 'Failed to write image to disk' });
  }
};
