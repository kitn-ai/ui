import { type JSX, splitProps, createSignal, createContext, useContext } from 'solid-js';
import { cn } from '../../utils/cn';
import { useChatConfig, textClass } from '../../primitives/chat-config';
import { Composer, type TriggerDef, type ComposerChange } from '../composer/composer';
import type { ComposerDoc } from '../../primitives/composer-model';
import { useComposerExpansion, type ComposerLayout } from '../../primitives/composer-expansion';
// The kit's ONE copy of "is this event happening inside a control": it scans the
// composed path and cuts it at the boundary, so a control in a nested shadow root
// counts and an ancestor `tabindex` above the boundary does not. The conversation
// rows use it for the same reason — a container must not take an event a control
// inside it owns.
import { interactiveInside } from '../../primitives/focusable-child';

// --- Context ---

interface PromptInputContextType {
  isLoading: boolean;
  // A string (controlled text) or a ComposerDoc (a seed that pre-populates pills).
  value: () => string | ComposerDoc;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
  textareaRef: HTMLElement | undefined;
  setTextareaRef: (el: HTMLElement) => void;
  /** Which of the composer's two layouts the frame is rendering. */
  layout: () => ComposerLayout;
}

const PromptInputContext = createContext<PromptInputContextType>();

function usePromptInput() {
  const ctx = useContext(PromptInputContext);
  if (!ctx) throw new Error('PromptInput subcomponents must be used within PromptInput');
  return ctx;
}

// --- PromptInput (Root) ---

export interface PromptInputProps extends JSX.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
  /** String = controlled text; ComposerDoc = a seed that pre-populates pills. */
  value?: string | ComposerDoc;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  /** Pins the composer's layout: `true` two rows, `false` one row, omitted derives it
   *  from the content. See `composer-expansion`. */
  expanded?: boolean;
  // A COUNT, deliberately not `attachments`: naming a number the same as an
  // attachment array invites the two being read as one thing.
  /** How many attachments are staged, which is itself an expansion trigger. */
  attachmentCount?: number;
  children: JSX.Element;
  disabled?: boolean;
}

function PromptInput(props: PromptInputProps) {
  const [local, rest] = splitProps(props, [
    'isLoading', 'value', 'onValueChange', 'maxHeight', 'onSubmit',
    'children', 'disabled', 'class', 'onClick', 'expanded', 'attachmentCount',
  ]);

  const [internalValue, setInternalValue] = createSignal<string | ComposerDoc>(local.value ?? '');
  // A SIGNAL, not the plain `let` this used to be. The expansion effect tracks the
  // editable it observes, so a non-reactive read would attach the observer to
  // `undefined` once and never again: the composer would sit permanently collapsed
  // with nothing in the console to say why.
  const [textareaRef, setTextareaRef] = createSignal<HTMLElement>();

  const layout = useComposerExpansion({
    editable: textareaRef,
    pinned: () => local.expanded,
    attachmentCount: () => local.attachmentCount ?? 0,
  });

  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    local.onValueChange?.(newValue);
  };

  const handleClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = (e) => {
    // Focus the editable only when the click did NOT land on a control inside this
    // frame. Clicking the `+` trigger otherwise opens the menu WITH the caret in
    // the composer, so the arrow keys a user reaches for next TYPE into the text
    // instead of walking the menu. The paperclip did the same and it was harmless
    // because it opened a file dialog; a menu makes it visible.
    // A click on the editable itself is a control (it matches the focusable-child
    // rule), so this skips the redundant call and lets the click focus it natively.
    if (!local.disabled && !interactiveInside(e.composedPath(), e.currentTarget)) {
      textareaRef()?.focus();
    }
    if (typeof local.onClick === 'function') {
      (local.onClick as (e: MouseEvent & { currentTarget: HTMLDivElement }) => void)(e);
    }
  };

  return (
    <PromptInputContext.Provider
      value={{
        isLoading: local.isLoading ?? false,
        value: () => local.value ?? internalValue(),
        setValue: local.onValueChange ?? handleChange,
        maxHeight: local.maxHeight ?? 240,
        onSubmit: local.onSubmit,
        get disabled() { return local.disabled; },
        get textareaRef() { return textareaRef(); },
        setTextareaRef: (el) => setTextareaRef(el),
        layout,
      }}
    >
      <div
        data-prompt-input
        onClick={handleClick}
        class={cn(
          // The inner textarea neutralizes its own ring (focus-visible:ring-0),
          // so the FRAME owns the focus affordance: a blue ring whenever a
          // control inside it is focused. Without this the composer had no
          // visible keyboard-focus state.
          'bg-surface cursor-text shadow-xs',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0',
          'rounded-composer',
          // 10px above/below a 28px control is the 48px row; expanded the box opens 14px
          // above the text, separates the control row by 6px, and closes with 10px. The
          // horizontal 10px is DERIVED — `(rowHeight − controlHeight) / 2`, a control
          // centred on the pill's own arc — and SYMMETRIC, which is what keeps the `+` from
          // jumping sideways when the composer expands. A bare glyph's ink sits 6px further
          // in than a filled control's edge, `(28 − 16) / 2`: a fact about ink, not a reason
          // to move the box. Compensating one end for its glyph is how the row stops being
          // symmetric, and it treats a symptom. It replaced 18/14 measured from a
          // reference's glyph ink, which does not transfer when glyph sizes differ.
          //
          // NO ROW GAP IN EITHER LAYOUT: the `input-top` band always renders and is always
          // `basis-full`, so it owns a line even when nothing was projected, and a row gap
          // is charged between EVERY pair of lines. The 6px above the control row is the
          // body's `mb-1.5`; the attachment band's 20px is its own `mb-5`.
          //
          // `flex-wrap` COLLAPSED gives a projected band its own line instead of letting it
          // crowd the row. Nothing wraps ordinarily — the body is `min-w-0 flex-1` and the
          // clusters are `shrink-0` — and `justify-between` EXPANDED is inert for the body
          // and load-bearing for the row beneath it, which a hand-composed frame relies on.
          layout() === 'collapsed'
            ? 'flex flex-wrap flex-row items-center gap-x-2 py-2.5 px-2.5'
            : 'flex flex-wrap justify-between pt-3.5 px-2.5 pb-2.5',
          local.disabled && 'cursor-not-allowed opacity-60',
          local.class
        )}
        {...rest}
      >
        {local.children}
      </div>
    </PromptInputContext.Provider>
  );
}

