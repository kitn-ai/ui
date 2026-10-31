// Chat: one composed thread (<kai-conversations> | <kai-thread> + <kai-prompt-input>) over five backends.
import { appendMessage, createAssistantStream, onStreamSettled } from '@kitn.ai/ui/state';
import { readOpenAIStream } from '@kitn.ai/ui/wire';
import { $, store, get, svcFetch, errorText, newId, toast } from './lib.js';

const TARGETS = [
  { id: 'kiro', svc: 'kiro', name: 'Kiro agent', desc: 'Streams from kiro-cli through the gateway.' },
  { id: 'kiro-raw', svc: 'kiro', name: 'Kiro agent, one turn', desc: 'One ACP turn with its thoughts and tool calls.' },
  { id: 'litellm', svc: 'litellm', name: 'LiteLLM model', desc: 'Any model on the proxy.' },
  { id: 'fleet', svc: 'fleet', name: 'Local fleet role', desc: 'A model on this Mac, chosen by role.' },
  { id: 'opencode', svc: 'kiro', name: 'OpenCode', desc: 'OpenCode behind the Kiro gateway.' },
];

// Conversations persist in this browser: { id, title, target, model, messages, updatedAt }.
const chat = {
  convs: store.get('chat.convs', []),
  activeId: store.get('chat.active', ''),
  loading: false,
  abort: null,
  options: { models: [], agents: [], roles: [] },
};
const active = () => chat.convs.find((c) => c.id === chat.activeId);
const save = () => { store.set('chat.convs', chat.convs.slice(0, 50).map((c) => ({ ...c, messages: c.messages.slice(-100) }))); store.set('chat.active', chat.activeId); };

function newConv(target = active()?.target || 'kiro') {
  const c = { id: newId(), title: 'New conversation', target, model: '', agent: '', effort: '', messages: [], updatedAt: new Date().toISOString() };
  chat.convs.unshift(c); chat.activeId = c.id; save();
  return c;
}

let els = null;

export function renderChat(view) {
  if (!active()) newConv();
  view.innerHTML = `<div class="chat"><kai-resizable orientation="horizontal" theme="auto">
    <kai-resizable-item size="280px" min="220px" max="420px"><aside class="chat-side"><kai-conversations id="cList" theme="auto" searchable></kai-conversations></aside></kai-resizable-item>
    <kai-resizable-item><section class="chat-main" aria-label="Conversation">
      <header class="chat-bar">
        <kai-select id="cTarget" label="Send to"></kai-select>
        <div class="chat-model"><span class="hint" id="cModelLabel">Model</span><kai-model-switcher id="cModel" theme="auto"></kai-model-switcher></div>
        <kai-select id="cAgent" label="Agent"></kai-select>
        <kai-segmented id="cEffort" size="sm"></kai-segmented>
      </header>
      <kai-thread id="cThread" theme="auto" class="chat-thread" scroll-button></kai-thread>
      <div class="chat-composer"><kai-thinking-bar id="cThinking" stoppable hidden></kai-thinking-bar><kai-prompt-input id="cInput" theme="auto"></kai-prompt-input>
        <p class="hint">Type <kai-kbd keys="@" size="sm"></kai-kbd> to pick a Kiro agent. <span id="cDesc"></span></p></div>
    </section></kai-resizable-item></kai-resizable></div>`;
  els = { list: $('#cList'), target: $('#cTarget'), model: $('#cModel'), agent: $('#cAgent'), effort: $('#cEffort'), thread: $('#cThread'), input: $('#cInput'), thinking: $('#cThinking') };

  els.list.groups = [];
  els.target.options = TARGETS.map((t) => ({ value: t.id, label: t.name }));
  els.effort.options = [{ value: '', label: 'Default' }, ...['low', 'medium', 'high', 'max'].map((e) => ({ value: e, label: e[0].toUpperCase() + e.slice(1) }))];
  els.input.stoppable = true;
  els.thinking.stoppable = true;

  els.list.addEventListener('kai-conversation-select', (e) => { chat.activeId = e.detail.id; save(); syncAll(); });
  els.list.addEventListener('kai-new-chat', () => { newConv(); syncAll(); });
  els.target.addEventListener('kai-change', (e) => { const c = active(); c.target = e.detail.value; c.model = ''; save(); syncAll(); });
  els.model.addEventListener('kai-model-change', (e) => { const c = active(); c.model = e.detail.modelId ?? e.detail.id ?? e.detail.value ?? e.detail; save(); syncBar(); });
  els.agent.addEventListener('kai-change', (e) => { active().agent = e.detail.value; save(); });
  els.effort.addEventListener('kai-change', (e) => { active().effort = e.detail.value; save(); });
  els.input.addEventListener('kai-submit', (e) => {
    const agentPill = (e.detail.doc || []).find((x) => x.type === 'entity' && x.entity.kind === 'agent');
    if (agentPill) { active().agent = agentPill.entity.id; save(); }
    els.input.clear?.();
    void send(e.detail.value);
  });
  els.input.addEventListener('kai-suggestion-click', (e) => void send(e.detail.value));
  const stop = () => chat.abort?.abort();
  els.input.addEventListener('kai-stop', stop);
  els.thinking.addEventListener('kai-stop', stop);
  syncAll();
}

