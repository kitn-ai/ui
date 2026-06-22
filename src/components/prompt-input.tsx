import { type JSX, splitProps, createSignal, createContext, useContext } from 'solid-js';
import { cn } from '../utils/cn';
import { useChatConfig, textClass } from '../primitives/chat-config';
import { Composer } from './composer';

// --- Context ---

interface PromptInputContextType {
  isLoading: boolean;
  value: () => string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
  textareaRef: HTMLElement | undefined;
  setTextareaRef: (el: HTMLElement) => void;
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
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: JSX.Element;
  disabled?: boolean;
}

function PromptInput(props: PromptInputProps) {
  const [local, rest] = splitProps(props, [
    'isLoading', 'value', 'onValueChange', 'maxHeight', 'onSubmit',
    'children', 'disabled', 'class', 'onClick',
  ]);

  const [internalValue, setInternalValue] = createSignal(local.value ?? '');
  let textareaRef: HTMLElement | undefined;

  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    local.onValueChange?.(newValue);
  };

  const handleClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = (e) => {
    if (!local.disabled) textareaRef?.focus();
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
        get textareaRef() { return textareaRef; },
        setTextareaRef: (el) => { textareaRef = el; },
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
          'bg-muted/40 cursor-text rounded-xl p-2 shadow-xs',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0',
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
}

function PromptInputTextarea(props: PromptInputTextareaProps) {
  const [local] = splitProps(props, ['class', 'placeholder']);
  const ctx = usePromptInput();
  const config = useChatConfig();

  // The editable mirrors the original <textarea>'s classes EXACTLY so swapping in
  // the contenteditable composer is visually identical. The frame (PromptInput
  // root) still owns radius/bg/padding/focus-ring; auto-grow is native to a
  // contenteditable block (capped via max-height on the editable).
  const editableClass = () =>
    cn(
      'text-foreground min-h-[44px] w-full bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 overflow-y-auto whitespace-pre-wrap break-words',
      textClass(config.proseSize()),
      local.class,
    );

  return (
    <Composer
      bare
      value={ctx.value()}
      placeholder={local.placeholder as string | undefined}
      disabled={ctx.disabled}
      maxHeight={ctx.maxHeight}
      editableClass={editableClass()}
      editableRef={(el) => ctx.setTextareaRef(el)}
      onChange={(c) => ctx.setValue(c.text)}
      onSubmit={() => { if (!ctx.disabled) ctx.onSubmit?.(); }}
    />
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
