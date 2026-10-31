// Shared helpers: wrapper API access, formatting, local storage, and the derived health model.
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const fmtMs = (ms) => (ms == null ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);
export const fmtUsd = (n) => (!n ? '$0' : n < 0.01 ? '<$0.01' : `$${n.toFixed(n >= 10 ? 0 : 2)}`);
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
export const humanize = (s) => String(s || '').replace(/_/g, ' ').replace(/\s+Fn$/i, '').replace(/^\w/, (c) => c.toUpperCase());
export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

// Health level → <kai-status> presence value and <kai-notice> severity.
export const STATUS = { ok: 'online', warn: 'away', err: 'busy' };
export const SEVERITY = { ok: 'success', warn: 'warning', err: 'error' };
export const TONE = { ok: 'success', warn: 'warning', err: 'error' };

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

export const state = { services: [], specs: {}, ops: [], health: {}, live: null, liveAt: 0, derived: null, listeners: new Set() };
export const onLive = (fn) => state.listeners.add(fn);
export const tokenFor = (svc) => store.get('tokens', {})[svc] || '';
export const svcName = (id) => state.services.find((s) => s.id === id)?.name || id;
export const svcInfo = (id) => state.services.find((s) => s.id === id);

export function svcFetch(svc, path, init = {}) {
  const headers = new Headers(init.headers || {});
  const t = tokenFor(svc);
  if (t) headers.set('x-upstream-auth', t);
  return fetch(`/svc/${svc}${path}`, { ...init, headers });
}

/** Any upstream error body (JSON, HTML error page, text) as one readable line. */
export function errorText(status, text) {
  const title = /<title>([^<]*)<\/title>/i.exec(text || '')?.[1];
  if (title) return `${status} ${title.replace(/^.*\|\s*/, '').trim()}`;
  try {
    const j = JSON.parse(text);
    const d = j.detail ?? j.error?.message ?? j.error ?? j.message ?? j;
    return `${status} ${typeof d === 'string' ? d : JSON.stringify(d).slice(0, 240)}`;
  } catch { return `${status} ${String(text || '').slice(0, 240) || 'no response body'}`; }
}

export async function get(svc, path) {
  try {
    const r = await svcFetch(svc, path);
    const text = await r.text();
    if (!r.ok) return { ok: false, status: r.status, error: errorText(r.status, text) };
    try { return { ok: true, data: JSON.parse(text) }; } catch { return { ok: true, data: text }; }
  } catch (e) { return { ok: false, status: 0, error: e.message }; }
}

// ---------- specs → flat endpoint list ----------
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
function tagFor(svc, path, op) {
  if (op.tags?.length) return op.tags[0];
  const segs = path.split('/').filter((x) => x && !/^(api|v\d+|\{.*\})$/.test(x));
  return segs[0] ? segs[0].replace(/^\./, '') : svc;
}
export async function loadSpecs() {
  state.services = await (await fetch('/api/services')).json();
  await Promise.all(state.services.map(async (s) => { state.specs[s.id] = await (await fetch(`/api/specs/${s.id}`)).json(); }));
  state.ops = [];
  for (const s of state.services) {
    for (const [p, item] of Object.entries(state.specs[s.id].paths || {})) {
      for (const m of METHODS) {
        const op = item[m];
        if (!op) continue;
        const rawTag = tagFor(s.id, p, op);
        const name = humanize(op.summary || op.operationId || p);
        state.ops.push({
          svc: s.id, method: m, path: p, op, name, pathParams: item.parameters || [],
          tag: humanize(rawTag.replace(/[-_]/g, ' ')),
          key: `${s.id}:${m}:${p}`,
          hay: `${m} ${p} ${name} ${op.operationId || ''} ${rawTag}`.toLowerCase(),
        });
      }
    }
  }
}
export const opKeyFor = (svc, m, p) => state.ops.find((o) => o.svc === svc && o.method === m && o.path === p)?.key
  || state.ops.find((o) => o.svc === svc && o.path === p)?.key;

// ---------- live data + derived health ----------
export async function loadLive() {
  const [health, kTel, kAgents, kSessions, kCaps, kModels, kOpen, lModels, lSpendModels, lSpend, lReady, fStatus, fRoles, fMetrics] = await Promise.all([
    fetch('/api/health').then((r) => r.json()).catch(() => []),
    get('kiro', '/gui/chat/v2/telemetry'), get('kiro', '/api/kiro/agents'), get('kiro', '/api/kiro/sessions'), get('kiro', '/api/kiro/capabilities'),
    get('kiro', '/v1/models'), get('kiro', '/api/opencode/status'),
    get('litellm', '/v1/models'), get('litellm', '/global/spend/models'), get('litellm', '/global/spend'), get('litellm', '/health/readiness'),
    get('fleet', '/fleet/status'), get('fleet', '/fleet/roles'), get('fleet', '/fleet/metrics'),
  ]);
  for (const h of health) state.health[h.id] = h;
  state.live = { kTel, kAgents, kSessions, kCaps, kModels, kOpen, lModels, lSpendModels, lSpend, lReady, fStatus, fRoles, fMetrics };
  state.liveAt = Date.now();
  state.derived = derive();
  for (const fn of state.listeners) fn();
}

