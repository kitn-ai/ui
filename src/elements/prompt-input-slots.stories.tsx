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
      'kai-prompt-input': JSX.HTMLAttributes<HTMLElement> & { theme?: string; placeholder?: string; loading?: boolean; disabled?: boolean; voice?: boolean; search?: boolean; attach?: boolean; submit?: string; 'suggestion-mode'?: string };
    }
  }
}

const meta = {
  title: 'Labs/Prompt Input Slots',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

// ── 1. SLOTS — input-top + toolbar-start + toolbar-end projected in. The notice
//    above the card is the consumer's OWN layout (a sibling div), NOT a slot —
//    outer content is light DOM you already control. Only the holes you can't
//    reach from outside (inside the card / toolbar) are slots. ─────────────────
export const Slots: Story = {
  render: () => (
    <div>
      {/* Above the card = your own layout, not a slot. */}
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:color-mix(in srgb, var(--color-tool-amber) 14%, var(--color-background));border:1px solid color-mix(in srgb, var(--color-tool-amber) 32%, transparent);border-radius:8px;margin-bottom:8px;font:13px/1.4 system-ui;color:var(--color-foreground)">
        <span>
          Model X is unavailable.{' '}
          <a href="#" style="color:var(--color-tool-amber);font-weight:600">Learn more</a>
        </span>
        <button
          type="button"
          aria-label="Dismiss"
          style="border:0;background:transparent;cursor:pointer;color:var(--color-muted-foreground);line-height:1;padding:0 2px;display:flex;align-items:center"
        >
          <X size={16} />
        </button>
      </div>
      <kai-prompt-input style={{ display: 'block' }}>
        {/* input-top: inside the card, above the textarea. */}
        <div
          slot="input-top"
          style="padding:6px 12px;font:12px/1.4 system-ui;color:var(--color-foreground);background:color-mix(in srgb, var(--color-tool-green) 14%, var(--color-background));border-radius:8px;margin:8px 8px 0"
        >
          Projects · Acme redesign
        </div>
        <button
          slot="toolbar-start"
          type="button"
          style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid var(--color-border);border-radius:9999px;background:var(--color-surface);color:var(--color-foreground);cursor:pointer;flex-shrink:0"
          aria-label="Open menu"
        >
          <Plus size={16} />
        </button>
        {/* toolbar-end: trailing controls, before the Send button. */}
        <span
          slot="toolbar-end"
          style="display:inline-flex;align-items:center;padding:0 10px;height:30px;font:12px/1 system-ui;color:var(--color-muted-foreground)"
        >
          Opus 4.8
        </span>
      </kai-prompt-input>
    </div>
  ),
};

// ── 2. DROP-IN — no slots projected → regression baseline (toolbar must start
//    cleanly at the attach button, no phantom gap). ───────────────────────────
export const DropIn: Story = {
  render: () => (
    <kai-prompt-input style={{ display: 'block' }} />
  ),
};
