import { defineWebComponent } from '../define/define';
import { ChatConfig, useChatConfig, type ProseSize } from '../../primitives/chat-config';
import { ResponseCompare, type CompareLayout } from '../../components/response/response-compare';
import type {
  ResponseCompareData,
  CompareSelection,
  ResponseCompareController,
} from '../../components/response/response-compare';

interface Props extends Record<string, unknown> {
  // Import `ResponseCompareData` from `@kitn.ai/ui` for the full shape.
  /** The compare definition (prompt + the two candidates). JS property: `el.data = { prompt, candidates: [A, B] }`. */
  data?: Record<string, unknown>;
  /** Stable id correlating every emitted event. Attribute: `compare-id`. */
  compareId?: string;
  /** Re-hydrate / control the user's pick. Set as a JS PROPERTY:
   *  `el.selection = { chosenId, rejectedIds }`. Renders the collapsed winner. */
  selection?: Record<string, unknown>;
  /** Layout: `auto` (default, by CONTAINER width), `columns` (side-by-side), or `tabs` (pills). */
  layout?: CompareLayout;
  /** Prose/text size for the rendered candidates. Attribute: `prose-size`. */
  proseSize?: ProseSize;
  /** Shiki theme for code blocks in the candidates. Attribute: `code-theme`. */
  codeTheme?: string;
  /** Whether code blocks are syntax-highlighted. Attribute: `code-highlight`. */
  codeHighlight?: boolean;
}

interface Events extends Record<string, unknown> {
  /** The user committed a pick. `detail` = `{ chosenId, rejectedIds, at }`. */
  'kai-compare-select': CompareSelection;
  /** Both candidates have settled and the pick is live. */
  'kai-ready': { compareId: string };
  /** The definition was unusable. */
  'kai-error': { compareId: string; message: string };
}
// A COMMIT, not a Submit: the pick is the terminal step and fires `kai-compare-select` (non-
// bubbling) off the host so the consumer can send a `(prompt, chosen, rejected)` preference
// pair. Single-shot; the card optimistically collapses to the chosen candidate. Both candidates
// may stream (push a fresh `data` reference per chunk) and the pick stays disabled with a
// per-column shimmer until BOTH settle, then `kai-ready` fires. The columns are a WAI-ARIA
// radiogroup with roving tabindex (Arrow moves A<->B, Enter/Space picks).
/**
 * A dual-response comparison in which the reader picks the better of two answers to one prompt.
 */
defineWebComponent<Props, Events>(
  'kai-compare',
  {
    data: undefined,
    compareId: undefined,
    selection: undefined,
    layout: 'auto',
    proseSize: undefined,
    codeTheme: undefined,
    codeHighlight: undefined,
  },
  (props, { element, dispatch, expose }) => {
    const compareId = (): string => props.compareId ?? (element.id || 'kai-compare');
    // Inherit the shadow-root portal mount from the outer ChatConfig that
    // defineWebComponent installs, so candidate-body overlays (hover cards,
    // tooltips) stay inside the shadow root.
    const outer = useChatConfig();

    // ── Imperative API (instance methods on the host) ──────────────────────────
    // Pattern C: ResponseCompare owns the pick + roving-focus state and hands up a
    // controller; the facade captures it and exposes delegating methods. The
    // component's own callbacks still fire (select → onSelect → kai-compare-select).
    let controller: ResponseCompareController | undefined;
    expose({
      /** Programmatically commit a pick by candidate id, on the same path as the
       *  "Pick this" button: fires kai-compare-select and optimistically
       *  collapses (single-shot; inert while streaming or already resolved).
       *  `select` does NOT collide with the `selection` prop (distinct
       *  identifier). */
      select: (candidateId: string) => controller?.select(candidateId),
      /** Focus the current roving tab stop (the focused candidate's "Pick this"
       *  radio) so a consumer can move keyboard focus into the radiogroup. */
      focus: (options?: FocusOptions) => controller?.focus(options),
    });

    return (
      <ChatConfig
        proseSize={props.proseSize}
        codeTheme={props.codeTheme}
        codeHighlight={props.codeHighlight}
        portalMount={outer.portalMount()}
      >
        <ResponseCompare
          data={props.data as ResponseCompareData | undefined}
          compareId={compareId()}
          selection={props.selection as CompareSelection | undefined}
          layout={(props.layout as CompareLayout | undefined) ?? 'auto'}
          controllerRef={(c) => (controller = c)}
          onSelect={(sel) => dispatch('kai-compare-select', sel)}
          onReady={() => dispatch('kai-ready', { compareId: compareId() })}
          onError={(message) => dispatch('kai-error', { compareId: compareId(), message })}
        />
      </ChatConfig>
    );
  },
);
