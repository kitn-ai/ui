// Static page server for the block driver — the spike's CDN stand-in,
// parameterized. Serves ROOT at /, and mounts KIT (normally the built
// packages/ui/dist) at /kit/ so harness pages import
// `/kit/web-components/autoloader.js` exactly the way a CDN page imports
// `https://cdn.jsdelivr.net/npm/@kitn.ai/ui@<version>/dist/web-components/autoloader.js`.
// Env: PORT (default 8952 — never 4400/4401/8931), ROOT, KIT.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { portHolders, formatPortHolders } from './port-holder.mjs';

const ROOT = resolve(process.env.ROOT ?? '.');
const KIT = resolve(process.env.KIT ?? '../../dist');
const PORT = Number(process.env.PORT ?? 8952);

const TYPES = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let path = normalize(decodeURIComponent(url.pathname));
  if (path.endsWith('/')) path += 'index.html';
  const file = path.startsWith('/kit/')
    ? join(KIT, path.slice('/kit/'.length))
    : join(ROOT, path);
  // normalize() above collapses any ../ before the prefix check; refuse escapes.
  if (!file.startsWith(KIT) && !file.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

// The bind failure the driver's pre-flight exists to make rare, handled anyway
// because a pre-flight can only check the port it saw and the two are not atomic.
// A bare EADDRINUSE stack says nothing about WHO holds the port, which is the
// whole question when the answer might be a stale run of this same server — so
// this names the holder the same way driver.mjs does, from the same lookup, and
// exits 3 (distinct from a generic failure) for the driver's wait to reject on.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `serve.mjs cannot bind port ${PORT} — it is already held by:\n` +
      `${formatPortHolders(portHolders(PORT))}\n` +
      `If that is a serve.mjs or driver.mjs you do not recognise as yours, it is a stale block-driver run — kill it, or pass a free --port.`,
    );
    process.exit(3);
  }
  console.error(`serve.mjs failed to listen on ${PORT}: ${err.stack ?? err}`);
  process.exit(1);
});

server.listen(PORT, () => console.log(`block-driver pages listening on http://localhost:${PORT}/ root=${ROOT} kit=${KIT}`));
