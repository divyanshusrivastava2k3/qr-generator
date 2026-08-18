// Serves an uploaded image back from Vercel's /tmp storage. Self-hosted.
const fs = require('fs');
const path = require('path');
const UPLOAD_DIR = '/tmp';
const MIME = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', bmp:'image/bmp', svg:'image/svg+xml' };

module.exports = async (req, res) => {
  const fn = req.query.filename;
  if (!fn || fn !== path.basename(fn) || fn.includes('..')){
    res.status(400).json({success:false,error:'Bad filename'}); return;
  }
  const fp = path.join(UPLOAD_DIR, fn);
  if (!fs.existsSync(fp)){ res.status(404).json({success:false,error:'Not found'}); return; }
  const e = fn.split('.').pop().toLowerCase();
  res.setHeader('Content-Type', MIME[e] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(fs.readFileSync(fp));
};
