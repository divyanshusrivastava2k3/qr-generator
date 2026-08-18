// Self-hosted image upload. Writes to Vercel's ephemeral /tmp storage.
// No third-party service involved.
const fs = require('fs');
const path = require('path');
const UPLOAD_DIR = '/tmp';

function readBody(req){
  return new Promise((resolve, reject)=>{
    if (req.body && Buffer.isBuffer(req.body) && req.body.length) return resolve(req.body);
    if (req.body && typeof req.body === 'string') return resolve(Buffer.from(req.body));
    const chunks = [];
    req.on('data', c=>chunks.push(c));
    req.on('end', ()=>resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function ext(contentType, b64name){
  let name = b64name;
  if (b64name) { try { name = Buffer.from(b64name, 'base64').toString('utf8'); } catch(e){} }
  if (name && name.includes('.')) {
    const e = name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'');
    if (e) return e;
  }
  const part = (contentType||'').split(';')[0].split('/')[1] || 'png';
  return part.replace(/[^a-z0-9]/g,'').toLowerCase() || 'png';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST'){ res.status(405).json({success:false,error:'Method not allowed'}); return; }
  let buf;
  try { buf = await readBody(req); } catch(e){ res.status(400).json({success:false,error:'Read failed'}); return; }
  if (!buf || !buf.length){ res.status(400).json({success:false,error:'Empty file'}); return; }
  const e = ext(req.headers['content-type'], req.headers['x-filename']);
  const fn = `u-${Date.now()}.${e}`;
  try {
    fs.writeFileSync(path.join(UPLOAD_DIR, fn), buf);
    res.status(200).json({ success:true, url:`/api/image?filename=${encodeURIComponent(fn)}` });
  } catch(err){
    console.error('upload save failed', err);
    res.status(500).json({success:false,error:'Save failed'});
  }
};
