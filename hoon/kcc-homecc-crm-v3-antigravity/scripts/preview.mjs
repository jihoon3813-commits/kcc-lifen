import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../app');
const port = Number(process.env.PORT || 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let target = resolve(root, '.' + path);
    if (target !== root && !target.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
    const bytes = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => { console.error('Preview failed:', error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log('KCC HOMECC CRM 3.0: http://127.0.0.1:' + port));

