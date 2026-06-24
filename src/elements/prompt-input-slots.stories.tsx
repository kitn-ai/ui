import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Plus, X } from 'lucide-solid';
import './register'; // side effect: registers <kai-prompt-input> et al.

// SPIKE: feasibility demo for the slotted-shell composition model on
// <kai-prompt-input>. Every slot is filled with PLAIN DOM (no kai-* inside the
// slots) and inline-styled, to prove: (1) light-DOM content projects through the
// Solid-rendered shadow slots, and (2) shadow-DOM style encapsulation does NOT
// reach slotted content — the consumer's own markup and CSS win.

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-prompt-input': JSX.HTMLAttributes<HTMLElement> & { theme?: string; placeholder?: string; loading?: boolean; disabled?: boolean; voice?: boolean; search?: boolean; 'suggestion-mode'?: string };
    }
  }
}

const meta = {
  title: 'Spikes/Prompt Input Slots',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

// ── 1. SLOTS — notice banner + toolbar-start + button projected in. ───────────
export const Slots: Story = {
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
          style="border:0;background:transparent;cursor:pointer;color:#92400e;line-height:1;padding:0 2px;display:flex;align-items:center"
        >
          <X size={16} />
        </button>
      </div>
      <button
        slot="toolbar-start"
        type="button"
        style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid #d4d4d8;border-radius:9999px;background:#fff;cursor:pointer;flex-shrink:0"
        aria-label="Open menu"
      >
        <Plus size={16} />
      </button>
    </kai-prompt-input>
  ),
};

// ── 2. DROP-IN — no slots projected → regression baseline (toolbar must start
//    cleanly at the attach button, no phantom gap). ───────────────────────────
export const DropIn: Story = {
  render: () => (
    <kai-prompt-input style={{ display: 'block' }} />
  ),
};
