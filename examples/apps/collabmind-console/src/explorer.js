// API explorer: every endpoint of every service in a <kai-file-tree>, a request form, and the response.
import { $, $$, esc, state, store, fmtMs, plural, svcName, svcInfo, svcFetch, tokenFor, errorText } from './lib.js';

const ex = { svc: 'all', q: '', mode: 'endpoints', selected: '', tab: 'body', resp: {}, restore: null, pathToKey: new Map() };
const detailValue = (e) => e.detail?.value ?? e.detail?.id ?? e.detail?.query ?? '';

export function renderExplorer(view, sub) {
  const [keyPart, query] = sub.split('?');
  const params = new URLSearchParams(query || '');
  if (params.get('svc')) ex.svc = params.get('svc');
  ex.selected = keyPart;
  if (!$('.explorer', view)) build(view);
  else if (params.get('svc')) drawList();
  syncTreeSelection();
  const op = state.ops.find((o) => o.key === keyPart);
  if (op) { drawRequest(op); drawResponse(op); }
  else {
    $('#exReq').innerHTML = keyPart
      ? `<kai-empty empty-title="Endpoint not in the spec" description="${esc(keyPart)} is not in the published API spec. Search for it on the left, or re-download the specs under Connections."></kai-empty>`
      : `<kai-empty empty-title="Pick an endpoint" description="All ${state.ops.length} endpoints from Kiro Gateway, LiteLLM and Fleet Control are in the tree. Press / to search."></kai-empty>`;
    $('#exResp').innerHTML = '<kai-empty empty-title="No response yet" description="The response appears here."></kai-empty>';
  }
}

function build(view) {
  view.innerHTML = `<div class="explorer"><kai-resizable orientation="horizontal" theme="auto">
    <kai-resizable-item size="340px" min="260px" max="520px"><nav class="ex-nav" aria-label="Endpoints">
      <div class="ex-filters"><kai-search id="exSearch" placeholder="Search ${state.ops.length} endpoints" shortcut="/" debounce="80"></kai-search>
        <kai-segmented id="exSvc" size="sm"></kai-segmented>
        <div class="row"><span class="hint" id="exCount"></span><kai-tabs id="exMode" variant="segmented"></kai-tabs></div></div>
      <div class="ex-list" id="exList"></div></nav></kai-resizable-item>
    <kai-resizable-item min="360px"><section class="ex-req" id="exReq" aria-label="Request"></section></kai-resizable-item>
    <kai-resizable-item size="42%" min="300px"><section class="ex-resp" id="exResp" aria-label="Response"></section></kai-resizable-item>
  </kai-resizable></div>`;
  const search = $('#exSearch');
  search.value = ex.q;
  const onSearch = (e) => { ex.q = String(detailValue(e)).toLowerCase(); drawList(); };
  search.addEventListener('kai-change', onSearch);
  search.addEventListener('kai-search', onSearch);
  $('#exSvc').options = [{ value: 'all', label: `All ${state.ops.length}` }, ...state.services.map((s) => ({ value: s.id, label: `${s.name.replace(/ (Gateway|Proxy|Control)$/, '')} ${s.operations}` }))];
  $('#exSvc').addEventListener('kai-change', (e) => { ex.svc = detailValue(e); drawList(); });
  $('#exMode').items = [{ id: 'endpoints', label: 'Endpoints' }, { id: 'history', label: 'History' }];
  $('#exMode').addEventListener('kai-tab-change', (e) => { ex.mode = detailValue(e); drawList(); });
  drawList();
}

function leafName(o, seen) {
  const base = `${o.method.toUpperCase()} ${o.name.replace(/\//g, '∕')}`;
  const full = `${svcName(o.svc)}/${o.tag.replace(/\//g, '∕')}/${base}`;
  if (!seen.has(full)) { seen.add(full); return full; }
  return `${full} (${o.path.replace(/\//g, '∕')})`;
}