async function syncAll() {
  // Drop the previous target's models first, so a default is never picked from the wrong list.
  if (optionsFor !== active().target) chat.options = { models: [], agents: [] };
  syncList(); syncThread(); syncBar();
  await loadOptions();
  syncBar();
}

function syncList() {
  els.list.conversations = chat.convs.map((c) => ({ id: c.id, title: c.title, messageCount: c.messages.length, updatedAt: c.updatedAt, trailing: TARGETS.find((t) => t.id === c.target)?.name }));
  els.list.activeId = chat.activeId;
}

let lastMsgs = null; let baked = [];
function syncThread() {
  const c = active();
  if (c.messages !== lastMsgs) { lastMsgs = c.messages; baked = c.messages.map((m) => (m.role === 'assistant' ? { ...m, actions: ['copy'] } : m)); }
  els.thread.messages = baked;
  els.thread.loading = chat.loading;
  els.input.loading = chat.loading;
  els.input.suggestions = c.messages.length ? [] : ['What can you do?', 'Summarise the fleet status in one line', 'Write a haiku about gateways'];
}

function syncBar() {
  const c = active(); const t = TARGETS.find((x) => x.id === c.target);
  els.target.value = c.target;
  const kiroish = c.target === 'kiro' || c.target === 'kiro-raw';
  els.agent.hidden = !kiroish; els.effort.hidden = !kiroish;
  els.agent.value = c.agent || ''; els.effort.value = c.effort || '';
  $('#cModelLabel').textContent = c.target === 'fleet' ? 'Role' : 'Model';
  els.model.models = chat.options.models;
  if (chat.options.models.length && !chat.options.models.some((m) => m.id === c.model)) { c.model = chat.options.models[0].id; save(); }
  els.model.currentModel = c.model;
  els.input.setAttribute('placeholder', `Message ${t.name}${c.model ? ` (${c.model})` : ''}`);
  $('#cDesc').textContent = t.desc;
  els.input.triggers = kiroish && chat.options.agents.length ? [{ char: '@', kind: 'agent', items: chat.options.agents.map((a) => ({ id: a, label: a, group: 'Kiro agents' })) }] : [];
}

let optionsFor = '';
async function loadOptions() {
  const c = active();
  if (optionsFor === c.target) return;
  optionsFor = c.target;
  chat.options = { models: [], agents: [] };
  if (c.target === 'fleet') {
    const r = await get('fleet', '/fleet/roles');
    chat.options.models = r.ok ? Object.entries(r.data.roles || {}).filter(([, v]) => v.available).map(([k, v]) => ({ id: k, name: k.replace(/_/g, ' '), description: `${v.model} on ${v.runtime}` })) : [];
  } else {
    const svc = c.target === 'litellm' ? 'litellm' : 'kiro';
    const r = await get(svc, c.target === 'opencode' ? '/api/opencode/models' : '/v1/models');
    const list = r.ok ? (r.data.data || r.data.models || (Array.isArray(r.data) ? r.data : [])) : [];
    chat.options.models = list.map((m) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean).slice(0, 400)
      .map((id) => ({ id, name: id, group: id.includes('/') ? id.split('/')[0] : undefined }));
    if (!r.ok) toast(`Model list unavailable: ${r.error}`, 'warning');
  }
  if (c.target === 'kiro' || c.target === 'kiro-raw') {
    const a = await get('kiro', '/api/kiro/agents');
    chat.options.agents = a.ok ? (a.data.agents || []).map((x) => x.name || x) : [];
    els.agent.options = [{ value: '', label: 'Default agent' }, ...chat.options.agents.map((n) => ({ value: n, label: n }))];
  }
}

// The thread's message array is replaced on every update so <kai-thread> re-renders.
function setMessages(updater) {
  const c = active(); c.messages = updater(c.messages); c.updatedAt = new Date().toISOString();
  syncThread();
}

