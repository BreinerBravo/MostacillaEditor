import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (file !== root && !file.startsWith(root + sep)) throw new Error('not found');
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('No encontrado');
  }
});
const requestedPort = Number(process.env.PORT) || 4173;
const railwayPort = Boolean(process.env.PORT);
const maximumPort = railwayPort ? requestedPort : requestedPort + 20;
const host = railwayPort ? '0.0.0.0' : '127.0.0.1';

function listen(port) {
  server.once('error', error => {
    if (error.code === 'EADDRINUSE' && port < maximumPort) {
      console.warn(`El puerto ${port} está ocupado; intentando ${port + 1}.`);
      listen(port + 1);
      return;
    }
    console.error(`No se pudo iniciar el servidor en el puerto ${port}: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, host, () => console.log(`Mostacillas disponible en http://${railwayPort ? '0.0.0.0' : 'localhost'}:${port}`));
}

listen(requestedPort);