function drawList() {
  $('#exSvc').value = ex.svc;
  $('#exMode').value = ex.mode;
  const list = $('#exList');
  if (ex.mode === 'history') {
    const hist = store.get('history', []).filter((h) => ex.svc === 'all' || h.svc === ex.svc);
    $('#exCount').textContent = plural(hist.length, 'recent call');
    list.innerHTML = hist.length
      ? `<kai-row-group>${hist.map((h, i) => `<kai-row interactive href="#/explore/${encodeURIComponent(h.key)}" data-hist="${i}"><span slot="leading" class="m ${h.method}">${h.method}</span>${esc(h.name)}<span slot="subtitle" class="mono">${esc(h.url)}</span><kai-badge slot="trailing">${h.status || 'failed'}</kai-badge></kai-row>`).join('')}</kai-row-group>`
      : '<kai-empty empty-title="No calls yet" description="Requests you send are kept here so you can run them again."></kai-empty>';
    $$('[data-hist]', list).forEach((r) => r.addEventListener('click', () => { ex.restore = hist[Number(r.dataset.hist)]; }));
    return;
  }
  const terms = ex.q.split(/\s+/).filter(Boolean);
  const ops = state.ops.filter((o) => (ex.svc === 'all' || o.svc === ex.svc) && terms.every((t) => o.hay.includes(t)));
  $('#exCount').textContent = `${ops.length} of ${state.ops.length}`;
  const seen = new Set();
  ex.pathToKey = new Map();
  const files = [...ops].sort((a, b) => a.svc.localeCompare(b.svc) || a.tag.localeCompare(b.tag) || a.name.localeCompare(b.name)).map((o) => {
    const path = leafName(o, seen);
    ex.pathToKey.set(path, o.key);
    return { path, type: 'other' };
  });
  if (!files.length) { list.innerHTML = '<kai-empty empty-title="No endpoint matches" description="Try a path fragment like spend or agents."></kai-empty>'; return; }
  list.innerHTML = '<kai-file-tree id="exTree" theme="auto"></kai-file-tree>';
  const tree = $('#exTree');
  const folders = new Set(files.map((f) => f.path.split('/')[0]));
  if (terms.length || files.length <= 80) for (const f of files) folders.add(f.path.split('/').slice(0, 2).join('/'));
  for (const [p, k] of ex.pathToKey) if (k === ex.selected) folders.add(p.split('/').slice(0, 2).join('/'));
  tree.defaultExpanded = [...folders];
  tree.files = files;
  tree.addEventListener('kai-select', (e) => {
    const key = ex.pathToKey.get(e.detail.path);
    if (key) location.hash = `#/explore/${encodeURIComponent(key)}`;
  });
  syncTreeSelection();
}

function syncTreeSelection() {
  const tree = $('#exTree');
  if (!tree) return;
  for (const [p, k] of ex.pathToKey) if (k === ex.selected) { tree.activeFile = p; return; }
}

