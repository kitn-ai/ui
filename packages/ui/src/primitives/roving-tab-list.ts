/**
 * One tab stop across a set of rows, with arrow traversal, Home/End and activation.
 *
 * Rows are whatever `getRows()` returns, so this serves any element-based list. The
 * arrangement and the row's semantics stay with the caller: which nodes are rows, which node
 * carries the tab stop (`targetOf`), the row's own bookkeeping (`onRowSynced`) and what
 * activation means (`onActivate`). The traversal contract is the part that is expensive to
 * get right and identical everywhere; the rows are the part each application arranges
 * differently.
 *
 * Rows are matched by composed path, not `closest()`, so a control in a nested shadow root is
 * seen. `sync()` writes on change only: a caller re-syncing from a MutationObserver over these
 * very nodes would otherwise feed itself, since `setAttribute` records an identical write.
 */

/**
 * The contract, over the rows in `getRows()` order:
 *
 * - exactly one target node carries `tabindex="0"` (the active row's, else the first
 *   rendered row's) and every other one `-1`, re-derived on every `sync()`;
 * - ArrowUp/ArrowDown move one row and Home/End jump to the ends; only those four keys are
 *   claimed, so a horizontal arrow keeps whatever meaning the caller's rows give it;
 * - Enter and Space activate the row the event happened in, and Space does not scroll;
 * - an event whose composed path crosses a control inside the row (`yieldsToRow`) — a nested
 *   editor, the row's own menu — activates nothing and moves nothing, and a node that is not
 *   a row is never stamped, focused or activated, so non-row children are inert.
 */
export interface RovingTabListOptions {
  /** The rows, in DOM order. Whatever this does not return is not a row. */
  getRows: () => HTMLElement[];
  /** The row that owns the single tab stop; `undefined` and a row outside `getRows()`
   *  both fall back to the first rendered row. Called on every `sync()`. */
  getActiveRow?: () => HTMLElement | undefined;
  /** The node carrying `tabindex` / focus / activation for a row — a facade's rendered
   *  shadow body, else the row itself. Default: the row. */
  targetOf?: (row: HTMLElement) => HTMLElement;
  /** Rows `sync()` must leave alone until they render. A row whose target has not painted
   *  is not ready; stamping it in the meantime writes onto the row host, where the writes
   *  stick and are read back as authored. Default: every row is ready. */
  isReady?: (row: HTMLElement) => boolean;
  /** The row's own bookkeeping, called once per ready row with its resolved active state
   *  after the tab stop has been placed. Roles, `aria-current`, an `active` property. */
  onRowSynced?: (row: HTMLElement, active: boolean) => void;
  /** Activation — click, Enter or Space on a row. */
  onActivate: (row: HTMLElement) => void;
  /** Whether the event belongs to something inside the row that must keep it — a nested
   *  editor, the row's own menu. `true` means the row yields: no activation, no rove. */
  yieldsToRow?: (row: HTMLElement, e: Event) => boolean;
}

export interface RovingTabList {
  /** Re-derive the tab stop over the current rows. Call on membership/state change. */
  sync(): void;
  /** The container's click handler (composed-path aware). */
  handleClick(e: MouseEvent): void;
  /** The container's keydown handler (arrows, Home/End, Enter/Space). */
  handleKeyDown(e: KeyboardEvent): void;
}

export function createRovingTabList(opts: RovingTabListOptions): RovingTabList {
  const targetOf = (row: HTMLElement): HTMLElement => opts.targetOf?.(row) ?? row;
  const isReady = (row: HTMLElement): boolean => opts.isReady?.(row) !== false;

  const rowFromEvent = (e: Event): HTMLElement | undefined => {
    const rows = opts.getRows();
    return e.composedPath().find((n): n is HTMLElement => rows.includes(n as HTMLElement));
  };

  // Write-on-change only: see the module comment on re-entrant observers.
  const setAttr = (el: Element, name: string, value: string) => {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  };

  /** Place the tab stop on `target`, else on the first rendered row. */
  const rove = (rows: HTMLElement[], target: HTMLElement | undefined) => {
    for (const row of rows) {
      if (!isReady(row)) continue;
      setAttr(targetOf(row), 'tabindex', row === target ? '0' : '-1');
    }
  };

  const sync = () => {
    const rows = opts.getRows();
    const active = opts.getActiveRow?.();
    // The anchor is the active row only while it is still a rendered row: a stale id, or one
    // whose row has not painted yet, must not leave the list with no tab stop at all.
    let anchor = active !== undefined && rows.includes(active) && isReady(active) ? active : undefined;
    if (anchor === undefined) anchor = rows.find(isReady);
    for (const row of rows) {
      if (!isReady(row)) continue;
      opts.onRowSynced?.(row, row === active);
    }
    rove(rows, anchor);
  };

  return {
    sync,
    handleClick(e) {
      const row = rowFromEvent(e);
      if (!row || opts.yieldsToRow?.(row, e)) return;
      opts.onActivate(row);
    },
    handleKeyDown(e) {
      const rows = opts.getRows();
      if (rows.length === 0) return;
      const row = rowFromEvent(e);
      // The key belongs to the control the user is in. This covers Enter/Space AND the
      // Arrow/Home/End branch below: keys inside a nested editor must not start roving.
      if (row && opts.yieldsToRow?.(row, e)) return;
      if (e.key === 'Enter' || e.key === ' ') {
        if (!row) return;
        e.preventDefault();
        opts.onActivate(row);
        return;
      }
      let next: HTMLElement | undefined;
      const idx = row ? rows.indexOf(row) : rows.findIndex((r) => targetOf(r).getAttribute('tabindex') === '0');
      if (e.key === 'ArrowDown') next = rows[Math.min(idx + 1, rows.length - 1)];
      else if (e.key === 'ArrowUp') next = rows[Math.max(idx - 1, 0)];
      else if (e.key === 'Home') next = rows[0];
      else if (e.key === 'End') next = rows[rows.length - 1];
      if (!next) return;
      e.preventDefault();
      rove(rows, next);
      targetOf(next).focus();
    },
  };
}
