import { type JSX, splitProps, createSignal, createContext, useContext } from 'solid-js';
import { cn } from '../../utils/cn';
import { useChatConfig, textClass } from '../../primitives/chat-config';
import { Composer, type TriggerDef, type ComposerChange } from '../composer/composer';
import type { ComposerDoc } from '../../primitives/composer-model';
import { useComposerExpansion, type ComposerLayout } from '../../primitives/composer-expansion';

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
    if (!local.disabled) textareaRef()?.focus();
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
          // MEASURED from the reference screenshots, not guessed: 10px above and below
          // a 28px control is the 48px collapsed row, leading 18px and trailing 14px;
          // expanded the box opens 14px above the text, separates the control row by
          // 6px and closes with the same 10px the row uses. Collapsed the controls
          // share the text's row; expanded the text claims its own line and they wrap
          // below it. See the body wrapper in `PromptInputTextarea` for how that wrap
          // is produced — it is ordering, not a second markup tree.
          //
          // `justify-between` on the EXPANDED layout, because `justify-content` is
          // resolved PER FLEX LINE: it is inert for the body (a single full-width item
          // on its own line) and it is what puts a wrapped control row at the box's
          // trailing edge. Without it, composing this frame by hand — PromptInput plus
          // a textarea plus PromptInputActions, which the stories and the kit's own
          // consumers do — lands the actions at the LEADING edge, and `justify-end` on
          // the actions cannot help because that wrapper is now a content-width flex
          // item rather than a block. Placing it is the frame's job, not a rule every
          // caller has to know.
          layout() === 'collapsed'
            ? 'flex flex-row items-center gap-2 py-2.5 pl-4.5 pr-3.5'
            : 'flex flex-wrap justify-between gap-y-1.5 pt-3.5 px-4.5 pb-2.5',
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

  // The frame (PromptInput root) still owns radius/bg/padding/focus-ring — and now
  // EVERY inset as well, so this editable carries none of its own: the paragraph and
  // the buttons beside or under it start on one edge BY CONSTRUCTION rather than by
  // two values that have to agree. `min-h-6` is one line, which is also what makes
  // the expansion rule read correctly — an empty composer is exactly one line tall
  // and therefore collapsed.
  // `text-start` is a PIN, not a style choice: `text-align` inherits, so any
  // centered ancestor (`Empty`'s root did exactly this) reached in and centered
  // the placeholder AND the typed text. An input control's text alignment is a
  // fact about the control, so it states it rather than inheriting it. LOGICAL
  // (`start`), not `text-left` — in RTL the correct edge is the right one, and
  // pinning the physical value would be a worse bug than the one it fixes.
  const editableClass = () =>
    cn(
      'text-foreground min-h-6 w-full bg-transparent text-start shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 overflow-y-auto whitespace-pre-wrap break-words',
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
        ctx.layout() === 'collapsed' ? 'min-w-0 flex-1' : 'order-first basis-full',
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
  return (
    <div class={cn('flex items-center gap-2', local.class)} {...rest}>
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
