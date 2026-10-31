// CollabMind Unified Gateway — one wrapper over Kiro Gateway, LiteLLM Proxy and Fleet Control.
// Zero dependencies: Node >= 20 (built-in fetch, http, fs).
import http from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

// The app root: one level up from server/. Specs live in ./specs, the built UI in ./dist.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- .env loader (KEY=VALUE, no deps) ---
const envFile = path.join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const PORT = Number(process.env.PORT || 8790);
const HOST = process.env.HOST || '127.0.0.1';

export const SERVICES = {
  kiro: {
    id: 'kiro',
    name: 'Kiro Gateway',
    base: process.env.KIRO_BASE_URL || 'https://kiro-gw.collabmind.dev',
    specUrl: process.env.KIRO_SPEC_URL || 'https://kiro-gw.collabmind.dev/openapi.json',
    specFile: 'specs/kiro.json',
    token: process.env.KIRO_API_KEY || '',
    healthPath: '/health',
  },
  litellm: {
    id: 'litellm',
    name: 'LiteLLM Proxy',
    base: process.env.LITELLM_BASE_URL || 'https://litellmproxy.collabmind.dev',
    specUrl: process.env.LITELLM_SPEC_URL || 'https://litellmproxy.collabmind.dev/openapi.json',
    specFile: 'specs/litellm.json',
    token: process.env.LITELLM_API_KEY || '',
    healthPath: '/health/liveliness',
  },
  fleet: {
    id: 'fleet',
    name: 'Fleet Control',
    base: process.env.FLEET_BASE_URL || 'http://127.0.0.1:8091',
    specUrl: process.env.FLEET_SPEC_URL || 'http://127.0.0.1:8091/openapi.json',
    specFile: 'specs/fleet.json',
    token: process.env.FLEET_API_KEY || '',
    healthPath: '/health',
  },
};

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const specs = {};       // id -> spec object
const specSource = {};  // id -> 'live' | 'vendored'

async function loadSpec(svc, { refresh = false } = {}) {
  const file = path.join(ROOT, svc.specFile);
  if (refresh || !existsSync(file)) {
    try {
      const r = await fetch(svc.specUrl, { signal: AbortSignal.timeout(20000) });
      if (r.ok) {
        const text = await r.text();
        const spec = JSON.parse(text);
        await writeFile(file, text);
        specs[svc.id] = spec;
        specSource[svc.id] = 'live';
        return;
      }
    } catch { /* fall back to vendored copy */ }
  }
  specs[svc.id] = JSON.parse(await readFile(file, 'utf8'));
  specSource[svc.id] ||= 'vendored';
}

function countOps(spec) {
  let n = 0;
  for (const item of Object.values(spec.paths || {})) for (const m of METHODS) if (item[m]) n++;
  return n;
}

// Merge all specs into one OpenAPI document. Paths become /svc/{id}/..., tags and schemas get prefixed.
function mergedSpec() {
  const out = {
    openapi: '3.1.0',
    info: { title: 'CollabMind Unified Gateway', version: '1.0.0', description: 'Kiro Gateway + LiteLLM Proxy + Fleet Control behind one wrapper. Every upstream operation is exposed under /svc/{service}.' },
    servers: [{ url: `http://${HOST}:${PORT}` }],
    paths: {},
    components: { schemas: {}, securitySchemes: {} },
    tags: [],
  };
  for (const [id, spec] of Object.entries(specs)) {
    const name = SERVICES[id].name;
    const rewrite = (node) => {
      if (Array.isArray(node)) return node.map(rewrite);
      if (node && typeof node === 'object') {
        const o = {};
        for (const [k, v] of Object.entries(node)) {
          if (k === '$ref' && typeof v === 'string') o[k] = v.replace('#/components/schemas/', `#/components/schemas/${id}__`);
          else o[k] = rewrite(v);
        }
        return o;
      }
      return node;
    };
    for (const [p, item] of Object.entries(spec.paths || {})) {
      const newItem = rewrite(item);
      for (const m of METHODS) {
        const op = newItem[m];
        if (!op) continue;
        op.tags = (op.tags?.length ? op.tags : ['untagged']).map((t) => `${name} · ${t}`);
        if (op.operationId) op.operationId = `${id}__${op.operationId}`;
        if (op.security) op.security = op.security.map((s) => Object.fromEntries(Object.keys(s).map((k) => [`${id}__${k}`, s[k]])));
      }
      out.paths[`/svc/${id}${p}`] = newItem;
    }
    for (const [k, v] of Object.entries(spec.components?.schemas || {})) out.components.schemas[`${id}__${k}`] = rewrite(v);
    for (const [k, v] of Object.entries(spec.components?.securitySchemes || {})) out.components.securitySchemes[`${id}__${k}`] = v;
    for (const t of spec.tags || []) out.tags.push({ ...t, name: `${name} · ${t.name}` });
  }
  return out;
}