// --- PromptInputTextarea ---

export interface PromptInputTextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  disableAutosize?: boolean;
  /** Rich entity triggers (`/`, `@`) forwarded to the composer. */
  triggers?: TriggerDef[];
  /** Default icon per entity kind (kind → image src), forwarded to the composer. */
  kindIcons?: Record<string, string>;
  /** Structured change (doc + entities) from the composer, on every edit. */
  onComposerChange?: (change: ComposerChange) => void;
}

function PromptInputTextarea(props: PromptInputTextareaProps) {
  const [local] = splitProps(props, ['class', 'placeholder', 'aria-label', 'triggers', 'kindIcons', 'onComposerChange']);
  const ctx = usePromptInput();
  const config = useChatConfig();

  // The frame (PromptInput root) owns radius/bg/padding/focus-ring, and this editable
  // carries NO inset of its own. WHICH edge that leaves it on depends on the layout:
  // collapsed it shares the control row, so the frame's padding is the edge the row's
  // first item starts from; expanded the frame still pads the CONTROL row at 10px while
  // the body adds 6px of its own, putting the paragraph at 16px — prose in a card, inside
  // the controls' edge rather than on it. One frame padding in both; no second value.
  //
  // NO min-height here, and that is a fix rather than an omission. It carried
  // `min-h-6` (24px) against this size's ~20px line box, and a line box sits at the
  // TOP of a taller content box, so the text rendered 2-3px above the centreline the
  // 28px controls are on. The height that centres the text lives one level up, on the
  // wrapper, as the CONTROL height. The empty case's one-line floor is `min-height:
  // 1lh` in the composer's own style block, without which an empty editable is 0px
  // tall and the placeholder lands half a line low. Both are invisible to a test
  // here, because nothing here can measure.
  const editableClass = () =>
    cn(
      // `text-start` is a PIN, not a style choice: `text-align` inherits, so any
      // centered ancestor (`Empty`'s root did exactly this) reached in and centered
      // the placeholder AND the typed text. An input control's text alignment is a
      // fact about the control, so it states it rather than inheriting it. LOGICAL
      // (`start`), not `text-left`: in RTL the correct edge is the right one, and
      // pinning the physical value would be a worse bug than the one it fixes.
      'text-foreground w-full bg-transparent text-start shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 overflow-y-auto whitespace-pre-wrap break-words',
      textClass(config.proseSize()),
      local.class,
    );

  return (
    // The flex CHILD the frame orders and sizes — and it has to be this wrapper rather
    // than the editable, because the Composer renders the editable inside a
    // `relative` div of its own: a flex-child class on the editable would land on a
    // nested block and change nothing about the row.
    <div
      data-composer-body
      class={cn(
        // Collapsed, the text shares the row with the controls and takes the room left.
        // Expanded, `order-first` lifts it above the clusters and `basis-full` claims the
        // line, so the control row wraps beneath it. `order-first` rather than a plain
        // order: the clusters carry NONE of their own, which keeps the layout decision here
        // rather than split across three class strings that must agree. Anything meant to
        // sit above the text carries the same order and comes first in the DOM.
        //
        // `min-h-7` (the same 28px every control here is) plus `items-center`, COLLAPSED
        // ONLY, puts the text on the row's centreline: one ~20px line box centred inside
        // 28px lands at 14, where the frame's `py-2.5` puts the buttons. Derived, not typed,
        // and it scales with density. Expanded it would add 8px under the line and push the
        // control row down, so the frame's padding governs there.
        //
        // `px-1.5` (6px) is the EXPANDED branch's inset, paired with the band above it: this
        // paragraph is prose in a card, so it sits 6px INSIDE the controls' 10px edge —
        // `10 + 6 = 16px`. Collapsed it carries nothing, sharing the control row.
        // `mb-1.5` is the frame's old row gap moved here: a gap is charged between every pair
        // of lines and an empty `input-top` band is a line, so the 6px below the paragraph
        // has to belong to the paragraph.
        ctx.layout() === 'collapsed'
          ? 'flex min-h-7 min-w-0 flex-1 items-center'
          : 'order-first basis-full mb-1.5 px-1.5',
      )}
    >
      <Composer
        bare
        value={ctx.value()}
        placeholder={local.placeholder as string | undefined}
        ariaLabel={local['aria-label'] as string | undefined}
        disabled={ctx.disabled}
        maxHeight={ctx.maxHeight}
        editableClass={editableClass()}
        editableRef={(el) => ctx.setTextareaRef(el)}
        triggers={local.triggers}
        kindIcons={local.kindIcons}
        // Surface the structured change (doc/entities) BEFORE the string value, so a
        // consumer that enriches its events has the latest doc when value-change fires.
        // A prompt can't start with whitespace — strip leading whitespace from the
        // string value (parity with the old textarea); the controlled round-trip
        // re-renders the editable so the stripped value shows too.
        onChange={(c) => { local.onComposerChange?.(c); ctx.setValue(c.text.replace(/^\s+/, '')); }}
        onSubmit={() => { if (!ctx.disabled) ctx.onSubmit?.(); }}
      />
    </div>
  );
}

