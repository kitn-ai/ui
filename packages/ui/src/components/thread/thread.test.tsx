import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { createSignal } from 'solid-js';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { Thread, type ThreadController } from './thread';
import type { ThreadDensity } from '../chat/thread-density';
import type { ChatMessage } from '../../web-components/chat/chat-types';

// Spy on the imperative toast() the feedback controller raises.
const toastSpy = vi.fn();
vi.mock('../../primitives/toast-store', () => {
  const fn = Object.assign((...args: unknown[]) => toastSpy(...args), {
    success: (...args: unknown[]) => toastSpy(...args),
    dismiss: vi.fn(),
    clear: vi.fn(),
  });
  return { toast: fn };
});

// jsdom doesn't implement Element.scrollTo; the auto-scroll container calls it.
if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};

// jsdom has no clipboard; stub a writeText spy we can assert against.
const writeText = vi.fn();
Object.assign(navigator, { clipboard: { writeText } });

// jsdom has no ResizeObserver; the reasoning disclosure wires one when its
// content is visible (see response-compare.test.tsx for the same stub).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

afterEach(cleanup);

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('Thread message rendering', () => {
  const convo: ChatMessage[] = [
    { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Hello there' }] },
    { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'General Kenobi' }] },
  ];

  it('renders one row per message with its content', () => {
    const { getByText } = render(() => <Thread messages={convo} />);
    expect(getByText('Hello there')).toBeInTheDocument();
    expect(getByText('General Kenobi')).toBeInTheDocument();
  });

  it('renders an avatar rail for messages that carry an avatar', () => {
    const withAvatar: ChatMessage[] = [
      { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'hi' }], avatar: { fallback: 'AI' } },
    ];
    const { getByText } = render(() => <Thread messages={withAvatar} />);
    expect(getByText('AI')).toBeInTheDocument();
  });

  it('renders parts in order, not grouped by type', () => {
    const message: ChatMessage = {
      id: 'm1', role: 'assistant',
      parts: [
        { type: 'text', text: 'Checking.' },
        { type: 'tool', tool: { type: 'get_weather', kind: 'generic', state: 'output-available' } },
        { type: 'text', text: 'Done.' },
      ],
    };
    const { container } = render(() => <Thread messages={[message]} />);
    const text = container.textContent ?? '';
    // A grouped render (all tools, then all text concatenated) would still put
    // "Checking." before "Done." and would still contain "get_weather", so a
    // real three-way check is required to prove genuine interleaving, not just
    // grouping-by-luck.
    const iChecking = text.indexOf('Checking.');
    const iTool = text.indexOf('get_weather');
    const iDone = text.indexOf('Done.');
    expect(iChecking).toBeGreaterThanOrEqual(0);
    expect(iTool).toBeGreaterThan(iChecking);
    expect(iDone).toBeGreaterThan(iTool);
  });
});

describe('Thread empty state', () => {
  it('renders the built-in zero-state when empty and no `empty` is provided', () => {
    const { getByText } = render(() => <Thread messages={[]} />);
    expect(getByText('No messages yet')).toBeInTheDocument();
  });

  it('renders a custom `empty` node when provided and the thread is empty', () => {
    const { getByText, queryByText } = render(() => (
      <Thread messages={[]} empty={<div>Ask me anything</div>} />
    ));
    expect(getByText('Ask me anything')).toBeInTheDocument();
    expect(queryByText('No messages yet')).toBeNull();
  });

  it('hides the empty state once the thread has messages', () => {
    const { queryByText } = render(() => (
      <Thread messages={[{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }]} />
    ));
    expect(queryByText('No messages yet')).toBeNull();
  });

  it('suppresses the empty state while loading (shows a typing indicator instead)', () => {
    const { queryByText } = render(() => <Thread messages={[]} loading />);
    expect(queryByText('No messages yet')).toBeNull();
  });
});

