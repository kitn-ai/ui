import { type JSX, createSignal, onMount } from 'solid-js';
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
}

export function Composer(props: ComposerProps): JSX.Element {
  let editable!: HTMLDivElement;
  const [empty, setEmpty] = createSignal(docIsEmpty(normalizeValue(props.value)));

  const snapshot = (): ComposerChange => {
    const doc = parseDom(editable);
    return { doc, text: serializeToText(doc), entities: entitiesOf(doc) };
  };

  onMount(() => {
    renderDoc(editable, normalizeValue(props.value));
    setEmpty(docIsEmpty(parseDom(editable)));
  });

  const handleInput = () => {
    const change = snapshot();
    setEmpty(docIsEmpty(change.doc));
    props.onChange?.(change);
  };

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
    const sel = ownerDoc.defaultView?.getSelection();
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
    // --- Backspace / Delete: atomically remove pill immediately before/after caret ---
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const ownerDoc = editable.ownerDocument;
      const sel = ownerDoc.defaultView?.getSelection();
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

    // --- Enter: submit ---
    if (e.key === 'Enter' && !e.shiftKey && props.submitOnEnter !== false) {
      e.preventDefault();
      if (props.disabled || props.loading) return;
      props.onSubmit?.(snapshot());
    }
  };

  const maxH = () => props.maxHeight ?? 240;

  return (
    <div
      class={cn(
        'kai-composer relative rounded-xl bg-muted/40 p-2',
        props.disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <div
        ref={editable}
        data-kai-composer-editable
        contentEditable={props.disabled ? false : ('plaintext-only' as unknown as boolean)}
        role="textbox"
        aria-multiline="true"
        aria-label={props.placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
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
    </div>
  );
}