// ---------- spec helpers ----------
function deref(spec, node, seen = new Set()) {
  while (node && node.$ref) {
    if (seen.has(node.$ref)) return {};
    seen.add(node.$ref);
    node = node.$ref.replace(/^#\//, '').split('/').reduce((a, k) => a?.[k.replace(/~1/g, '/').replace(/~0/g, '~')], spec);
  }
  return node || {};
}
function example(spec, schema, depth = 0) {
  schema = deref(spec, schema);
  if (schema.example !== undefined) return schema.example;
  if (Array.isArray(schema.examples) && schema.examples.length) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (depth > 4) return null;
  if (schema.allOf) return Object.assign({}, ...schema.allOf.map((s) => example(spec, s, depth + 1)).filter((x) => x && typeof x === 'object'));
  const alt = schema.anyOf || schema.oneOf;
  if (alt) { const pick = alt.map((s) => deref(spec, s)).find((s) => s.type !== 'null') || alt[0]; return example(spec, pick, depth + 1); }
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type;
  if (type === 'object' || schema.properties) {
    const o = {}; const req = new Set(schema.required || []);
    for (const [k, v] of Object.entries(schema.properties || {})) {
      if (depth > 1 && !req.has(k)) continue;
      const val = example(spec, v, depth + 1);
      if (val === null && !req.has(k)) continue;
      o[k] = val;
    }
    return o;
  }
  if (type === 'array') return [example(spec, schema.items || {}, depth + 1)].filter((x) => x !== null);
  if (type === 'integer' || type === 'number') return 0;
  if (type === 'boolean') return false;
  if (type === 'string') return schema.format === 'date-time' ? new Date().toISOString() : '';
  return null;
}
function opShape(o) {
  const spec = state.specs[o.svc];
  const params = [...o.pathParams, ...(o.op.parameters || [])].map((p) => deref(spec, p));
  const content = deref(spec, o.op.requestBody).content || {};
  const ctypes = Object.keys(content);
  const ctype = ctypes.find((c) => c.includes('json')) || ctypes[0];
  return { spec, params, content, ctype, isForm: !!ctype && /multipart|x-www-form-urlencoded/.test(ctype) };
}

// ---------- request ----------
function drawRequest(o) {
  const { spec, params, content, ctype, isForm } = opShape(o);
  let bodyEx = '';
  if (ctype?.includes('json')) {
    const ex0 = content[ctype].example ?? Object.values(content[ctype].examples || {})[0]?.value ?? example(spec, content[ctype].schema || {});
    if (ex0 && typeof ex0 === 'object' && 'messages' in ex0 && !ex0.messages?.length) ex0.messages = [{ role: 'user', content: 'Hello' }];
    bodyEx = JSON.stringify(ex0 ?? {}, null, 2);
  }
  const formSchema = isForm ? deref(spec, content[ctype].schema || {}) : null;
  const formReq = new Set(formSchema?.required || []);
  const svc = svcInfo(o.svc);
  const authNote = tokenFor(o.svc) ? 'your browser token' : svc.hasServerToken ? 'the server key' : 'no credentials';
  const enumsFor = (p) => { const sch = deref(spec, p.schema || {}); return sch.enum || deref(spec, (sch.anyOf || []).find((s) => deref(spec, s).enum) || {}).enum; };
  const field = (p, i) => {
    const sch = deref(spec, p.schema || {});
    const type = sch.type || deref(spec, (sch.anyOf || [])[0] || {}).type || 'string';
    const label = `${p.name} (${p.in})`;
    const hint = (p.description || '').slice(0, 140);
    return enumsFor(p)
      ? `<kai-select data-param="${esc(p.name)}" data-in="${p.in}" data-i="${i}" label="${esc(label)}" placeholder="Not set"></kai-select>`
      : `<kai-input data-param="${esc(p.name)}" data-in="${p.in}" label="${esc(label)}" placeholder="${esc(type)}" ${hint ? `hint="${esc(hint)}"` : ''} value="${esc(sch.default ?? '')}"></kai-input>`;
  };
  const groups = ['path', 'query', 'header', 'cookie'].map((loc) => [loc, params.filter((p) => p.in === loc)]).filter(([, ps]) => ps.length);

  $('#exReq').innerHTML = `
    <div class="crumb">${esc(svc.name)} / ${esc(o.tag)} ${o.op.deprecated ? '<kai-badge>deprecated</kai-badge>' : ''}</div>
    <h2 class="op-title">${esc(o.name)}</h2>
    <div class="op-line"><span class="m ${o.method}">${o.method}</span><span class="mono">${esc(o.path)}</span></div>
    ${o.op.description && o.op.description !== o.op.summary ? '<kai-markdown id="exDesc" prose-size="sm" class="op-desc"></kai-markdown>' : ''}
    ${groups.map(([loc, ps]) => `<div class="op-section"><h3>${{ path: 'Path', query: 'Query', header: 'Headers', cookie: 'Cookies' }[loc]}</h3><div class="params">${ps.map((p) => field(p, params.indexOf(p))).join('')}</div></div>`).join('')}
    ${isForm ? `<div class="op-section"><h3>Form body</h3><div class="params">${Object.entries(formSchema.properties || {}).map(([k, v0]) => {
      const v = deref(spec, v0);
      const isFile = v.format === 'binary' || deref(spec, v.items || {}).format === 'binary' || (v.anyOf || []).some((s) => deref(spec, s).format === 'binary');
      return isFile ? `<label class="file-field"><span>${esc(k)}${formReq.has(k) ? ' (required)' : ''}</span><input type="file" data-form="${esc(k)}" ${v.type === 'array' ? 'multiple' : ''}></label>`
        : `<kai-input data-form="${esc(k)}" label="${esc(k)}${formReq.has(k) ? ' (required)' : ''}" placeholder="${esc(v.type || 'string')}"></kai-input>`;
    }).join('')}</div></div>`
    : `<div class="op-section"><h3>Body <span class="hint">${ctype ? esc(ctype) : 'optional, the spec declares none'}</span></h3>
      <textarea class="code" id="exBody" rows="${bodyEx ? Math.min(16, bodyEx.split('\n').length + 1) : 4}" spellcheck="false" aria-label="Request body">${esc(bodyEx)}</textarea></div>`}
    <div class="sendbar"><kai-button id="exSend" label="Send request">Send request</kai-button><label class="switch-field"><kai-switch id="exStream" label="Stream response"></kai-switch><span>Stream response</span></label><span class="hint">Sent with ${authNote}. <kai-kbd keys="mod+enter" size="sm"></kai-kbd> sends.</span></div>`;

  if ($('#exDesc')) $('#exDesc').content = o.op.description;
  for (const sel of $$('kai-select[data-param]')) {
    const p = params[Number(sel.dataset.i)];
    sel.options = enumsFor(p).map((v) => ({ value: String(v), label: String(v) }));
    const def = deref(spec, p.schema || {}).default;
    if (def != null) sel.value = String(def);
  }
  const r = ex.restore;
  if (r && r.key === o.key) {
    for (const [k, v] of Object.entries(r.params || {})) { const el = $(`[data-param="${CSS.escape(k)}"]`); if (el) el.value = v; }
    if (r.body != null && $('#exBody')) $('#exBody').value = r.body;
    ex.restore = null;
  }
  $('#exSend').addEventListener('click', () => send(o));
  $('#exReq').onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(o); } };
}

