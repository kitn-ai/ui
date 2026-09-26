/**
 * Thread density, the public axis.
 *
 * The three paddings that read as "how much air the thread has" (the between-turn gap,
 * the message band's padding and the composer band's padding) live inside this shadow
 * tree, so a consumer could only live with them or pierce the root, which this kit
 * forbids. They are one prop in the vocabulary the conversation row already uses:
 * `ConversationRowDensity`.
 *
 * `default` is the box the thread always had, byte-for-byte. `compact` is the
 * DESKTOP-PANEL class of density, not a web page's, and its numbers are measured rather
 * than guessed. Vercel AI Elements (the shadcn-lineage chat reference) puts 32px between
 * turns with a 16px band (`gap-8 p-4`); Joplin's native chat panel puts 8px and 8px
 * (`padding: 8px; gap: 8px`). This thread's own default sits between them at 16px
 * between turns and a 16px/12px band. `compact` takes the native panel's between-turn
 * gap and a 12px/8px band. What reads airy at desktop width is the SUM (a 768px column,
 * plus a generous gap and band on each side), so the column width stays: it is a
 * separate axis, as are the message's own internals (`components/message`).
 */
export type ThreadDensity = 'default' | 'compact';

/**
 * The class set one density value controls. Each entry is only the padding/spacing a
 * region adds to its own structural classes, so the call site keeps showing what is NOT
 * density-dependent (`h-full`, `mx-auto w-full max-w-3xl`, `shrink-0`) and `default`
 * reproduces the shipped markup exactly. Tailwind compiles literal class strings, so
 * these are strings rather than tokens: `px-${n}` would not exist as a utility.
 */
export interface ThreadDensityClasses {
  /** The message list's outer band: side padding plus top/bottom breathing room. */
  band: string;
  /** The vertical rhythm BETWEEN turns (the list's `space-y-*`). */
  gap: string;
  /** The composer band: the same side padding as the list, plus its own bottom. */
  composer: string;
  // Not a fourth thing to tune so much as the composer band's side padding reaching the
  // row above it: with a `slot="composer-actions"` row projected, a band at `px-3` above
  // a composer at `px-4` would show as two edges that do not line up.
  /** The accessory row above the composer, when the consumer projects one. */
  composerActions: string;
}

export const THREAD_DENSITY_CLASSES: Record<ThreadDensity, ThreadDensityClasses> = {
  default: { band: 'px-4 py-3', gap: 'space-y-4', composer: 'px-4 pb-4', composerActions: 'px-4' },
  compact: { band: 'px-3 py-2', gap: 'space-y-2', composer: 'px-3 pb-3', composerActions: 'px-3' },
};

/** Unknown values already reported, so one is loud once per value per caller: a thread
 *  re-renders on every streaming chunk, and the resolver runs from render. */
const reported = new Set<string>();

/**
 * Resolve the density axis. A runtime value is validated rather than trusted, because
 * `density` is attribute-settable and an attribute is just a string, so `density="cosy"`
 * arrives here. The prop's TYPE already rejects that in TypeScript; this covers the HTML
 * path, and it decides LOUDLY, then falls back to `default` rather than rendering a
 * thread with no padding classes at all, which an unguarded map lookup would do.
 */
export function resolveThreadDensity(value: unknown, caller: string): ThreadDensity {
  if (value === undefined || value === null || value === 'default') return 'default';
  if (value === 'compact') return 'compact';
  const key = `${caller}:${String(value)}`;
  if (!reported.has(key)) {
    reported.add(key);
    console.error(
      `${caller}: unknown \`density\` value ${JSON.stringify(value)}. Expected 'default' or 'compact'; rendering 'default'.`,
    );
  }
  return 'default';
}
