import {
  type JSX,
  createSignal,
  createEffect,
  createMemo,
  createUniqueId,
  on,
  onMount,
  onCleanup,
  Show,
  For,
} from 'solid-js';
import { cn } from '../utils/cn';
import {
  type ComposerDoc,
  type EntityRef,
  normalizeValue,
  serializeToText,
  entitiesOf,
  docIsEmpty,
} from '../primitives/composer-model';
import {
  parseDom,
  renderDoc,
  ZWSP,
  createEntityEl,
  entityStore,
  isEntityEl,
} from './composer-dom';
import { activeTriggerFor } from '../primitives/composer-triggers';
import { usePosition, useDismiss, createPresence } from '../ui/overlay';
import { findHighlightMatches, applyHighlights } from './composer-highlight';

export interface TriggerItem {
  id: string;
  label: string;
  icon?: string;
  promptText?: string;
  data?: Record<string, unknown>;
}
export interface TriggerDef {
  char: string;
  kind: string;
  items?: TriggerItem[];
}
export type HighlightRule =
  | string
  | { pattern: string; flags?: string; class?: string };
export interface ComposerChange {
  doc: ComposerDoc;
  text: string;
  entities: EntityRef[];
}
export interface ComposerProps {
  value?: string | ComposerDoc;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  maxHeight?: number | string;
  submitOnEnter?: boolean;
  triggers?: TriggerDef[];
  highlights?: HighlightRule[];
  onChange?: (change: ComposerChange) => void;
  onSubmit?: (change: ComposerChange) => void;
  onTrigger?: (info: { char: string; query: string; rect: DOMRect }) => void;
  onTriggerClose?: () => void;
  onEntityAdd?: (entity: EntityRef) => void;
  onEntityRemove?: (entity: EntityRef) => void;
  /** The editable gained focus (mirrors DOM `focus`; not composed across the shadow). */
  onFocus?: (e: FocusEvent) => void;
  /** The editable lost focus (mirrors DOM `blur`). */
  onBlur?: (e: FocusEvent) => void;
  /** Bubbling focus (mirrors DOM `focusin`). */
  onFocusIn?: (e: FocusEvent) => void;
  /** Bubbling blur (mirrors DOM `focusout`). */
  onFocusOut?: (e: FocusEvent) => void;
  /** A key was pressed (mirrors DOM `keydown`; fires for every key, incl. ones the composer handles). */
  onKeydown?: (e: KeyboardEvent) => void;
  /** Content was pasted (mirrors DOM `paste`). */
  onPaste?: (e: ClipboardEvent) => void;
}

/**
 * Shadow-DOM-aware selection. `document.getSelection()` does NOT expose a
 * selection that lives inside an open ShadowRoot in Chromium — it retargets the
 * range to the host — so caret math and node insertion would silently operate
 * OUTSIDE the editable (pills land in the light DOM, the menu never closes).
 * `ShadowRoot.getSelection()` (Chrome) returns the real in-shadow selection. Fall
 * back to the document selection for the light DOM / jsdom (no shadow root).
 */
function getActiveSelection(node: Node): Selection | null {
  const root = node.getRootNode();
  if (
    typeof ShadowRoot !== 'undefined' &&
    root instanceof ShadowRoot &&
    typeof (root as unknown as { getSelection?: () => Selection | null }).getSelection === 'function'
  ) {
    return (root as unknown as { getSelection: () => Selection | null }).getSelection();
  }
  return node.ownerDocument?.getSelection() ?? null;
}

/** Compute the full ZWSP-stripped text of all text nodes in the editable. */
function getFullText(root: HTMLElement): string {
  let text = '';
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    text += (node.textContent ?? '').split(ZWSP).join('');
    node = walker.nextNode() as Text | null;
  }
  return text;
}

/**
 * Compute the global text offset for the current caret position.
 * Walks SHOW_TEXT nodes, strips ZWSP, sums lengths before the caret node.
 */
function getCaretTextOffset(root: HTMLElement): number {
  const ownerDoc = root.ownerDocument;
  const sel = getActiveSelection(root);
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return 0;

  const { startContainer, startOffset } = range;
  let offset = 0;
  const walker = ownerDoc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (node === startContainer) {
      // Strip ZWSP chars that come before startOffset
      const raw = (node.textContent ?? '').slice(0, startOffset);
      offset += raw.split(ZWSP).join('').length;
      return offset;
    }
    offset += (node.textContent ?? '').split(ZWSP).join('').length;
    node = walker.nextNode() as Text | null;
  }
  return offset;
}