// --- PromptInputBand ---

export interface PromptInputBandProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

/**
 * A band INSIDE the frame, claiming its own line above the text.
 *
 * It exists so a projected band cannot become a ROW ITEM: an `input-top` slot's
 * assigned node would otherwise be laid out beside the controls when collapsed,
 * consuming the frame's horizontal gap and pushing the leading cluster sideways.
 * With `basis-full` the band owns a line, and the frame wraps around it.
 *
 * It reads the layout instead of taking a prop because the inset differs by layout,
 * and padding cannot go on the slot itself: padding on a `<slot>` never reaches the
 * nodes assigned to it, so the wrapper is the only place that can carry it.
 *
 * It carries NO margin, and that is what keeps it free: it renders whether or not a
 * host projected anything, so a margin would be charged on every composer. The space
 * between a band and the text below it belongs to the host's own content.
 */
function PromptInputBand(props: PromptInputBandProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);
  const ctx = usePromptInput();
  return (
    <div
      data-composer-band
      class={cn(
        'order-first basis-full',
        // The content column's inset, expanded only: the band and the paragraph under it
        // are one column at 16px, while the control row stays on the frame's 10px.
        ctx.layout() === 'expanded' && 'px-1.5',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// --- PromptInputActions ---

export interface PromptInputActionsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

function PromptInputActions(props: PromptInputActionsProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);
  const ctx = usePromptInput();
  return (
    // A BOX, on purpose, and the reason is the caller's own distribution. A hand-composed
    // `PromptInput` + textarea + actions wants `justify-end` or `justify-between` to mean
    // something, and that needs a box to distribute in. Collapsed the box is
    // content-width, so it sits after the `flex-1` body at the trailing edge; expanded it
    // fills the wrapped line, which is what gives the caller's `justify-*` a width to
    // work across.
    //
    // The kit's own `justify-between` comes BEFORE `local.class` because the class merge
    // is last-wins, so a caller's `justify-end` overrides it rather than fighting an
    // equal-specificity rule for whichever the generated sheet happens to emit last.
    //
    // The composer's two control clusters are NOT this component: they carry `contents`
    // because the frame's own `justify-between` is what spreads them, and a box would
    // make each of them claim a whole wrapped line.
    <div
      data-prompt-input-actions
      class={cn(
        'flex items-center gap-2',
        ctx.layout() === 'collapsed' ? 'shrink-0' : 'w-full justify-between',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// --- PromptInputAction ---

export interface PromptInputActionProps {
  tooltip?: string;
  children: JSX.Element;
  side?: 'top' | 'bottom' | 'left' | 'right';
  class?: string;
}

function PromptInputAction(props: PromptInputActionProps) {
  return <>{props.children}</>;
}

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
  PromptInputBand,
  usePromptInput,
};
