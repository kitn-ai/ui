import { createEffect, createSignal, onCleanup } from 'solid-js';
import { observeContentHeight } from './use-resize-observer';
import { resolveLineHeight } from './text-metrics';

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
  // A non-positive line height means the threshold is unknown, and failing closed is
  // the safe direction when it is: zero answers `expanded` for ANY content, which is
  // a two-row box under a single line of text. An unstyled editable no longer arrives
  // here — `resolveLineHeight` recovers the `normal` keyword as a multiple of the
  // font size — so this catches a caller that supplied the number directly, and an
  // element that explicitly computed a zero line height.
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
    // Shared with `use-auto-resize`, which asks the same question about an editable
    // of its own: the `normal` keyword is recovered there, so this cannot read a
    // perfectly ordinary line height as zero and stop responding to text.
    setLineHeight(resolveLineHeight(el));
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
