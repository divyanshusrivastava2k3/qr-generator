// Self-hosted image upload using Vercel Blob (Vercel's own storage, not a
// third-party service). The uploaded image gets a permanent, publicly
// readable URL that the QR code points to. No external API involved.
const { put } = require('@vercel/blob');

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && Buffer.isBuffer(req.body) && req.body.length) return resolve(req.body);
    if (req.body && typeof req.body === 'string') return resolve(Buffer.from(req.body));
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function realName(b64) {
  if (!b64) return null;
  try { return Buffer.from(b64, 'base64').toString('utf8'); } catch (e) { return null; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  let buf;
  try { buf = await readBody(req); } catch (e) {
    res.status(400).json({ success: false, error: 'Read failed' }); return;
  }
  if (!buf || !buf.length) {
    res.status(400).json({ success: false, error: 'Empty file' });
    return;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    res.status(500).json({ success: false, error: 'Blob storage not configured' });
    return;
  }

  const name = realName(req.headers['x-filename']) || 'image.png';
  try {
    const blob = await put(name, buf, {
      access: 'public',
      token,
      addRandomSuffix: true,
    });
    // Return the absolute public URL — persists permanently on Vercel storage.
    res.status(200).json({ success: true, url: blob.url });
  } catch (err) {
    console.error('blob upload failed', err);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
};
