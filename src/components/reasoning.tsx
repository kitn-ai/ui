import { type JSX, splitProps, createSignal, createContext, useContext, createEffect, onCleanup, Show } from 'solid-js';
import { cn } from '../utils/cn';
import { ChevronDown } from 'lucide-solid';
import { Markdown } from './markdown';

interface ReasoningContextValue {
  isOpen: () => boolean;
  onOpenChange: (open: boolean) => void;
}

const ReasoningContext = createContext<ReasoningContextValue>();

function useReasoningContext() {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error('useReasoningContext must be used within a Reasoning provider');
  }
  return context;
}

// --- Reasoning (Root) ---

export interface ReasoningProps {
  children: JSX.Element;
  class?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isStreaming?: boolean;
}

function Reasoning(props: ReasoningProps) {
  const [local] = splitProps(props, ['children', 'class', 'open', 'onOpenChange', 'isStreaming']);
  const [internalOpen, setInternalOpen] = createSignal(false);
  const [wasAutoOpened, setWasAutoOpened] = createSignal(false);

  const isControlled = () => local.open !== undefined;
  const isOpen = () => (isControlled() ? local.open! : internalOpen());

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled()) {
      setInternalOpen(newOpen);
    }
    local.onOpenChange?.(newOpen);
  };

  createEffect(() => {
    const streaming = local.isStreaming;
    if (streaming && !wasAutoOpened()) {
      if (!isControlled()) setInternalOpen(true);
      setWasAutoOpened(true);
    }
    if (!streaming && wasAutoOpened()) {
      if (!isControlled()) setInternalOpen(false);
      setWasAutoOpened(false);
    }
  });

  return (
    <ReasoningContext.Provider value={{ isOpen, onOpenChange: handleOpenChange }}>
      <div class={local.class}>{local.children}</div>
    </ReasoningContext.Provider>
  );
}

// --- ReasoningTrigger ---

export interface ReasoningTriggerProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children: JSX.Element;
}

function ReasoningTrigger(props: ReasoningTriggerProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);
  const { isOpen, onOpenChange } = useReasoningContext();

  return (
    <button
      class={cn('flex cursor-pointer items-center gap-2', local.class)}
      onClick={() => onOpenChange(!isOpen())}
      {...rest}
    >
      <span class="text-primary">{local.children}</span>
      <div
        class={cn(
          'transform transition-transform',
          isOpen() ? 'rotate-180' : ''
        )}
      >
        <ChevronDown class="size-4" />
      </div>
    </button>
  );
}

// --- ReasoningContent ---

export interface ReasoningContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
  markdown?: boolean;
  contentClass?: string;
}

function ReasoningContent(props: ReasoningContentProps) {
  const [local, rest] = splitProps(props, ['children', 'class', 'contentClass', 'markdown']);
  const { isOpen } = useReasoningContext();

  let contentRef: HTMLDivElement | undefined;
  let innerRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (!contentRef || !innerRef) return;

    const observer = new ResizeObserver(() => {
      if (contentRef && innerRef && isOpen()) {
        contentRef.style.maxHeight = `${innerRef.scrollHeight}px`;
      }
    });

    observer.observe(innerRef);

    if (isOpen()) {
      contentRef.style.maxHeight = `${innerRef.scrollHeight}px`;
    } else {
      contentRef.style.maxHeight = '0px';
    }

    onCleanup(() => observer.disconnect());
  });

  return (
    <div
      ref={contentRef}
      class={cn(
        'overflow-hidden transition-[max-height] duration-150 ease-out',
        local.class
      )}
      style={{ 'max-height': '0px' }}
      {...rest}
    >
      <div
        ref={innerRef}
        class={cn(
          'text-muted-foreground prose prose-sm dark:prose-invert',
          local.contentClass
        )}
      >
        <Show when={local.markdown} fallback={local.children}>
          <Markdown content={local.children as string} />
        </Show>
      </div>
    </div>
  );
}

export { Reasoning, ReasoningTrigger, ReasoningContent };