function collect(o) {
  const { ctype, isForm } = opShape(o);
  let url = o.path; const qs = new URLSearchParams(); const headers = {}; const paramVals = {};
  for (const el of $$('[data-param]')) {
    const v = String(el.value ?? '').trim(); if (!v) continue;
    paramVals[el.dataset.param] = v;
    if (el.dataset.in === 'path') url = url.replace(`{${el.dataset.param}}`, encodeURIComponent(v));
    else if (el.dataset.in === 'query') qs.append(el.dataset.param, v);
    else if (el.dataset.in === 'header') headers[el.dataset.param] = v;
  }
  if ([...qs].length) url += '?' + qs;
  let body; let bodyText = null;
  if (isForm) {
    const fd = new FormData();
    for (const el of $$('[data-form]')) {
      if (el.type === 'file') for (const f of el.files) fd.append(el.dataset.form, f);
      else if (el.value) fd.append(el.dataset.form, el.value);
    }
    body = ctype.includes('urlencoded') ? new URLSearchParams(fd) : fd;
  } else {
    bodyText = $('#exBody')?.value.trim() || '';
    if (bodyText) { body = bodyText; headers['content-type'] = ctype && !ctype.includes('json') ? ctype : 'application/json'; }
  }
  return { url, headers, body, bodyText, paramVals };
}

