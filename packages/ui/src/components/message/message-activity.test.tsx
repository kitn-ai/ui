import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { createSignal } from 'solid-js';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { MessageBody } from './message';
import type { MessagePart } from '../../web-components/chat/chat-types';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const tool = (name: string, id: string, extra: Record<string, unknown> = {}): MessagePart => ({
  type: 'tool',
  tool: { type: name, toolCallId: id, state: 'output-available', input: { q: 1 }, output: { ok: true }, ...extra } as never,
});
const think = (text = 'Let me look.'): MessagePart => ({ type: 'reasoning', text });
const say = (text: string): MessagePart => ({ type: 'text', text });

const lines = (c: HTMLElement) => [...c.querySelectorAll('[data-kai-activity]')] as HTMLElement[];
const body = (parts: MessagePart[], extra: Record<string, unknown> = {}) =>
  render(() => <MessageBody parts={parts} isUser={false} markdown {...(extra as object)} />);

describe('MessageBody renders reasoning and tool runs as the activity line', () => {
  it('interleaved parts give one line per run, in part order, and no bold tool panel', () => {
    const parts = [think(), tool('web_search', 'c1'), say('Found it.'), tool('read_file', 'c2'), say('Done.')];
    const { container } = body(parts);
    // [think + web_search] and [read_file]: the text between splits the runs
    expect(lines(container)).toHaveLength(2);
    const text = container.textContent ?? '';
    expect(text.indexOf('Thought')).toBeLessThan(text.indexOf('Found it.'));
    expect(text.indexOf('Found it.')).toBeLessThan(text.indexOf('Read 1 page'.slice(0, 4)));
    expect(text.indexOf('Read')).toBeLessThan(text.indexOf('Done.'));
    // the old panel: a Tool root, which carried the raw tool name as a bold trigger
    expect(container.querySelector('[data-tool], [data-kai-tool]')).toBeNull();
    expect(container.textContent).not.toContain('web_search');
  });

  it('consecutive reasoning and tool parts are ONE line', () => {
    const { container } = body([think(), tool('web_search', 'c1'), tool('read_file', 'c2')]);
    expect(lines(container)).toHaveLength(1);
  });

  it('a turn with ONLY tool parts still renders the line, not an empty body', () => {
    const { container } = body([tool('web_search', 'c1')]);
    expect(lines(container)).toHaveLength(1);
    expect(lines(container)[0]!.textContent).toContain('Searched the web');
  });

  it('never changes the order or content of the parts array', () => {
    const parts = [think(), tool('web_search', 'c1'), say('x')];
    const snapshot = JSON.stringify(parts);
    body(parts);
    expect(JSON.stringify(parts)).toBe(snapshot);
  });

  it("reasoning='off' hides reasoning steps and keeps tool steps", () => {
    const { container } = body([think(), tool('web_search', 'c1')], { reasoningMode: 'off' });
    expect(lines(container)).toHaveLength(1);
    expect(lines(container)[0]!.textContent).not.toContain('Thought');
    expect(lines(container)[0]!.textContent).toContain('Searched');
  });

  it("reasoning='off' with reasoning only renders no line", () => {
    const { container } = body([think(), say('hi')], { reasoningMode: 'off' });
    expect(lines(container)).toHaveLength(0);
    expect(container.textContent).toContain('hi');
  });

  it("reasoning='compact' is the line with no disclosure", () => {
    const { container } = body([think(), tool('web_search', 'c1')], { reasoningMode: 'compact' });
    expect(container.querySelector('[data-kai-activity-summary]')).toBeTruthy();
    expect(container.querySelector('[data-kai-activity] > button')).toBeNull();
  });

  it('a redacted (empty-text) reasoning part is not a "Thought" step', () => {
    const { container } = body([think(''), say('hi')]);
    expect(lines(container)).toHaveLength(0);
  });

  it('kai_ask renders nothing here (the question panel owns it) and does not split a run', () => {
    const { container } = body([tool('web_search', 'c1'), tool('kai_ask', 'a1'), tool('read_file', 'c2')]);
    expect(lines(container)).toHaveLength(1);
    expect(container.textContent).not.toContain('kai_ask');
    const only = body([tool('kai_ask', 'a1')]);
    expect(lines(only.container)).toHaveLength(0);
  });

  it('kai_plan is one ordinary step labelled "Updated the plan"', () => {
    const { container } = body([tool('kai_plan', 'p1', { input: { items: [] } })]);
    expect(lines(container)[0]!.textContent).toContain('Updated the plan');
  });

  it('a streaming tool shows the live step, and the same line settles after', () => {
    const [streaming, setStreaming] = createSignal(true);
    const running = [tool('web_search', 'c1', { state: 'input-available', output: undefined })];
    const { container } = render(() => <MessageBody parts={running} isUser={false} markdown isStreaming={streaming()} />);
    expect(lines(container)[0]!.textContent).toContain('Searching the web');
    expect(lines(container)[0]!.hasAttribute('data-kai-streaming')).toBe(true);
    setStreaming(false);
    expect(lines(container)[0]!.hasAttribute('data-kai-streaming')).toBe(false);
  });

  it('a step opened by the reader stays open across the next delta', () => {
    const [parts, setParts] = createSignal<MessagePart[]>([tool('web_search', 'c1'), say('a')]);
    const { container } = render(() => <MessageBody parts={parts()} isUser={false} markdown />);
    fireEvent.click(container.querySelector('[data-kai-activity] > button')!);
    expect(container.querySelector('[data-kai-activity] > button')).toHaveAttribute('aria-expanded', 'true');
    setParts([tool('web_search', 'c1'), say('ab')]);
    expect(container.querySelector('[data-kai-activity] > button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('hostile tool names and reasoning stay inert, visible text', () => {
    const evil = '<img src=x onerror="window.__pwn=1">';
    const { container } = body([think(evil), tool(evil, 'c1')]);
    expect(container.querySelector('img')).toBeNull();
    fireEvent.click(container.querySelector('[data-kai-activity] > button')!);
    expect(container.querySelector('img')).toBeNull();
    expect((window as unknown as { __pwn?: number }).__pwn).toBeUndefined();
    expect(container.textContent).toContain('<img');
  });

  it('an unknown part type gets a visible fallback, not nothing', () => {
    const { container } = body([{ type: 'hologram' } as unknown as MessagePart]);
    expect(container.textContent).toContain('hologram');
  });
});

describe('renderers', () => {
  const defineOnce = (tag: string) => {
    if (!customElements.get(tag)) {
      customElements.define(tag, class extends HTMLElement {
        private _part: unknown;
        set messagePart(v: unknown) { this._part = v; this.textContent = `part:${JSON.stringify(v)}`; }
        get messagePart() { return this._part; }
      });
    }
  };

  it('text: renders the consumer element with the part as a property', async () => {
    defineOnce('my-text-b3');
    const { container } = body([say('hello'), tool('web_search', 'c1')], { renderers: { text: 'my-text-b3' } });
    const el = container.querySelector('my-text-b3') as (HTMLElement & { messagePart: unknown }) | null;
    expect(el).toBeTruthy();
    expect(el!.messagePart).toEqual({ type: 'text', text: 'hello' });
    expect(lines(container)).toHaveLength(1);
  });

  it('tool:<name> replaces only that step, the rest stay built in', () => {
    if (!customElements.get('my-step-b3')) {
      customElements.define('my-step-b3', class extends HTMLElement {
        set step(v: { toolName?: string }) { this.textContent = `custom:${v.toolName}`; }
      });
    }
    const { container } = body([tool('web_search', 'c1'), tool('read_file', 'c2')], {
      renderers: { 'tool:web_search': 'my-step-b3' },
    });
    fireEvent.click(container.querySelector('[data-kai-activity] > button')!);
    const steps = [...container.querySelectorAll('li[data-kai-step]')];
    expect(steps).toHaveLength(2);
    expect(steps[0]!.querySelector('my-step-b3')!.textContent).toBe('custom:web_search');
    expect(steps[1]!.querySelector('my-step-b3')).toBeNull();
  });

  it('source and file runs get the run as `parts`', () => {
    if (!customElements.get('my-src-b3')) {
      customElements.define('my-src-b3', class extends HTMLElement {
        set parts(v: unknown[]) { this.textContent = `n=${v.length}`; }
      });
    }
    const { container } = body(
      [{ type: 'source', source: { url: 'https://a.test' } }, { type: 'source', source: { url: 'https://b.test' } }],
      { renderers: { source: 'my-src-b3' } },
    );
    expect(container.querySelector('my-src-b3')!.textContent).toBe('n=2');
  });

  it('a card:* key warns once and is ignored', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parts: MessagePart[] = [say('x')];
    body(parts, { renderers: { 'card:weather': 'my-card-b3' } });
    body(parts, { renderers: { 'card:weather': 'my-card-b3' } });
    const hits = warn.mock.calls.filter((c) => String(c[0]).includes('card:weather'));
    expect(hits).toHaveLength(1);
    expect(String(hits[0]![0])).toContain('cardTypes');
  });

  it('an invalid tag falls back to the built-in rendering', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = body([say('still here')], { renderers: { text: 'nothyphen' } });
    expect(container.textContent).toContain('still here');
  });
});
