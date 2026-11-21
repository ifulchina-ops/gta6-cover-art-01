// Leonida Nights — a tiny static server for app/ (Node 22, standard library
// only), so the cover maker can be tried locally without a build step:
//   node serve.ts            serves app/ on http://localhost:8080
//   node serve.ts --port 9000   serves it on another port
// It only ever serves files under app/, sends the MIME types an offline web app
// needs, and never touches the network beyond the local socket. A development
// convenience, not a server for the internet.
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.woff2', 'font/woff2'],
  ['.woff', 'font/woff'],
  ['.ttf', 'font/ttf'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function portFromArgs() {
  const at = process.argv.indexOf('--port');
  const n = at === -1 ? 8080 : Number(process.argv[at + 1]);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : 8080;
}

/** Resolves a request path inside app/, or null when it escapes or is invalid. */
function insideApp(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.endsWith('/')) decoded += 'index.html';
  const file = resolve(join(appRoot, decoded));
  if (file !== appRoot && !file.startsWith(appRoot + sep)) return null;
  return file;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const file = insideApp(url.pathname);
  if (file === null) {
    response.writeHead(400).end('bad request');
    return;
  }
  let body;
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    body = await readFile(file);
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  response.end(body);
});

const port = portFromArgs();
server.listen(port, '127.0.0.1', () => {
  console.log(`Leonida Nights is on http://localhost:${port}`);
});
