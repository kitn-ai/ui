import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import './register'; // side effect: registers <kai-prompt-input> et al.

// SPIKE: feasibility demo for the slotted-shell composition model on
// <kai-prompt-input>. Every seam is filled with PLAIN DOM (no kai-* inside the
// slots) and inline-styled, to prove: (1) light-DOM content projects through the
// Solid-rendered shadow slots, and (2) shadow-DOM style encapsulation does NOT
// reach slotted content — the consumer's own markup and CSS win.

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-prompt-input': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const meta = {
  title: 'Spikes/Prompt Input Seams',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

// ── 1. SEAMS — notice banner + toolbar-start + button projected in. ───────────
export const Seams: Story = {
  render: () => (
    <kai-prompt-input style={{ display: 'block' }}>
      <div
        slot="notice"
        style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:#fef3c7;border-bottom:1px solid #fcd34d;font:13px/1.4 system-ui;color:#92400e"
      >
        <span>
          Model X is unavailable.{' '}
          <a href="#" style="color:#b45309;font-weight:600">Learn more</a>
        </span>
        <button
          type="button"
          aria-label="Dismiss"
          style="border:0;background:transparent;cursor:pointer;font-size:16px;color:#92400e;line-height:1;padding:0 2px"
        >
          ✕
        </button>
      </div>
      <button
        slot="toolbar-start"
        type="button"
        style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid #d4d4d8;border-radius:9999px;background:#fff;cursor:pointer;font-size:16px;flex-shrink:0"
        aria-label="Open menu"
      >
        ＋
      </button>
    </kai-prompt-input>
  ),
};

// ── 2. DROP-IN — no seams projected → regression baseline (toolbar must start
//    cleanly at the attach button, no phantom gap). ───────────────────────────
export const DropIn: Story = {
  render: () => (
    <kai-prompt-input style={{ display: 'block' }} />
  ),
};
