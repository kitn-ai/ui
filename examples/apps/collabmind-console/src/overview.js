// Overview: routing map, what needs attention, and one summary card per service.
import { $, $$, esc, state, fmtMs, fmtUsd, pct, plural, svcName, svcInfo, groupFailures, providers, loadLive, onLive, STATUS, SEVERITY } from './lib.js';

let host = null;
onLive(() => { if (host?.isConnected) draw(); });

export function renderOverview(view) {
  host = view;
  draw();
}

function draw() {
  if (!state.live) {
    host.innerHTML = `<div class="page"><h1>Overview</h1><kai-skeleton variant="text" lines="3"></kai-skeleton><kai-text-shimmer text="Checking Kiro Gateway, LiteLLM and Fleet Control"></kai-text-shimmer></div>`;
    return;
  }
  const d = state.derived; const L = state.live;
  const ago = Math.round((Date.now() - state.liveAt) / 1000);
  host.innerHTML = `<div class="page">
    <div class="page-head"><h1>Overview</h1><span class="hint">Updated ${ago < 5 ? 'just now' : `${ago} s ago`}. Refreshes every minute.</span><kai-button id="ovRefresh" variant="outline" icon="rotate-cw" label="Refresh now">Refresh now</kai-button></div>
    ${routeMap()}
    <section class="attention" aria-labelledby="attTitle"><h2 id="attTitle">${d.alerts.length ? `Needs attention (${d.alerts.length})` : 'Nothing needs attention'}</h2>
      ${d.alerts.length ? d.alerts.map((a) => `<kai-notice severity="${SEVERITY[a.level]}"><div class="notice-body"><div><strong>${esc(a.text)}</strong>${a.hint ? `<div class="hint">${esc(a.hint)}</div>` : ''}</div>${a.link ? `<a href="${esc(a.link)}">${a.link.startsWith('#/connections') ? 'Open connections' : 'Inspect'}</a>` : ''}</div></kai-notice>`).join('')
        : '<kai-notice severity="success">All three services answer and report no failures.</kai-notice>'}
    </section>
    <div class="services">${kiroCard(L)}${litellmCard(L)}${fleetCard(L)}</div>
  </div>`;
  $('#ovRefresh', host).addEventListener('click', async (e) => { e.currentTarget.disabled = true; await loadLive(); });
  // Arrays go on as properties, after the elements exist.
  for (const cb of $$('kai-code-block[data-json]', host)) cb.code = JSON.stringify(JSON.parse(cb.dataset.json), null, 2);
}

function routeMap() {
  const L = state.live; const d = state.derived;
  const kid = (label, value, level) => `<span class="rm-kid ${level === 'err' ? 'down' : ''}">${level ? `<kai-status status="${STATUS[level]}" size="sm"></kai-status>` : ''}<b>${esc(label)}</b> ${esc(value)}</span>`;
  const kiro = [];
  if (L.kModels.ok) kiro.push(kid('kiro-cli', plural(L.kModels.data.data?.length || 0, 'model'), 'ok'));
  if (L.kOpen.ok) kiro.push(kid('OpenCode', L.kOpen.data.status, L.kOpen.data.status === 'ready' ? 'ok' : 'err'));
  if (L.kAgents.ok) kiro.push(kid(String((L.kAgents.data.agents || []).length), 'agents'));
  if (L.kSessions.ok) kiro.push(kid(String(L.kSessions.data.count ?? (L.kSessions.data.sessions || []).length), 'sessions'));
  if (!kiro.length) kiro.push(kid('No data', L.kTel.error || '', 'err'));
  const lite = [];
  if (L.lModels.ok) {
    const prov = providers(L.lModels.data.data || []);
    prov.slice(0, 7).forEach(([p, n]) => lite.push(kid(p, String(n))));
    if (prov.length > 7) lite.push(kid(String(prov.length - 7), prov.length - 7 === 1 ? 'more provider' : 'more providers'));
  } else lite.push(kid('No data', L.lModels.error, 'err'));
  const fleet = [];
  if (L.fStatus.ok) for (const [k, r] of Object.entries(L.fStatus.data.services || {})) fleet.push(kid(k, r.healthy ? fmtMs(r.latency_ms) : 'down', r.healthy ? 'ok' : 'err'));
  else fleet.push(kid('No data', L.fStatus.error, 'err'));

  const lane = (id, kids) => `<div class="rm-lane"><a class="rm-svc ${d.svc[id].level}" href="#/explore/?svc=${id}"><strong><kai-status status="${STATUS[d.svc[id].level]}"></kai-status>${esc(svcName(id))}</strong><small>${esc(d.svc[id].short)}</small><small class="mono">${esc(svcInfo(id).base.replace(/^https?:\/\//, ''))}</small></a><div class="rm-kids">${kids.join('')}</div></div>`;
  return `<section class="routemap" aria-label="Request routing map"><div class="rm-origin"><div>This console</div></div>${lane('kiro', kiro)}${lane('litellm', lite)}${lane('fleet', fleet)}</section>`;
}

