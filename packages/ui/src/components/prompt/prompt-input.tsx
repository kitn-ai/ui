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
          // 10px above and below a 28px control is the 48px row; expanded the box opens
          // 14px above the text, separates the control row by 6px, and closes with the
          // same 10px. See the body wrapper below for how the text wraps — ordering, not
          // a second markup tree.
          //
          // The horizontal 10px is DERIVED: `(rowHeight − controlHeight) / 2` is
          // `(48 − 28) / 2`, so the controls sit centred on the pill's own arc. One value
          // at BOTH ends and in BOTH layouts, so the `+` does not jump sideways when the
          // composer expands. It replaced 18/14 measured from a reference's glyph INK,
          // which does not transfer while glyph sizes differ: matching ink pushed our
          // larger glyphs further in and the row read as inset boxes.
          //
          // `justify-between` on the EXPANDED layout: `justify-content` resolves PER FLEX
          // LINE, so it is inert for the body and load-bearing for the row below it.
          // Without it a hand-composed frame lands its actions at the LEADING edge, and
          // the caller's own `justify-end` cannot help because that wrapper is a
          // content-width flex item rather than a block.
          layout() === 'collapsed'
            ? 'flex flex-row items-center gap-2 py-2.5 px-2.5'
            : 'flex flex-wrap justify-between gap-y-1.5 pt-3.5 px-2.5 pb-2.5',
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

  // The frame (PromptInput root) still owns radius/bg/padding/focus-ring, and now
  // EVERY inset as well, so this editable carries none of its own: the paragraph and
  // the buttons beside or under it start on one edge BY CONSTRUCTION rather than by
  // two values that have to agree.
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
        // Collapsed, the text shares the row with the controls, so it takes the room
        // that is left and may shrink below its content width. Expanded, `order-first`
        // lifts it above the clusters and `basis-full` claims the whole line, so the
        // control row wraps beneath it. `order-first` rather than a plain order: the
        // clusters carry NO order of their own, which is what keeps the entire layout
        // decision here instead of split across three class strings that have to
        // agree. Anything else meant to sit ABOVE the text must carry the same order
        // and come first in the DOM — the attachment band does exactly that.
        //
        // `min-h-7` (the same 28px every control in this row is) plus `items-center`,
        // COLLAPSED ONLY, is what puts the text on the row's centreline. The editable
        // is one ~20px line box; centring a 20px box inside 28px puts its centre at 14,
        // and 28px is what the frame's `py-2.5` adds up to around either one — so the
        // paragraph and the buttons land on one line rather than 2-3px apart. Derived,
        // not typed: it is the row's control height, and it scales with density the way
        // the rest of this geometry does. Expanded it would be wrong: the frame's own
        // top padding governs where the paragraph starts, and an extra 28px box under a
        // 20px line would push the control row down by 8px.
        ctx.layout() === 'collapsed'
          ? 'flex min-h-7 min-w-0 flex-1 items-center'
          : 'order-first basis-full',
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
  usePromptInput,
};