async function probe(svc) {
  const t0 = performance.now();
  try {
    const headers = svc.token ? { authorization: `Bearer ${svc.token}` } : {};
    const r = await fetch(svc.base + svc.healthPath, { headers, signal: AbortSignal.timeout(6000) });
    let body = null;
    try { body = await r.json(); } catch { /* not json */ }
    return { id: svc.id, ok: r.ok, status: r.status, ms: Math.round(performance.now() - t0), body };
  } catch (e) {
    return { id: svc.id, ok: false, status: 0, ms: Math.round(performance.now() - t0), error: String(e.cause?.code || e.message) };
  }
}

// --- HTTP helpers ---
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

const HOP = new Set(['host', 'connection', 'content-length', 'transfer-encoding', 'keep-alive', 'upgrade', 'proxy-connection', 'accept-encoding', 'origin', 'referer', 'cookie']);

async function proxy(req, res, svc, upstreamPath) {
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (HOP.has(k) || k.startsWith('sec-') || k === 'x-upstream-auth') continue;
    headers[k] = v;
  }
  // Browser-supplied token wins, otherwise the server-side key from .env.
  const token = req.headers['x-upstream-auth'] || svc.token;
  if (token && !headers.authorization) headers.authorization = `Bearer ${token}`;

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const body = hasBody ? await readBody(req) : undefined;
  const ac = new AbortController();
  res.on('close', () => ac.abort());
  let r;
  try {
    r = await fetch(svc.base + upstreamPath, { method: req.method, headers, body: body?.length ? body : undefined, redirect: 'manual', signal: ac.signal });
  } catch (e) {
    return sendJson(res, 502, { error: 'upstream_unreachable', service: svc.id, detail: String(e.cause?.code || e.message) });
  }
  const outHeaders = { 'x-upstream-service': svc.id };
  r.headers.forEach((v, k) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'].includes(k)) outHeaders[k] = v;
  });
  res.writeHead(r.status, outHeaders);
  if (!r.body) return res.end();
  Readable.fromWeb(r.body).on('error', () => res.end()).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = url.pathname;

    // Proxy: /svc/{id}/<upstream path>
    const m = p.match(/^\/svc\/([a-z]+)(\/.*)?$/);
    if (m && SERVICES[m[1]]) return await proxy(req, res, SERVICES[m[1]], (m[2] || '/') + url.search);

    if (p === '/api/services') {
      return sendJson(res, 200, Object.values(SERVICES).map((s) => ({
        id: s.id, name: s.name, base: s.base, specUrl: s.specUrl, hasServerToken: !!s.token,
        operations: specs[s.id] ? countOps(specs[s.id]) : 0, specSource: specSource[s.id],
        specTitle: specs[s.id]?.info?.title, specVersion: specs[s.id]?.info?.version,
      })));
    }
    if (p === '/api/health') return sendJson(res, 200, await Promise.all(Object.values(SERVICES).map(probe)));
    if (p.startsWith('/api/specs/')) {
      const id = p.slice('/api/specs/'.length);
      if (!specs[id]) return sendJson(res, 404, { error: 'unknown service' });
      return sendJson(res, 200, specs[id]);
    }
    if (p === '/api/refresh-specs' && req.method === 'POST') {
      await Promise.all(Object.values(SERVICES).map((s) => loadSpec(s, { refresh: true })));
      return sendJson(res, 200, Object.fromEntries(Object.keys(specs).map((id) => [id, { ops: countOps(specs[id]), source: specSource[id] }])));
    }
    if (p === '/openapi.json') return sendJson(res, 200, mergedSpec());

    // Static UI
    const rel = p === '/' ? '/index.html' : p;
    const file = path.join(ROOT, 'dist', path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (file.startsWith(path.join(ROOT, 'dist')) && existsSync(file) && (await stat(file)).isFile()) {
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      return res.end(await readFile(file));
    }
    sendJson(res, 404, { error: 'not found' });
  } catch (e) {
    if (!res.headersSent) sendJson(res, 500, { error: String(e.message) });
    else res.end();
  }
});

await Promise.all(Object.values(SERVICES).map((s) => loadSpec(s, { refresh: process.env.REFRESH_SPECS === '1' })));
server.listen(PORT, HOST, () => {
  const total = Object.values(specs).reduce((n, s) => n + countOps(s), 0);
  console.log(`CollabMind Unified Gateway on http://${HOST}:${PORT}  (${total} operations)`);
  for (const s of Object.values(SERVICES)) console.log(`  /svc/${s.id.padEnd(8)} -> ${s.base}  [${countOps(specs[s.id])} ops, token: ${s.token ? 'server' : 'none'}]`);
});