const head = (id) => `<div class="card-head"><kai-status status="${STATUS[state.derived.svc[id].level]}"></kai-status><h2>${esc(svcName(id))}</h2><a class="hint" href="#/explore/?svc=${id}">${svcInfo(id).operations} endpoints</a></div>`;
const fig = (v, label, tone = '') => `<div class="fig"><b class="${tone}">${v}</b><span>${esc(label)}</span></div>`;
const raw = (label, v) => `<details class="raw"><summary>Show raw ${esc(label)}</summary><kai-code-block language="json" copy data-json="${esc(JSON.stringify(v))}"></kai-code-block></details>`;
const failCard = (id, msg) => `<kai-card appearance="outlined" class="svc">${head(id)}<kai-notice severity="error">${esc(msg)}</kai-notice></kai-card>`;
const row = (leading, title, subtitle, trailing) => `<kai-row>${leading ? `<span slot="leading">${leading}</span>` : ''}${title}${subtitle ? `<span slot="subtitle">${subtitle}</span>` : ''}${trailing ? `<span slot="trailing">${trailing}</span>` : ''}</kai-row>`;

function kiroCard(L) {
  if (!L.kTel.ok) return failCard('kiro', L.kTel.error);
  const t = L.kTel.data; const rate = pct(t.errors, t.requests);
  const fails = groupFailures(t.recent_events);
  const agents = L.kAgents.ok ? (L.kAgents.data.agents || []).map((a) => a.name || a) : [];
  const limits = L.kCaps.ok ? L.kCaps.data.limitations || [] : [];
  return `<kai-card appearance="outlined" class="svc">${head('kiro')}<div class="card-body">
    <div class="figures">${fig(t.requests, 'requests')}${fig(`${rate}%`, 'failed', rate >= 50 ? 'tone-err' : rate >= 10 ? 'tone-warn' : '')}${fig(fmtMs(t.latency_p95_ms), 'p95 latency')}${fig(t.active, 'in flight')}</div>
    <div class="block"><h3>Recent failures <span class="hint">last ${(t.recent_events || []).length} events</span></h3>
      ${fails.length ? `<kai-row-group>${fails.slice(0, 6).map((f) => row('', `<span class="mono">${esc(f.route)}</span>`, `${f.count}×`, `<kai-badge>${f.status}</kai-badge>`)).join('')}</kai-row-group>` : '<p class="hint">No failures in recent events.</p>'}</div>
    <div class="block"><h3>Agents <span class="hint">${agents.length}</span></h3><div class="chips">${agents.map((a) => `<kai-badge>${esc(a)}</kai-badge>`).join('') || '<span class="hint">None</span>'}</div></div>
    ${limits.length ? `<div class="block"><h3>Known limits</h3><ul class="hint list">${limits.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>` : ''}
    ${raw('telemetry', t)}
  </div></kai-card>`;
}

function litellmCard(L) {
  if (!L.lModels.ok) return failCard('litellm', L.lModels.error);
  const models = L.lModels.data.data || [];
  const prov = providers(models);
  const spend = L.lSpendModels.ok && Array.isArray(L.lSpendModels.data) ? [...L.lSpendModels.data].sort((a, b) => b.total_spend - a.total_spend) : [];
  const max = spend[0]?.total_spend || 1;
  const total = L.lSpend.ok ? L.lSpend.data.spend : spend.reduce((n, s) => n + s.total_spend, 0);
  const db = L.lReady.ok ? L.lReady.data.db : 'unknown';
  return `<kai-card appearance="outlined" class="svc">${head('litellm')}<div class="card-body">
    <div class="figures">${fig(models.length, 'models')}${fig(prov.length, 'providers')}${fig(fmtUsd(total), 'total spend')}${fig(esc(db), 'database', db === 'connected' ? 'tone-ok' : 'tone-warn')}</div>
    <div class="block"><h3>Spend by model</h3>${spend.length ? spend.slice(0, 6).map((s) => `<div class="meter"><span class="mono">${esc(s.model)}</span><kai-progress-bar value="${Math.max(1, Math.round((s.total_spend / max) * 100))}" max="100"></kai-progress-bar><span class="num">${fmtUsd(s.total_spend)}</span></div>`).join('') : `<p class="hint">${esc(L.lSpendModels.error || 'No spend recorded.')}</p>`}</div>
    <div class="block"><h3>Models by provider</h3>${prov.slice(0, 10).map(([p, n]) => `<div class="meter"><span>${esc(p)}</span><kai-progress-bar value="${n}" max="${prov[0][1]}"></kai-progress-bar><span class="num">${n}</span></div>`).join('')}</div>
    ${raw('model list', L.lModels.data)}
  </div></kai-card>`;
}

function fleetCard(L) {
  if (!L.fStatus.ok) return failCard('fleet', L.fStatus.error);
  const runtimes = Object.entries(L.fStatus.data.services || {});
  const up = runtimes.filter(([, r]) => r.healthy).length;
  const roles = L.fRoles.ok ? Object.entries(L.fRoles.data.roles || {}) : [];
  const m = L.fMetrics.ok ? L.fMetrics.data : {};
  return `<kai-card appearance="outlined" class="svc">${head('fleet')}<div class="card-body">
    <div class="figures">${fig(`${up}/${runtimes.length}`, 'runtimes up', up < runtimes.length ? 'tone-warn' : 'tone-ok')}${fig(m.total_requests ?? '—', 'requests')}${fig(m.total_errors ?? '—', 'errors', m.total_errors ? 'tone-warn' : '')}${fig(m.memory ? `${m.memory.free_pct}%` : '—', `memory free${m.memory ? `, ${m.memory.level}` : ''}`)}</div>
    <div class="block"><h3>Runtimes</h3><kai-row-group>${runtimes.map(([k, r]) => row(`<kai-status status="${r.healthy ? 'online' : 'busy'}"></kai-status>`, esc(r.name || k), esc(r.error || `${(r.models || []).length} models`), r.healthy ? fmtMs(r.latency_ms) : '<kai-badge>down</kai-badge>')).join('')}</kai-row-group></div>
    <div class="block"><h3>Roles</h3><kai-row-group>${roles.map(([k, r]) => row('', esc(k.replace(/_/g, ' ')), `<span class="mono">${esc(r.model)}</span> on ${esc(r.runtime)}`, `<kai-badge>${r.available ? 'ready' : 'unavailable'}</kai-badge>`)).join('')}</kai-row-group></div>
    ${raw('fleet status', L.fStatus.data)}
  </div></kai-card>`;
}
