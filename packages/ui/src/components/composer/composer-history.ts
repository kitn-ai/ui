import type { ComposerDoc } from '../primitives/composer-model';

/**
 * Undo/redo history for the composer.
 *
 * The browser's native contenteditable undo stack can't track our programmatic
 * pill insertion/deletion — it leaves pills stuck and replays text edits against
 * a DOM we changed underneath it, corrupting the content. So we own the history:
 * a stack of document-model snapshots. Restoring a snapshot re-renders the doc
 * (pills included, since each snapshot holds full EntityRefs) and the caret.
 *
 * Pure module — no DOM. The caller computes `coalesce` (true to merge a run of
 * consecutive typing into one undo step; false for a structural edit like a pill
 * insert/delete, which gets its own step).
 */

export interface Snapshot {
  doc: ComposerDoc;
  caret: number;
}

export interface ComposerHistory {
  /** Record a new state. `coalesce` merges it into the current entry instead of
   *  pushing a new one (used for consecutive typing). */
  record(snap: Snapshot, coalesce: boolean): void;
  /** Step back; returns the snapshot to restore, or null if nothing to undo. */
  undo(): Snapshot | null;
  /** Step forward; returns the snapshot to restore, or null if nothing to redo. */
  redo(): Snapshot | null;
  /** Replace all history with a single baseline entry (e.g. external value set). */
  reset(snap: Snapshot): void;
  canUndo(): boolean;
  canRedo(): boolean;
  /** Current entry count (for tests/debugging). */
  size(): number;
}

export function createHistory(initial: Snapshot, limit = 200): ComposerHistory {
  let entries: Snapshot[] = [initial];
  let index = 0;

  return {
    record(snap, coalesce) {
      if (coalesce && index === entries.length - 1) {
        // Merge into the current entry (a continuing run of typing).
        entries[index] = snap;
        return;
      }
      // Drop any redo branch, then push a fresh entry.
      entries = entries.slice(0, index + 1);
      entries.push(snap);
      if (entries.length > limit) {
        entries.shift();
      } else {
        index++;
      }
    },
    undo() {
      if (index === 0) return null;
      index--;
      return entries[index];
    },
    redo() {
      if (index >= entries.length - 1) return null;
      index++;
      return entries[index];
    },
    reset(snap) {
      entries = [snap];
      index = 0;
    },
    canUndo() {
      return index > 0;
    },
    canRedo() {
      return index < entries.length - 1;
    },
    size() {
      return entries.length;
    },
  };
}