describe('Thread message actions', () => {
  beforeEach(() => {
    toastSpy.mockClear();
    writeText.mockClear();
  });

  const assistant = (text: string): ChatMessage => ({
    id: 'a1', role: 'assistant', parts: [{ type: 'text', text }], actions: ['copy', 'like', 'dislike'],
  });

  it('fires onMessageAction with { messageId, action:"copy" } and copies content', () => {
    const onMessageAction = vi.fn();
    const { getByLabelText } = render(() => (
      <Thread messages={[assistant('Copy me')]} onMessageAction={onMessageAction} />
    ));
    fireEvent.click(getByLabelText('Copy'));
    expect(writeText).toHaveBeenCalledWith('Copy me');
    expect(onMessageAction).toHaveBeenLastCalledWith({ messageId: 'a1', action: 'copy' });
  });

  it('emits state:"on" on a set vote and state:"off" on the un-vote re-tap', async () => {
    const onMessageAction = vi.fn();
    const { getByLabelText } = render(() => (
      <Thread messages={[assistant('Hi')]} onMessageAction={onMessageAction} />
    ));
    fireEvent.click(getByLabelText('Like'));
    expect(onMessageAction).toHaveBeenLastCalledWith({ messageId: 'a1', action: 'like', state: 'on' });
    await tick();
    fireEvent.click(getByLabelText('Like'));
    expect(onMessageAction).toHaveBeenLastCalledWith({ messageId: 'a1', action: 'like', state: 'off' });
  });
});

describe('Thread stick-to-bottom', () => {
  it('exposes scrollToBottom via controllerRef and scrolls the viewport', () => {
    const scrollTo = vi.fn();
    (Element.prototype as unknown as { scrollTo: typeof scrollTo }).scrollTo = scrollTo;
    let controller: ThreadController | undefined;
    const { container } = render(() => (
      <Thread messages={[{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }]} controllerRef={(c) => (controller = c)} />
    ));
    const viewport = container.querySelector('.overflow-y-auto') as HTMLElement;
    // Give the viewport a scrollHeight the jsdom layout won't.
    Object.defineProperty(viewport, 'scrollHeight', { value: 999, configurable: true });
    scrollTo.mockClear();

    controller?.scrollToBottom('auto');
    expect(scrollTo).toHaveBeenCalledWith({ top: 999, behavior: 'auto' });
  });

  it('auto-scrolls to the bottom when handed a new messages array (a stream chunk)', async () => {
    // Run the useStickToBottom rAF synchronously so onNewContent scrolls now.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0; });
    const scrollTo = vi.fn();
    (Element.prototype as unknown as { scrollTo: typeof scrollTo }).scrollTo = scrollTo;

    const base: ChatMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Stream please' }] }];
    const [messages, setMessages] = createSignal<ChatMessage[]>(base);
    render(() => <Thread messages={messages()} />);

    scrollTo.mockClear();
    // A NEW array reference with an appended assistant turn — as a stream chunk.
    setMessages([...base, { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'streaming...' }] }]);
    await tick();

    expect(scrollTo).toHaveBeenCalled();
    // Sticks to the bottom instantly (not the smooth user-initiated scroll).
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'instant' }));
    vi.unstubAllGlobals();
  });
});

describe('Thread reasoning parts', () => {
  it('renders the activity line for a reasoning part with text', () => {
    const messages: ChatMessage[] = [
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'Weighing the options.', label: 'Thinking', index: 0 },
          { type: 'text', text: 'Done.' },
        ],
      },
    ];
    const { container } = render(() => <Thread messages={messages} />);
    expect(container.querySelector('[data-kai-activity]')!.textContent).toContain('Thought');
  });

  it('renders NOTHING for a reasoning part with empty text', () => {
    // Anthropic's redacted_thinking blocks and the block assembled at
    // content_block_stop both arrive with no readable text and a `raw` payload
    // the encoder has to echo back verbatim. They must stay in `parts` and must
    // NOT produce a blank disclosure.
    const messages: ChatMessage[] = [
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          {
            type: 'reasoning',
            text: '',
            label: 'Thinking',
            index: 0,
            raw: { source: 'anthropic.content_block', payload: { type: 'redacted_thinking', data: 'EroBCk...' } },
          },
          { type: 'text', text: 'Done.' },
        ],
      },
    ];
    const { container } = render(() => <Thread messages={messages} />);
    const text = container.textContent ?? '';
    expect(container.querySelector('[data-kai-activity]')).toBeNull();
    expect(text).toContain('Done.');
  });

  it('keeps a later non-empty reasoning block visible alongside an empty one', () => {
    const messages: ChatMessage[] = [
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: '', label: 'Thinking', index: 0 },
          { type: 'reasoning', text: 'Second block.', label: 'Thinking', index: 1 },
        ],
      },
    ];
    const { container } = render(() => <Thread messages={messages} />);
    // Only the second block is a step: the empty one is a carrier and never a row.
    fireEvent.click(container.querySelector('[data-kai-activity] > button')!);
    expect(container.querySelectorAll('li[data-kai-step]')).toHaveLength(1);
    fireEvent.click(container.querySelector('[data-kai-step-trigger]')!);
    expect(container.textContent ?? '').toContain('Second block.');
  });
});

