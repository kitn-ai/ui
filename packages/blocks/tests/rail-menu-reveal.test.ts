/**
 * The assistant rail's row menu reveals on hover or focus, and the CONSTRUCTION
 * is the contract here: three constraints, each of which exists because the
 * obvious version of this rule is an accessibility failure.
 *
 *  1. hide with `opacity`, never `display`/`visibility` — those two remove the
 *     control from the accessibility tree, so the row menu would vanish for a
 *     screen reader rather than for the eye;
 *  2. the hidden state lives INSIDE the `hover: hover` query — a bare
 *     `opacity: 0` leaves the menu permanently invisible on a touch device,
 *     where no hover ever arrives to reveal it;
 *  3. focus reveals it too — hover alone lets a keyboard user tab onto a control
 *     they cannot see (WCAG 2.4.7, Focus Visible), and the row body is a tab
 *     stop, so focusing the row reveals the kebab before focus reaches it.
 *
 * WHY THIS ASSERTS THE STYLESHEET'S TEXT. The behaviour is a media query and a
 * pseudo-class — browser facts. This package's runner has no layout engine and
 * applies no stylesheet, so it cannot observe the opacity that results; the
 * block driver is where the revealed state is actually measured. What this file
 * can do is stop the three constraints being simplified away, which is the edit
 * a later reader is most likely to make: it is exactly how the kit's own message
 * actions shipped a hover-only reveal that a keyboard user could not see.
 *
 * A near-copy of this construction lives in
 * `packages/ui/src/components/message/message.tsx` (Tailwind classes rather than
 * plain CSS); its equivalent guard is a case in
 * `packages/ui/src/components/message/message-action-bar.test.tsx`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(path.join(here, '..', 'blocks', 'assistant', 'assistant.css'), 'utf8');

/** The first `@media (hover: hover)` block, brace-matched, with its bounds. */
function hoverBlock(source: string): { start: number; end: number; body: string } {
  const at = source.indexOf('@media (hover: hover)');
  if (at < 0) throw new Error('assistant.css has no `@media (hover: hover)` block');
  const open = source.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return { start: at, end: i + 1, body: source.slice(open + 1, i) };
    }
  }
  throw new Error('unclosed `@media` block');
}

/** Everything outside that block, so a rule that escaped it is visible. */
const outsideHoverBlock = (): string => {
  const block = hoverBlock(CSS);
  return CSS.slice(0, block.start) + CSS.slice(block.end);
};

describe('the assistant rail menu reveal', () => {
  it('hides with opacity, never with display or visibility', () => {
    // The AT-tree constraint: either of those two hides the control from a screen
    // reader, which is the failure the whole reveal has to avoid.
    expect(CSS).not.toMatch(/\.row-menu[^}]*display:\s*none/);
    expect(CSS).not.toMatch(/\.row-menu[^}]*visibility:\s*hidden/);
    // And it does hide, which is the point of the rule.
    expect(hoverBlock(CSS).body).toMatch(/\.row-menu[^}]*opacity:\s*0/);
  });

  it('keeps the hidden state inside the hover query, so a touch device still shows it', () => {
    // Inside: the hide is scoped to devices that have hover.
    const inside = hoverBlock(CSS).body;
    expect(inside).toMatch(/\.row-menu[^}]*opacity:\s*0/);
    // Outside: nothing hides the menu, so with no hover there is no hidden state
    // to be stuck in.
    expect(outsideHoverBlock()).not.toMatch(/\.row-menu[^}]*opacity:\s*0/);
  });

  it('reveals on focus as well as hover, and the row is the thing that has focus', () => {
    const inside = hoverBlock(CSS).body;
    // A bare `:hover` reveal fails WCAG 2.4.7 for a keyboard user.
    expect(inside).toMatch(/kai-conversation-item:focus-within\s+\.row-menu[^}]*opacity:\s*1/);
    expect(inside).toMatch(/kai-conversation-item:hover\s+\.row-menu[^}]*opacity:\s*1/);
  });
});
