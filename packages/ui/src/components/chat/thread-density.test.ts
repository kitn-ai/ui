/**
 * The density axis itself: the class sets and the resolver.
 *
 * The class strings are pinned HERE as literals so the "`default` changes nothing"
 * claim is checked rather than asserted. `default`'s four entries are exactly the
 * classes the thread carried before the axis existed
 * (`components/chat/chat-thread.tsx`: `h-full px-4 py-3` / `space-y-4` /
 * `shrink-0 px-4 pb-4` / `shrink-0 px-4`), and the two component tests
 * (`chat-thread.test.tsx`, `thread.test.tsx`) pin the RENDERED class attributes, so a
 * change to either the strings or the call sites fails somewhere.
 *
 * `compact` is pinned for the same reason, and its numbers are the measured
 * desktop-panel ones — 8px between turns (`space-y-2`), a 12px/8px band
 * (`px-3 py-2`) — not a taste. References and reasoning are in `thread-density.ts`.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveThreadDensity, THREAD_DENSITY_CLASSES, type ThreadDensity } from './thread-density';

afterEach(() => vi.restoreAllMocks());

describe('THREAD_DENSITY_CLASSES', () => {
  it("keeps `default` byte-for-byte the classes the thread already painted", () => {
    expect(THREAD_DENSITY_CLASSES.default).toEqual({
      band: 'px-4 py-3',
      gap: 'space-y-4',
      composer: 'px-4 pb-4',
      composerActions: 'px-4',
    });
  });

  it("tightens `compact` to the measured desktop-panel rhythm, and nothing else", () => {
    expect(THREAD_DENSITY_CLASSES.compact).toEqual({
      band: 'px-3 py-2',
      gap: 'space-y-2',
      composer: 'px-3 pb-3',
      composerActions: 'px-3',
    });
  });

  it('gives every density value a complete set, so no region can fall through', () => {
    for (const value of ['default', 'compact'] as ThreadDensity[]) {
      const classes = THREAD_DENSITY_CLASSES[value];
      expect(Object.values(classes).every((c) => typeof c === 'string' && c.length > 0)).toBe(true);
    }
  });

  it('keeps the composer band and the accessory row horizontally aligned in each value', () => {
    // The one cross-field invariant: the two bands sit directly above one another, so
    // the side padding is shared. A `composerActions` left behind at `px-4` while the
    // composer moved to `px-3` would show as two edges that do not line up.
    for (const value of ['default', 'compact'] as ThreadDensity[]) {
      const { composer, composerActions } = THREAD_DENSITY_CLASSES[value];
      const side = (s: string) => s.split(' ').filter((c) => c.startsWith('px-'));
      expect(side(composerActions)).toEqual(side(composer));
    }
  });
});

describe('resolveThreadDensity', () => {
  it('resolves an unset value to `default`', () => {
    expect(resolveThreadDensity(undefined, 'Thread')).toBe('default');
    expect(resolveThreadDensity(null, 'Thread')).toBe('default');
    expect(resolveThreadDensity('default', 'Thread')).toBe('default');
  });

  it('passes `compact` through', () => {
    expect(resolveThreadDensity('compact', 'Thread')).toBe('compact');
  });

  it('falls back to `default` LOUDLY for an unknown runtime value', () => {
    // The prop's TYPE rejects this in TypeScript; an attribute cannot. `density="cosy"`
    // is just a string by the time it reaches here, and an unguarded map lookup would
    // render a thread with no padding classes at all — the quiet version of the bug.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(resolveThreadDensity('cosy', 'Thread')).toBe('default');
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain('cosy');
    expect(String(error.mock.calls[0][0])).toContain("'default' or 'compact'");
    expect(String(error.mock.calls[0][0])).toContain('Thread');
  });

  it('reports an unknown value once per caller+value, not once per render', () => {
    // A thread re-renders on every streaming chunk, and the resolver is called from
    // render — an un-deduplicated console.error here would be a log flood.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    resolveThreadDensity('roomy', 'Thread');
    resolveThreadDensity('roomy', 'Thread');
    resolveThreadDensity('roomy', 'Thread');
    expect(error).toHaveBeenCalledTimes(1);
    // A DIFFERENT caller is a different mistake, so it gets its own report.
    resolveThreadDensity('roomy', 'ChatThread');
    expect(error).toHaveBeenCalledTimes(2);
  });
});