async function send(o) {
  const req = collect(o);
  const missing = [...req.url.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  const fail = (msg) => { ex.resp[o.key] = { error: msg }; drawResponse(o); };
  if (missing.length) return fail(`Fill in the path parameter ${missing.join(', ')} first.`);
  if (req.headers['content-type'] === 'application/json') { try { JSON.parse(req.body); } catch (e) { return fail(`The body is not valid JSON: ${e.message}`); } }

  const res = { req, t0: performance.now(), streaming: true, text: '' };
  ex.resp[o.key] = res;
  drawResponse(o);
  const btn = $('#exSend'); if (btn) btn.disabled = true;
  try {
    const r = await svcFetch(o.svc, req.url, { method: o.method.toUpperCase(), headers: req.headers, body: ['get', 'head'].includes(o.method) ? undefined : req.body });
    Object.assign(res, { status: r.status, statusText: r.statusText, ok: r.ok, ct: r.headers.get('content-type') || '', headers: [...r.headers] });
    if (/image|audio|video|octet-stream|pdf|zip/.test(res.ct)) res.blob = await r.blob();
    else if ($('#exStream')?.checked || /event-stream|ndjson/.test(res.ct)) {
      const reader = r.body.getReader(); const dec = new TextDecoder();
      for (;;) { const { done, value } = await reader.read(); if (done) break; res.text += dec.decode(value, { stream: true }); res.ms = performance.now() - res.t0; if (ex.selected === o.key) drawResponse(o); }
    } else res.text = await r.text();
  } catch (e) { res.error = `The request did not reach the wrapper: ${e.message}`; }
  res.ms = performance.now() - res.t0; res.streaming = false;
  const hist = store.get('history', []);
  hist.unshift({ key: o.key, svc: o.svc, method: o.method, name: o.name, url: req.url, status: res.status || 0, at: Date.now(), params: req.paramVals, body: req.bodyText });
  store.set('history', hist.slice(0, 40));
  const b2 = $('#exSend'); if (b2) b2.disabled = false;
  if (ex.selected === o.key) drawResponse(o);
  if (ex.mode === 'history') drawList();
}

// ---------- response ----------
function drawResponse(o) {
  const res = ex.resp[o.key];
  const box = $('#exResp');
  if (!res) { box.innerHTML = '<kai-empty empty-title="No response yet" description="Fill in the request and press Send request."></kai-empty>'; return; }
  if (res.error && !res.status) { box.innerHTML = `<kai-notice severity="error">${esc(res.error)}</kai-notice>`; return; }
  if (!res.status) { box.innerHTML = '<kai-text-shimmer text="Waiting for the first byte"></kai-text-shimmer>'; return; }
  const size = res.blob ? res.blob.size : new Blob([res.text]).size;
  box.innerHTML = `<div class="resp-head"><span class="status ${res.ok ? 'tone-ok' : 'tone-err'}">${res.status} ${esc(res.statusText || '')}</span><span class="hint">${fmtMs(res.ms)}</span><span class="hint">${size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`}</span><span class="hint mono">${esc(res.ct.split(';')[0])}</span></div>
    <kai-tabs id="respTabs" variant="underline"></kai-tabs><div class="resp-body" id="respBody"></div>`;
  const tabs = $('#respTabs');
  tabs.items = [{ id: 'body', label: 'Body' }, { id: 'headers', label: `Headers (${res.headers.length})` }, { id: 'curl', label: 'curl' }];
  tabs.value = ex.tab;
  tabs.addEventListener('kai-tab-change', (e) => { ex.tab = detailValue(e); drawResponse(o); });
  const body = $('#respBody');

  if (ex.tab === 'headers') {
    body.innerHTML = `<kai-row-group>${res.headers.map(([k, v]) => `<kai-row><span class="mono">${esc(k)}</span><span slot="subtitle" class="mono">${esc(v)}</span></kai-row>`).join('')}</kai-row-group>`;
  } else if (ex.tab === 'curl') {
    const cmd = `curl -X ${o.method.toUpperCase()} '${svcInfo(o.svc).base}${res.req.url}' \\\n  -H "Authorization: Bearer $TOKEN"` + (res.req.bodyText ? ` \\\n  -H 'Content-Type: application/json' \\\n  -d '${res.req.bodyText.replace(/'/g, "'\\''")}'` : '');
    body.innerHTML = '<kai-code-block language="bash" copy></kai-code-block>';
    $('kai-code-block', body).code = cmd;
  } else if (res.blob) {
    const href = URL.createObjectURL(res.blob);
    body.innerHTML = res.ct.startsWith('image') ? `<img src="${href}" alt="Response image" class="resp-img">` : `<a href="${href}" download>Download the ${esc(res.ct)} response</a>`;
  } else {
    let parsed; try { parsed = JSON.parse(res.text); } catch { /* not JSON */ }
    if (!res.ok && /<html/i.test(res.text)) {
      body.innerHTML = `<kai-notice severity="error">${esc(errorText(res.status, res.text))}</kai-notice><details class="raw"><summary>Show raw HTML</summary><kai-code-block language="html" copy></kai-code-block></details>`;
      $('kai-code-block', body).code = res.text;
    } else {
      body.innerHTML = `<kai-code-block language="${parsed !== undefined ? 'json' : 'text'}" copy></kai-code-block>`;
      $('kai-code-block', body).code = parsed !== undefined && !res.streaming ? JSON.stringify(parsed, null, 2) : (res.text || '(empty body)');
    }
  }
}