export function groupFailures(events = []) {
  const m = new Map();
  for (const e of events) {
    if (!e.status || e.status < 400) continue;
    const k = `${e.status} ${e.route}`;
    m.set(k, { status: e.status, route: e.route, count: (m.get(k)?.count || 0) + 1 });
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
}

export function providers(models) {
  const m = new Map();
  for (const x of models) { const p = x.id.includes('/') ? x.id.split('/')[0] : 'aliases'; m.set(p, (m.get(p) || 0) + 1); }
  return [...m].sort((a, b) => b[1] - a[1]);
}

function derive() {
  const L = state.live; const H = state.health;
  const alerts = [];
  const add = (level, svc, text, hint, link) => alerts.push({ level, svc, text, hint, link });
  const svc = {};

  { // Kiro
    const h = H.kiro; let level = 'ok'; let short = 'healthy';
    if (!h?.ok) { level = 'err'; short = 'unreachable'; add('err', 'kiro', 'Kiro Gateway is not answering its health check.', h?.error || `HTTP ${h?.status}`); }
    else if (!L.kTel.ok && L.kTel.status === 401) { level = 'warn'; short = 'needs a token'; add('warn', 'kiro', 'Kiro Gateway rejects this console’s credentials.', 'Add KIRO_API_KEY to .env or save a token under Connections.', '#/connections'); }
    else if (L.kTel.ok) {
      const t = L.kTel.data; const rate = pct(t.errors, t.requests);
      if (rate >= 10) {
        level = rate >= 50 ? 'err' : 'warn'; short = `${rate}% of requests failing`;
        const byRoute = groupFailures(t.recent_events);
        add(level, 'kiro', `Kiro Gateway: ${t.errors} of ${t.requests} requests failed since it started.`,
          byRoute.length ? `Most recent failures: ${byRoute.slice(0, 3).map((f) => `${f.status} on ${f.route} (${f.count}×)`).join(', ')}.` : '',
          byRoute[0] ? `#/explore/${encodeURIComponent(opKeyFor('kiro', 'post', byRoute[0].route) || '')}` : null);
      }
      if (t.latency_p95_ms > 10000) add('warn', 'kiro', `Kiro Gateway is slow: 95th-percentile latency is ${fmtMs(t.latency_p95_ms)}.`);
    }
    if (L.kOpen.ok && L.kOpen.data.status !== 'ready') add('warn', 'kiro', `OpenCode backend reports “${L.kOpen.data.status}”.`);
    svc.kiro = { level, short };
  }
  { // LiteLLM
    const h = H.litellm; let level = 'ok'; let short = 'healthy';
    if (!h?.ok) { level = 'err'; short = 'unreachable'; add('err', 'litellm', 'LiteLLM Proxy is not answering its health check.', h?.error || `HTTP ${h?.status}`); }
    else if (L.lReady.ok && (L.lReady.data.status !== 'healthy' || L.lReady.data.db !== 'connected')) { level = 'warn'; short = 'degraded'; add('warn', 'litellm', `LiteLLM readiness is “${L.lReady.data.status}”, database “${L.lReady.data.db}”.`); }
    else if (!L.lModels.ok && L.lModels.status === 401) { level = 'warn'; short = 'needs a token'; add('warn', 'litellm', 'LiteLLM rejects this console’s credentials.', 'Add LITELLM_API_KEY to .env or save a token under Connections.', '#/connections'); }
    else if (L.lModels.ok) short = `${L.lModels.data.data?.length || 0} models ready`;
    svc.litellm = { level, short };
  }
  { // Fleet
    const h = H.fleet; let level = 'ok'; let short = 'healthy';
    if (!h?.ok) { level = 'err'; short = 'unreachable'; add('err', 'fleet', 'Fleet Control is not answering on this Mac.', `${h?.error || `HTTP ${h?.status}`}. Start it with uvicorn on port 8091.`); }
    else if (L.fStatus.ok) {
      const runtimes = Object.entries(L.fStatus.data.services || {});
      const down = runtimes.filter(([, r]) => !r.healthy);
      short = `${runtimes.length - down.length} of ${runtimes.length} runtimes up`;
      if (down.length) {
        level = 'warn';
        add('warn', 'fleet', `Fleet: ${plural(down.length, 'runtime')} down: ${down.map(([k, r]) => r.name || k).join(', ')}.`,
          down.map(([k, r]) => `${k}: ${r.error || 'no response'}`).join('; '));
      }
      if (L.fRoles.ok) {
        const off = Object.entries(L.fRoles.data.roles || {}).filter(([, r]) => !r.available);
        if (off.length) add('warn', 'fleet', `Fleet: ${plural(off.length, 'role')} cannot be served: ${off.map(([k]) => k).join(', ')}.`, 'Requests to these roles fail until their runtime is back.');
      }
      if (L.fMetrics.ok && L.fMetrics.data.memory?.level && L.fMetrics.data.memory.level !== 'normal') add('warn', 'fleet', `Fleet memory pressure is ${L.fMetrics.data.memory.level} (${L.fMetrics.data.memory.free_pct}% free).`);
    }
    svc.fleet = { level, short };
  }
  const order = { err: 0, warn: 1, ok: 2 };
  alerts.sort((a, b) => order[a.level] - order[b.level]);
  return { svc, alerts };
}

// ---------- toasts (one <kai-toast-region> for the app) ----------
let toastList = [];
export function toast(message, variant = 'neutral', description) {
  const region = document.querySelector('kai-toast-region');
  if (!region) return;
  const id = newId();
  toastList = [...toastList, { id, message, variant, description }];
  region.toasts = toastList;
  setTimeout(() => { toastList = toastList.filter((t) => t.id !== id); region.toasts = toastList; }, 5000);
}
export function bindToasts(region) {
  region.addEventListener('kai-dismiss', (e) => { toastList = toastList.filter((t) => t.id !== e.detail.id); region.toasts = toastList; });
}
