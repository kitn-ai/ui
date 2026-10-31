// Connections: credential source per service, a test button, and the API spec refresh.
import { $, $$, esc, state, store, get, fmtMs, loadSpecs, loadLive, svcName, toast } from './lib.js';

const TEST_PATH = { kiro: '/api/kiro/capabilities', litellm: '/v1/models', fleet: '/fleet/status' };

export function renderConnections(view) {
  const tokens = store.get('tokens', {});
  view.innerHTML = `<div class="page narrow"><div class="page-head"><h1>Connections</h1></div>
    <p class="hint">A token saved here stays in this browser and overrides the server key from <code>.env</code>, for this browser only.</p>
    ${state.services.map((s) => {
      const source = tokens[s.id] ? 'Browser token' : s.hasServerToken ? 'Server key from .env' : 'No credentials';
      return `<kai-settings-group heading="${esc(s.name)}" description="${esc(s.base)}">
        <kai-setting-item label="Credentials" description="${esc(source)}"><kai-badge slot="control">${s.id === 'fleet' && !tokens[s.id] ? 'Not needed' : esc(source.split(' ')[0])}</kai-badge></kai-setting-item>
        <kai-setting-item label="Browser token" description="Leave empty to use the server key."><div slot="control" class="conn-ctl"><kai-input type="password" data-token="${s.id}" value="${esc(tokens[s.id] || '')}" placeholder="Bearer token" autocomplete="off"></kai-input><kai-button data-save="${s.id}" variant="outline">Save</kai-button></div></kai-setting-item>
        <kai-setting-item label="Connection" description="Calls ${esc(TEST_PATH[s.id])} with the active credentials."><div slot="control" class="conn-ctl"><span class="hint" id="msg-${s.id}"></span><kai-button data-test="${s.id}" variant="outline">Test</kai-button></div></kai-setting-item>
      </kai-settings-group>`;
    }).join('')}
    <kai-settings-group heading="API specs" description="${state.ops.length} endpoints loaded from the three OpenAPI documents.">
      <kai-setting-item label="Re-download the specs" description="Fetches each service's live /openapi.json and replaces the vendored copy."><kai-button slot="control" id="refreshSpecs" variant="outline">Re-download</kai-button></kai-setting-item>
      <kai-setting-item label="Merged OpenAPI" description="All endpoints under /svc/{service}, schemas and tags namespaced."><a slot="control" href="/openapi.json" target="_blank" rel="noopener">Open openapi.json</a></kai-setting-item>
    </kai-settings-group></div>`;

  $$('[data-save]', view).forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.save; const all = store.get('tokens', {}); const v = String($(`[data-token="${id}"]`, view).value || '').trim();
    if (v) all[id] = v; else delete all[id];
    store.set('tokens', all);
    toast(v ? `${svcName(id)} token saved in this browser` : `${svcName(id)} browser token removed`, 'success');
    renderConnections(view);
    void test(id);
  }));
  $$('[data-test]', view).forEach((b) => b.addEventListener('click', () => test(b.dataset.test)));
  $('#refreshSpecs', view).addEventListener('click', async () => {
    const r = await (await fetch('/api/refresh-specs', { method: 'POST' })).json();
    await loadSpecs();
    toast('Specs re-downloaded', 'success', Object.entries(r).map(([k, v]) => `${svcName(k)}: ${v.ops} (${v.source})`).join(', '));
    renderConnections(view);
  });
}

async function test(id) {
  const msg = document.getElementById(`msg-${id}`);
  if (msg) msg.textContent = 'Testing…';
  const t0 = performance.now(); const r = await get(id, TEST_PATH[id]);
  const text = r.ok ? `Connected in ${fmtMs(performance.now() - t0)}` : `Failed: ${r.error}`;
  if (msg) { msg.textContent = text; msg.className = r.ok ? 'tone-ok' : 'tone-err'; }
  toast(`${svcName(id)}: ${text}`, r.ok ? 'success' : 'error');
  if (r.ok) loadLive();
}