describe('Thread scroll overlay', () => {
  // The wrapper that places the scroll button spans the whole message band, so it must be
  // pointer-inert and the button must ask for the pointer back. jsdom cannot hit-test, so
  // this CLASS PAIR is the entire contract it can see; the wheel, drag-selection and click
  // behaviour is measured in `scripts/probe-scroll-overlay.mjs`. Pinned here because the
  // wrapper's half reads as redundant styling and is the half a later reader deletes —
  // which is precisely how the strip came to swallow the pointer over the messages.
  const scrolledUp = (container: HTMLElement) => {
    const log = container.querySelector('[role="log"]') as HTMLElement;
    // The scrolled-up state the primitive reads off real layout, faked the way
    // `scroll-button-label.test.tsx` fakes it.
    Object.defineProperty(log, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(log, 'clientHeight', { value: 400, configurable: true });
    log.scrollTop = 0;
    log.dispatchEvent(new Event('scroll'));
    return log;
  };

  it('makes the band a hole for the pointer, and gives the pointer back to the button', () => {
    const { container } = render(() => <Thread messages={[{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }]} />);
    const log = scrolledUp(container);
    const button = log.querySelector('button[aria-label="Scroll to bottom"]') as HTMLElement;
    const wrapper = button.parentElement as HTMLElement;

    expect(button.className).toContain('pointer-events-auto');
    expect(wrapper.className).toContain('pointer-events-none');
    // The pair only means anything on the box that actually spans the band.
    expect(wrapper.className).toContain('absolute');
  });
});

// The `<kai-thread>` facade's axis, on the component that element renders. The
// element's own pass-through is pinned in
// `src/web-components/thread/thread-density.declarative.test.tsx`.
describe('Thread density axis', () => {
  const log = (c: HTMLElement) => c.querySelector('[role="log"]') as HTMLElement;
  const content = (c: HTMLElement) => log(c).firstElementChild as HTMLElement;

  it('renders the shipped box with no `density` given, and for an explicit `default`', () => {
    const unset = render(() => <Thread messages={[]} />).container;
    const explicit = render(() => <Thread messages={[]} density="default" />).container;
    for (const c of [unset, explicit]) {
      expect(log(c).getAttribute('class')).toBe('flex flex-col overflow-y-auto kai-focus-inset h-full px-4 py-3');
      // `min-h-full` is the empty state's room to centre in: this column is the scroller's
      // only child, and at content height it left the empty surface resolved to its own
      // content and sitting at the top.
      expect(content(c).getAttribute('class')).toBe('flex flex-col mx-auto w-full max-w-3xl min-h-full space-y-4');
    }
  });

  it("renders the tighter band and between-turn gap for `'compact'`", () => {
    const { container } = render(() => <Thread messages={[]} density="compact" />);
    expect(log(container).getAttribute('class')).toBe('flex flex-col overflow-y-auto kai-focus-inset h-full px-3 py-2');
    expect(content(container).getAttribute('class')).toBe('flex flex-col mx-auto w-full max-w-3xl min-h-full space-y-2');
  });

  it('hands its RESOLVED density down to every row, so the avatar gap follows the thread', () => {
    // The row gap is the one message internal this axis owns (see `thread-density.ts`):
    // a compact thread whose rows still held their avatar 12px off is the defect this
    // closes. The row is the `part="row"` node, which is the same node the standalone
    // `<Message>` renders, so `gap-3` here is byte-for-byte the shipped attribute.
    const convo: ChatMessage[] = [
      { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'hi' }], avatar: { fallback: 'AI' } },
    ];
    const rowClasses = (c: HTMLElement) => [...c.querySelectorAll('[part="row"]')].map((r) => r.getAttribute('class'));
    expect(rowClasses(render(() => <Thread messages={convo} />).container)).toEqual(['flex items-start gap-3']);
    expect(rowClasses(render(() => <Thread messages={convo} density="compact" />).container)).toEqual(['flex items-start gap-0']);
  });

  it('falls back to `default` and says so for an unknown value arriving as a string', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(() => <Thread messages={[]} density={'cosy' as unknown as ThreadDensity} />);
    expect(log(container).getAttribute('class')).toBe('flex flex-col overflow-y-auto kai-focus-inset h-full px-4 py-3');
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain('Thread');
    error.mockRestore();
  });
});
