import { createEffect, createSignal, onCleanup } from 'solid-js';
import { observeContentHeight } from './use-resize-observer';

/** Which of the composer's two layouts applies. */
export type ComposerLayout = 'collapsed' | 'expanded';

/**
 * How tall the content must be, measured in LINE HEIGHTS, before it counts as
 * wrapped rather than one very long line.
 *
 * 1.5 rather than 1: a trailing descender and sub-pixel rounding must not read as
 * a second line, while a genuine second line is two whole line heights and clears
 * the threshold either way. Named, because it is the rule's only tunable: a bare
 * `1.5` at the comparison reads as an accident and invites a second one appearing
 * somewhere else.
 */
const WRAPPED_LINE_MULTIPLE = 1.5;

export interface ComposerExpansionInput {
  /** The composer's `expanded` prop: `undefined` derives, `true`/`false` pin. */
  pinned?: boolean;
  /** The editable's observed content height, in px. */
  contentHeight: number;
  /** The editable's computed line height, in px. */
  lineHeight: number;
  /** How many attachments are staged. */
  attachmentCount: number;
}

/**
 * One row or two.
 *
 * PURE on purpose: the rule is the part worth testing, and it is testable without
 * a browser because nothing here reads the DOM. The observer supplies the numbers
 * and this decides. A pinned value short-circuits everything ahead of it, which is
 * what makes a pinned layout predictable: nothing a user types can move it.
 */
export function resolveComposerLayout(input: ComposerExpansionInput): ComposerLayout {
  if (input.pinned !== undefined) return input.pinned ? 'expanded' : 'collapsed';
  if (input.attachmentCount > 0) return 'expanded';
  // Never expand on a line height we could not measure. `<= 0` would make the
  // comparison below true for ANY content, so the collapse would fail open on the
  // one value that means "unknown" — and failing open is the visible direction:
  // a two-row box under a single line of text.
  if (!(input.lineHeight > 0)) return 'collapsed';
  return input.contentHeight > input.lineHeight * WRAPPED_LINE_MULTIPLE ? 'expanded' : 'collapsed';
}

/**
 * The composer's `expanded` prop as a custom element has to read it.
 *
 * NOT the `flag()` helper: the underlying `resolveFlag` in
 * `web-components/define/define.tsx` returns `false` for BOTH an absent attribute
 * and an explicit `="false"`, which collapses "derive" into "pinned closed" and
 * loses the third state entirely. `undefined` is a real answer here, and it is the
 * one that means "decide from the content".
 */
export function resolveExpandedProp(
  raw: unknown,
  hasAttribute: boolean,
  attributeValue: string | null,
): boolean | undefined {
  if (raw === true) return true;
  if (raw === false) return false;
  if (!hasAttribute) return undefined;
  return attributeValue !== 'false';
}

/**
 * Feeds the resolver from a live editable.
 *
 * The line height is read from the element's OWN computed style, so a theme that
 * changes the prose size moves the threshold with it rather than leaving a
 * hand-typed number behind that agrees today. The observer's disposer is
 * registered on the effect, not on mount, so swapping the editable re-observes the
 * new one instead of leaving a ResizeObserver on a detached node.
 */
export function useComposerExpansion(options: {
  editable: () => HTMLElement | undefined;
  pinned: () => boolean | undefined;
  attachmentCount: () => number;
}): () => ComposerLayout {
  const [contentHeight, setContentHeight] = createSignal(0);
  const [lineHeight, setLineHeight] = createSignal(0);

  createEffect(() => {
    const el = options.editable();
    if (!el) return;
    // `line-height: normal` is a keyword, and `parseFloat` reads it as NaN rather
    // than a length — hence the explicit finite check before storing it.
    const measured = Number.parseFloat(getComputedStyle(el).lineHeight);
    setLineHeight(Number.isFinite(measured) && measured > 0 ? measured : 0);
    onCleanup(observeContentHeight(el, setContentHeight));
  });

  return () =>
    resolveComposerLayout({
      pinned: options.pinned(),
      contentHeight: contentHeight(),
      lineHeight: lineHeight(),
      attachmentCount: options.attachmentCount(),
    });
}
