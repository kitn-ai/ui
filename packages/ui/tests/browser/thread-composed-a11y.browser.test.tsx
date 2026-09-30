import { describe, expect, it, afterEach } from 'vitest';
import { cdp } from 'vitest/browser';
import '../../src/web-components/thread/thread';
import '../../src/web-components/message/message';
import '../../src/web-components/markdown/markdown';

/**
 * The accessibility tree of an app-rendered thread, against the same thread built from
 * `messages`, read from real Chromium (`Accessibility.getFullAXTree`).
 *
 * The claim is that composing changes WHO renders the rows and nothing a screen reader
 * sees: the same log region with the same live-region properties, the same speaker-named
 * articles in the same order with the same text, and the same announcement when a row
 * arrives. jsdom has no accessibility tree; this is the only place it can be asserted.
 */
afterEach(() => document.body.replaceChildren());

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
type FrameTree = { frame: { id: string }; childFrames?: FrameTree[] };
type AXNode = { nodeId: string; ignored?: boolean; role?: { value: string }; name?: { value: string }; childIds?: string[]; properties?: { name: string; value: { value: unknown } }[] };

const CONVERSATION = [
  { role: 'user', text: 'What is Solid?' },
  { role: 'assistant', text: 'A reactive UI library.' },
  { role: 'user', text: 'Show me a signal.' },
];

async function tree(mount: () => HTMLElement) {
  const el = mount();
  document.body.append(el);
  await customElements.whenDefined('kai-thread');
  await wait(300);
  return { el, ...(await snapshot(el)) };
}

/** The non-ignored (role, name) pairs of the thread's log subtree, depth-first, plus the log's live properties. */
async function snapshot(host: HTMLElement) {
  const c = cdp();
  await c.send('Accessibility.enable');
  // vitest runs the test inside an iframe, and the AX tree is per FRAME: ask each frame and
  // take the one that holds the thread's log region.
  await c.send('Page.enable');
  const { frameTree } = (await c.send('Page.getFrameTree')) as { frameTree: FrameTree };
  const frames: string[] = [];
  const collect = (t: FrameTree) => { frames.push(t.frame.id); t.childFrames?.forEach(collect); };
  collect(frameTree);
  let nodes: AXNode[] = [];
  for (const frameId of frames) {
    const r = (await c.send('Accessibility.getFullAXTree', { frameId })) as { nodes: AXNode[] };
    if (r.nodes.some((n) => !n.ignored && n.role?.value === 'log')) { nodes = r.nodes; break; }
  }
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const log = nodes.find((n) => !n.ignored && n.role?.value === 'log');
  if (!log) throw new Error('no log region in the accessibility tree');
  const out: string[] = [];
  const walk = (n: AXNode, depth: number) => {
    if (!n.ignored && n.role?.value !== 'none' && n.role?.value !== 'generic' && n.role?.value !== 'InlineTextBox') {
      const name = n.name?.value ? ` "${n.name.value}"` : '';
      out.push(`${'  '.repeat(depth)}${n.role?.value}${name}`);
      depth++;
    }
    for (const id of n.childIds ?? []) walk(byId.get(id)!, depth);
  };
  walk(log, 0);
  const live = Object.fromEntries(
    (log.properties ?? []).filter((p) => /^(live|atomic|relevant|busy)$/.test(p.name)).map((p) => [p.name, p.value.value]),
  );
  void host;
  return { outline: out, live, name: log.name?.value ?? '' };
}

const data = () => {
  const t = document.createElement('kai-thread') as HTMLElement & { messages: unknown };
  t.style.cssText = 'display:block;height:320px;width:520px';
  t.messages = CONVERSATION.map((m, i) => ({ id: `m${i}`, role: m.role, parts: [{ type: 'text', text: m.text }] }));
  return t;
};
const composed = () => {
  const t = document.createElement('kai-thread');
  t.style.cssText = 'display:block;height:320px;width:520px';
  // The preset renders a user turn as plain text and an assistant turn as markdown; the app
  // making the same choice per row is what makes the trees comparable.
  t.innerHTML = CONVERSATION.map((m) =>
    `<kai-message role="${m.role}">${m.role === 'user' ? `<span>${m.text}</span>` : `<kai-markdown content="${m.text}"></kai-markdown>`}</kai-message>`).join(''); // test-authored markup, not model output
  return t;
};

describe('composed kai-thread accessibility tree, in real Chromium', () => {
  it('has the same log region, live-region properties, speaker-named articles and text as data mode', async () => {
    const a = await tree(data);
    a.el.remove();
    const b = await tree(composed);
    // Sanity: the data-mode tree really contains what this test claims to compare.
    expect(a.outline.join('\n')).toContain('article "User message"');
    expect(a.outline.join('\n')).toContain('article "Assistant message"');
    expect(a.outline.join('\n')).toContain('Show me a signal.');
    expect(b.live).toEqual(a.live);
    expect(b.name).toBe(a.name);
    expect(b.outline).toEqual(a.outline);
  });

  it('announces a row the app appends the same way data mode announces a new message', async () => {
    const dataEl = data();
    document.body.append(dataEl);
    await wait(300);
    const before = await snapshot(dataEl);
    dataEl.messages = [...(dataEl.messages as unknown[]), { id: 'm9', role: 'assistant', parts: [{ type: 'text', text: 'Brand new reply.' }] }];
    await wait(300);
    const dataAfter = await snapshot(dataEl);
    dataEl.remove();

    const comp = composed();
    document.body.append(comp);
    await wait(300);
    const compBefore = await snapshot(comp);
    const m = document.createElement('kai-message');
    (m as unknown as { role: string }).role = 'assistant';
    m.innerHTML = '<kai-markdown content="Brand new reply."></kai-markdown>';
    comp.append(m);
    await wait(300);
    const compAfter = await snapshot(comp);

    // The arrival is the same delta inside the same live region in both shapes...
    const delta = (x: string[], y: string[]) => y.slice(x.length);
    expect(compAfter.live).toEqual(dataAfter.live);
    expect(compAfter.live.live).toBe('polite');
    expect(compBefore.outline).toEqual(before.outline);
    expect(compAfter.outline).toEqual(dataAfter.outline);
    expect(delta(compBefore.outline, compAfter.outline).join('\n')).toContain('Brand new reply.');
  });
});