/**
 * Get the client rect of the caret. Uses a collapsed range if possible.
 * If the rect is zero-sized, inserts a temporary measuring span briefly.
 */
function getCaretRect(root: HTMLElement): DOMRect | null {
  const ownerDoc = root.ownerDocument;
  const sel = getActiveSelection(root);
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);

  const rects = range.getClientRects();
  if (rects.length > 0 && (rects[0].width > 0 || rects[0].height > 0)) {
    return rects[0];
  }

  // Fallback: insert a measuring span, read its rect, remove it.
  const marker = ownerDoc.createElement('span');
  marker.textContent = '​';
  marker.style.position = 'absolute';
  marker.style.visibility = 'hidden';
  range.insertNode(marker);
  const rect = marker.getBoundingClientRect();
  marker.remove();
  return rect.width > 0 || rect.height > 0 ? rect : null;
}

export function Composer(props: ComposerProps): JSX.Element {
  let editable!: HTMLDivElement;
  let menuRef: HTMLDivElement | undefined;
  const highlightName = `kai-composer-highlight-${createUniqueId()}`;
  const [empty, setEmpty] = createSignal(docIsEmpty(normalizeValue(props.value)));

  // --- Trigger menu state ---
  type ActiveTriggerState = {
    def: TriggerDef;
    query: string;
    start: number;
    caretRect: DOMRect;
  };
  const [activeTrigger, setActiveTrigger] = createSignal<ActiveTriggerState | null>(null);
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  const menuOpen = createMemo(() => {
    const t = activeTrigger();
    return !!(t && t.def.items && t.def.items.length > 0);
  });

  const filteredItems = createMemo((): TriggerItem[] => {
    const t = activeTrigger();
    if (!t?.def.items) return [];
    const q = t.query.toLowerCase();
    return q === ''
      ? t.def.items
      : t.def.items.filter((item) => item.label.toLowerCase().includes(q));
  });

  // Keep selectedIndex in bounds when filteredItems changes
  createEffect(() => {
    const max = filteredItems().length;
    if (selectedIndex() >= max) setSelectedIndex(Math.max(0, max - 1));
  });

  // --- Floating menu positioning ---
  // Virtual reference element built from the live caret rect
  const virtualRef = createMemo((): HTMLElement | undefined => {
    const t = activeTrigger();
    if (!t) return undefined;
    const rect = t.caretRect;
    return {
      getBoundingClientRect: () => rect,
    } as unknown as HTMLElement;
  });

  const floatingRef = createMemo(() => menuRef);
  const { pos, hidden } = usePosition(virtualRef, floatingRef, { placement: 'bottom-start', gutter: 4 });
  const { present, state, setRef } = createPresence(menuOpen);

  useDismiss({
    enabled: menuOpen,
    onDismiss: () => closeTrigger(),
    refs: () => [editable, menuRef],
  });

  function closeTrigger() {
    if (activeTrigger()) {
      setActiveTrigger(null);
      props.onTriggerClose?.();
    }
  }

  // --- Core logic ---

  const snapshot = (): ComposerChange => {
    const doc = parseDom(editable);
    return { doc, text: serializeToText(doc), entities: entitiesOf(doc) };
  };

  /** Recompute and register CSS Custom Highlight ranges for keyword rules. */
  function recomputeHighlights() {
    const rules = props.highlights;
    if (!rules?.length) return;
    const text = getFullText(editable);
    const matches = findHighlightMatches(text, rules);
    applyHighlights(editable, matches, ZWSP, highlightName);
  }

  onMount(() => {
    renderDoc(editable, normalizeValue(props.value));
    setEmpty(docIsEmpty(parseDom(editable)));
    recomputeHighlights();
  });

  // Re-render when the controlled `value` prop changes, but ONLY when the
  // editable is NOT focused (don't stomp the caret while the user is typing).
  createEffect(on(() => props.value, (v) => {
    // Don't stomp the caret while the user is typing in this editable.
    if (editable && (editable.ownerDocument.activeElement === editable || editable.getRootNode() instanceof ShadowRoot && (editable.getRootNode() as ShadowRoot).activeElement === editable)) return;
    renderDoc(editable, normalizeValue(v));
    setEmpty(docIsEmpty(parseDom(editable)));
    recomputeHighlights();
  }, { defer: true }));

  function updateTriggerState() {
    const defs = props.triggers;
    if (!defs?.length) {
      if (activeTrigger()) closeTrigger();
      return;
    }
    const text = getFullText(editable);
    const caret = getCaretTextOffset(editable);
    const hit = activeTriggerFor(text, caret, defs);
    if (hit) {
      const rect = getCaretRect(editable);
      if (rect) {
        const prev = activeTrigger();
        setActiveTrigger({ def: hit.def, query: hit.query, start: hit.start, caretRect: rect });
        // Fire onTrigger if char/query changed or first activation
        if (!prev || prev.def.char !== hit.def.char || prev.query !== hit.query) {
          props.onTrigger?.({ char: hit.def.char, query: hit.query, rect });
        }
      }
    } else {
      if (activeTrigger()) closeTrigger();
    }
  }

  const handleInput = () => {
    const change = snapshot();
    setEmpty(docIsEmpty(change.doc));
    props.onChange?.(change);
    updateTriggerState();
    recomputeHighlights();
  };

  // Also update trigger state on selectionchange (while focused). These handlers
  // double as the consumer-facing focus/blur surface (focus/blur are NOT composed,
  // so they don't escape the shadow root natively — we re-expose them as callbacks
  // the element turns into kai-focus/kai-blur).
  let focused = false;
  const handleFocus = (e: FocusEvent) => { focused = true; props.onFocus?.(e); };
  const handleBlur = (e: FocusEvent) => { focused = false; props.onBlur?.(e); };
  const handleFocusIn = (e: FocusEvent) => props.onFocusIn?.(e);
  const handleFocusOut = (e: FocusEvent) => props.onFocusOut?.(e);
  const handlePaste = (e: ClipboardEvent) => props.onPaste?.(e);

  onMount(() => {
    const onSelectionChange = () => {
      if (focused) updateTriggerState();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    onCleanup(() => document.removeEventListener('selectionchange', onSelectionChange));
  });

  /**
   * Select an item from the trigger menu.
   */
  function selectItem(item: TriggerItem) {
    const t = activeTrigger();
    if (!t) return;
    const entity: EntityRef = {
      kind: t.def.kind,
      id: item.id,
      label: item.label,
      icon: item.icon,
      promptText: item.promptText,
      data: item.data,
    };
    insertEntity(entity, { replaceFrom: t.start });
    closeTrigger();
  }

  /**
   * Insert an entity at the current caret position.
   * If `opts.replaceFrom` is given (text offset), the trigger token text from
   * that offset to the caret is deleted first.
   * After insertion the caret is placed immediately after the new ZWSP text node.
   * Fires `onEntityAdd` then re-runs the input/change path.
   *
   * Note: replaceFrom token removal is text-offset based. In Task 7 the trigger
   * menu calls this with replaceFrom = trigger.start.
   */
  const insertEntity = (entity: EntityRef, opts?: { replaceFrom?: number }) => {
    const ownerDoc = editable.ownerDocument;
    const sel = getActiveSelection(editable);
    if (!sel) return;

    // If replaceFrom is given, delete trigger token text before the caret.
    if (opts?.replaceFrom !== undefined) {
      const range = sel.getRangeAt(0);
      // Find the text node at the start of the trigger token and trim it.
      // Walk text nodes to find the replaceFrom offset.
      let offset = 0;
      let targetNode: Text | null = null;
      let targetOffset = 0;
      const walker = ownerDoc.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode() as Text | null;
      while (node) {
        const content = (node.textContent ?? '').split(ZWSP).join('');
        if (offset + content.length >= opts.replaceFrom) {
          targetNode = node;
          targetOffset = opts.replaceFrom - offset;
          break;
        }
        offset += content.length;
        node = walker.nextNode() as Text | null;
      }
      if (targetNode) {
        const deleteRange = ownerDoc.createRange();
        deleteRange.setStart(targetNode, targetOffset);
        deleteRange.setEnd(range.endContainer, range.endOffset);
        deleteRange.deleteContents();
      }
    }

    // Insert entity pill + ZWSP at the current caret.
    const pill = createEntityEl(ownerDoc, entity);
    const zwspNode = ownerDoc.createTextNode(ZWSP);

    const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : ownerDoc.createRange();
    range.deleteContents();
    range.insertNode(zwspNode);
    range.insertNode(pill);

    // Move caret after the ZWSP node.
    const newRange = ownerDoc.createRange();
    newRange.setStartAfter(zwspNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    props.onEntityAdd?.(entity);
    handleInput();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Notify the consumer of every keydown (incl. keys the composer handles below).
    // The original event is passed so a consumer can preventDefault if desired.
    props.onKeydown?.(e);

    // --- Trigger menu keyboard navigation (takes priority) ---
    if (menuOpen() && filteredItems().length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredItems().length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredItems().length) % filteredItems().length);
        return;
      }
      if (e.key === 'Enter') {
        const items = filteredItems();
        if (items.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          selectItem(items[selectedIndex()]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeTrigger();
        return;
      }
    } else if (activeTrigger() && e.key === 'Escape') {
      // No items shown but trigger is active (e.g. only onTrigger fired) — close on Escape
      e.preventDefault();
      closeTrigger();
      return;
    }

    // --- Backspace / Delete: atomically remove pill immediately before/after caret ---
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const ownerDoc = editable.ownerDocument;
      const sel = getActiveSelection(editable);
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      if (!range.collapsed) return; // let the browser handle a selection deletion

      if (e.key === 'Backspace') {
        // Look for a pill immediately before the caret.
        // Patterns (jsdom collapses range to editable div, not text node):
        //   [pill][ZWSP text node] ← caret at offset 2 in editable
        //   [pill] ← caret at offset 1 in editable
        //   caret inside ZWSP text node after pill
        let pillEl: HTMLElement | null = null;
        let zwspAfterPill: Text | null = null;

        const { startContainer, startOffset } = range;

        if (startContainer === editable && startOffset > 0) {
          // Caret is directly in the editable div between children.
          const nodeBefore = editable.childNodes[startOffset - 1];
          if (isEntityEl(nodeBefore)) {
            // Caret directly after pill (no ZWSP between them).
            pillEl = nodeBefore as HTMLElement;
          } else if (
            nodeBefore?.nodeType === Node.TEXT_NODE &&
            (nodeBefore.textContent ?? '').split('').every((ch) => ch === ZWSP)
          ) {
            // Caret is after a ZWSP-only text node — that text node trails a pill.
            const nodeBeforeThat = startOffset >= 2 ? editable.childNodes[startOffset - 2] : null;
            if (isEntityEl(nodeBeforeThat)) {
              pillEl = nodeBeforeThat as HTMLElement;
              zwspAfterPill = nodeBefore as Text;
            }
          }
        } else if (startContainer.nodeType === Node.TEXT_NODE) {
          // Caret is inside a text node — check if the text so far is only ZWSP.
          const textBefore = (startContainer.textContent ?? '').slice(0, startOffset);
          const isOnlyZwsp = textBefore === '' || textBefore.split('').every((ch) => ch === ZWSP);
          if (isOnlyZwsp) {
            // Check the node immediately before this text node.
            const prev = startContainer.previousSibling;
            if (isEntityEl(prev)) {
              pillEl = prev as HTMLElement;
              zwspAfterPill = startContainer as Text;
            }
          }
        }

        if (pillEl) {
          e.preventDefault();
          const entity = entityStore.get(pillEl);
          // Remove the pill and its trailing ZWSP text node if present.
          if (zwspAfterPill) zwspAfterPill.remove();
          pillEl.remove();
          if (entity) props.onEntityRemove?.(entity);
          handleInput();
          return;
        }
      }

      if (e.key === 'Delete') {
        // Look for a pill immediately after the caret.
        let pillEl: HTMLElement | null = null;

        const { startContainer, startOffset } = range;

        if (startContainer === editable) {
          const nodeAfter = editable.childNodes[startOffset];
          if (isEntityEl(nodeAfter)) {
            pillEl = nodeAfter as HTMLElement;
          }
        } else if (startContainer.nodeType === Node.TEXT_NODE) {
          const textAfter = (startContainer.textContent ?? '').slice(startOffset);
          const isOnlyZwsp = textAfter.split('').every((ch) => ch === ZWSP);
          if (isOnlyZwsp) {
            const next = startContainer.nextSibling;
            if (isEntityEl(next)) {
              pillEl = next as HTMLElement;
            }
          }
        }

        if (pillEl) {
          e.preventDefault();
          const entity = entityStore.get(pillEl);
          // Delete forward: also remove the trailing ZWSP text node after the pill.
          const afterPill = pillEl.nextSibling;
          if (afterPill?.nodeType === Node.TEXT_NODE) {
            const content = afterPill.textContent ?? '';
            if (content.split('').every((ch) => ch === ZWSP)) {
              afterPill.remove();
            }
          }
          pillEl.remove();
          if (entity) props.onEntityRemove?.(entity);
          handleInput();
          return;
        }
      }
    }

    // --- Enter: submit (only when menu is NOT open or no item is highlighted) ---
    if (e.key === 'Enter' && !e.shiftKey && props.submitOnEnter !== false) {
      e.preventDefault();
      if (props.disabled || props.loading) return;
      props.onSubmit?.(snapshot());
    }
  };

  // Close trigger when space is typed (handled via input event — space moves caret
  // past whitespace boundary, so updateTriggerState will return null anyway).
  // This is covered by updateTriggerState() in handleInput.

  const maxH = () => props.maxHeight ?? 240;

  return (
    <div
      class={cn(
        'kai-composer relative rounded-xl bg-muted/40 p-2',
        props.disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      {/* Static style for CSS Custom Highlight API decoration.
          No-op in browsers that don't support ::highlight(); the selector
          is simply unrecognized and dropped. */}
      <style>{`::highlight(${highlightName}) { background-color: rgba(var(--color-primary, 99 102 241) / 0.18); }`}</style>
      {/* Atomic entity pill styling. Self-contained (currentColor-based) so it
          renders correctly without depending on a Tailwind rebuild for the
          custom .kai-composer-pill class. */}
      <style>{`
        .kai-composer-pill {
          display: inline-flex; align-items: center; gap: 0.25rem;
          vertical-align: baseline; padding: 0.05rem 0.3rem; margin: 0 0.05rem;
          border-radius: 0.375rem;
          background-color: color-mix(in srgb, currentColor 10%, transparent);
          font-weight: 500; white-space: nowrap; user-select: none; cursor: default;
        }
        .kai-composer-pill-icon {
          width: 1.05em; height: 1.05em; border-radius: 9999px;
          object-fit: cover; flex-shrink: 0;
        }
      `}</style>
      <div
        ref={editable}
        data-kai-composer-editable
        contentEditable={props.disabled ? false : ('plaintext-only' as unknown as boolean)}
        role="textbox"
        aria-multiline="true"
        aria-label={props.placeholder || 'Message input'}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        on:focusin={handleFocusIn}
        on:focusout={handleFocusOut}
        onPaste={handlePaste}
        class={cn(
          'text-foreground min-h-[44px] w-full overflow-y-auto outline-none whitespace-pre-wrap break-words',
        )}
        style={{
          'max-height':
            typeof maxH() === 'number' ? `${maxH()}px` : String(maxH()),
        }}
      />
      {empty() && props.placeholder && (
        <div class="text-muted-foreground pointer-events-none absolute left-2 top-2 select-none">
          {props.placeholder}
        </div>
      )}

      {/* Trigger menu */}
      <Show when={present()}>
        <div
          ref={(el) => { menuRef = el; setRef(el); }}
          role="listbox"
          aria-label="Suggestions"
          data-state={state()}
          class={cn(
            'absolute z-50 min-w-[180px] max-w-[280px] rounded-lg bg-card shadow-lg overflow-hidden py-1',
            'border border-border',
          )}
          style={{
            position: 'fixed',
            left: `${pos().x}px`,
            top: `${pos().y}px`,
            visibility: hidden() ? 'hidden' : 'visible',
          }}
        >
          <For each={filteredItems()}>
            {(item, index) => (
              <button
                role="option"
                aria-selected={selectedIndex() === index()}
                data-index={index()}
                class={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                  selectedIndex() === index()
                    ? 'bg-muted text-foreground'
                    : 'text-foreground hover:bg-muted',
                )}
                onMouseEnter={() => setSelectedIndex(index())}
                onClick={(e) => {
                  e.preventDefault();
                  selectItem(item);
                }}
              >
                <Show when={item.icon}>
                  <img src={item.icon} alt="" class="w-4 h-4 rounded shrink-0" />
                </Show>
                <span class="truncate">{item.label}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
