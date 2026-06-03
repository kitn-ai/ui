import { type JSX, splitProps, createSignal, createContext, useContext, createEffect, on } from 'solid-js';
import { cn } from '../utils/cn';
import { useChatConfig, textClass } from '../primitives/chat-config';

// --- Context ---

interface PromptInputContextType {
  isLoading: boolean;
  value: () => string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
  textareaRef: HTMLTextAreaElement | undefined;
  setTextareaRef: (el: HTMLTextAreaElement) => void;
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
  let textareaRef: HTMLTextAreaElement | undefined;

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
        disabled: local.disabled,
        get textareaRef() { return textareaRef; },
        setTextareaRef: (el) => { textareaRef = el; },
      }}
    >
      <div
        onClick={handleClick}
        class={cn(
          'bg-muted/40 cursor-text rounded-xl p-2 shadow-xs',
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
  const [local, rest] = splitProps(props, ['class', 'onKeyDown', 'disableAutosize']);
  const ctx = usePromptInput();
  const config = useChatConfig();

  function adjustHeight(el: HTMLTextAreaElement | undefined) {
    if (!el || local.disableAutosize) return;
    el.style.height = 'auto';
    const maxH = ctx.maxHeight;
    if (typeof maxH === 'number') {
      el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
    } else {
      el.style.height = `min(${el.scrollHeight}px, ${maxH})`;
    }
  }

  function handleRef(el: HTMLTextAreaElement) {
    ctx.setTextareaRef(el);
    adjustHeight(el);
  }

  createEffect(on(
    () => [ctx.value(), ctx.maxHeight, local.disableAutosize],
    () => {
      if (ctx.textareaRef && !local.disableAutosize) {
        adjustHeight(ctx.textareaRef);
      }
    }
  ));

  function handleInput(e: InputEvent & { currentTarget: HTMLTextAreaElement }) {
    adjustHeight(e.currentTarget);
    ctx.setValue(e.currentTarget.value);
  }

  function handleKeyDown(e: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ctx.onSubmit?.();
    }
    if (typeof local.onKeyDown === 'function') {
      (local.onKeyDown as (e: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => void)(e);
    }
  }

  return (
    <textarea
      ref={handleRef}
      value={ctx.value()}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      class={cn(
        'text-primary min-h-[44px] w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
        textClass(config.proseSize()),
        local.class
      )}
      rows={1}
      disabled={ctx.disabled}
      {...rest}
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