async function send(raw) {
  const text = String(raw || '').trim();
  const c = active();
  if (!text || chat.loading) return;
  if (!c.messages.length) { c.title = text.slice(0, 60); }
  setMessages((prev) => appendMessage(prev, { id: newId(), role: 'user', parts: [{ type: 'text', text }] }));
  syncList();
  const history = c.messages.map((m) => ({ role: m.role, content: m.parts.filter((p) => p.type === 'text').map((p) => p.text).join('') }));

  chat.loading = true; chat.abort = new AbortController();
  els.thinking.hidden = false; els.thinking.text = `Waiting for ${TARGETS.find((t) => t.id === c.target).name}`;
  const stream = onStreamSettled(createAssistantStream(setMessages), () => {
    chat.loading = false; chat.abort = null; els.thinking.hidden = true; save(); syncThread(); syncList();
  });
  const firstByte = () => { els.thinking.hidden = true; };
  const extra = { ...(c.agent && { agent: c.agent }), ...(c.effort && { effort: c.effort }) };
  const req = {
    kiro: ['kiro', '/v1/chat/completions', { model: c.model || 'auto', backend: 'kiro', messages: history, stream: true, ...extra }],
    'kiro-raw': ['kiro', '/api/kiro/chat/raw', { model: c.model || 'auto', messages: history, ...extra }],
    opencode: ['kiro', '/api/opencode/chat', { model: c.model || 'opencode/auto', messages: history, stream: false }],
    litellm: ['litellm', '/v1/chat/completions', { model: c.model, messages: history, stream: true }],
    fleet: ['fleet', '/fleet/route', { role: c.model, messages: history, max_tokens: 1024 }],
  }[c.target];

  try {
    const r = await svcFetch(req[0], req[1], { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req[2]), signal: chat.abort.signal });
    firstByte();
    if (!r.ok) throw new Error(errorText(r.status, await r.text()));
    if ((r.headers.get('content-type') || '').includes('event-stream')) {
      await readOpenAIStream(r, stream);
    } else {
      const raw2 = await r.text(); let d; try { d = JSON.parse(raw2); } catch { d = raw2; }
      if (Array.isArray(d?.events)) foldAcp(d.events, stream);
      else stream.appendText(replyText(d) || '_The model returned an empty reply._');
      if (d?.runtime) stream.appendText(`\n\n_Served by ${d.model} on ${d.runtime}._`);
    }
    stream.done();
  } catch (e) {
    firstByte();
    if (e.name === 'AbortError') { stream.appendText('\n\n_Stopped._'); stream.done(); return; }
    const msg = `${e.message}${/^502/.test(e.message) ? '. The service behind the gateway did not answer.' : ''}`;
    stream.appendText(`> **Request failed:** ${msg}`);
    stream.done();
    toast('Request failed', 'error', msg);
  }
}

function replyText(d) {
  if (typeof d === 'string') return d;
  return d?.choices?.[0]?.message?.content ?? d?.choices?.[0]?.text ?? d?.content ?? d?.response ?? d?.text ?? d?.output ?? d?.message?.content ?? '```json\n' + JSON.stringify(d, null, 2) + '\n```';
}

// Kiro's raw endpoint returns ACP session updates: thoughts, tool calls, and message chunks.
function foldAcp(events, stream) {
  let any = false;
  for (const e of events) {
    const u = e.data?.update;
    if (!u) continue;
    if (u.sessionUpdate === 'agent_thought_chunk' && u.content?.text) stream.appendReasoning(u.content.text);
    else if (u.sessionUpdate === 'agent_message_chunk' && u.content?.text) { stream.appendText(u.content.text); any = true; }
    else if (u.sessionUpdate === 'tool_call' || u.sessionUpdate === 'tool_call_update') {
      const st = u.status === 'completed' ? 'output-available' : u.status === 'failed' ? 'output-error' : 'input-available';
      const out = u.rawOutput ?? (u.content ? { content: u.content } : undefined);
      stream.upsertTool(u.toolCallId, {
        ...(u.title || u.kind ? { type: u.title || u.kind } : {}),
        state: st,
        ...(u.rawInput ? { input: typeof u.rawInput === 'object' ? u.rawInput : { input: u.rawInput } } : {}),
        ...(out ? { output: typeof out === 'object' ? out : { output: out } } : {}),
      });
    }
  }
  if (!any) stream.appendText('_The agent finished without a text reply._');
}

