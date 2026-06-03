import { type JSX, splitProps, children as resolveChildren, For, Show } from 'solid-js';
import { cn } from '../utils/cn';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { ChevronDown, Circle } from 'lucide-solid';

// --- ChainOfThoughtItem ---

export interface ChainOfThoughtItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

function ChainOfThoughtItem(props: ChainOfThoughtItemProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);
  return (
    <div class={cn('text-muted-foreground text-sm', local.class)} {...rest}>
      {local.children}
    </div>
  );
}

// --- ChainOfThoughtTrigger ---

export interface ChainOfThoughtTriggerProps {
  children: JSX.Element;
  class?: string;
  leftIcon?: JSX.Element;
  swapIconOnHover?: boolean;
}

function ChainOfThoughtTrigger(props: ChainOfThoughtTriggerProps) {
  const swapOnHover = () => props.swapIconOnHover ?? true;

  return (
    <CollapsibleTrigger
      class={cn(
        'group text-muted-foreground hover:text-foreground flex cursor-pointer items-center justify-start gap-1 text-left text-sm transition-colors',
        props.class
      )}
    >
      <div class="flex items-center gap-2">
        <Show
          when={props.leftIcon}
          fallback={
            <span class="relative inline-flex size-4 items-center justify-center">
              <Circle class="size-2 fill-current" />
            </span>
          }
        >
          <span class="relative inline-flex size-4 items-center justify-center">
            <span
              class={cn(
                'transition-opacity',
                swapOnHover() && 'group-hover:opacity-0'
              )}
            >
              {props.leftIcon}
            </span>
            <Show when={swapOnHover()}>
              <ChevronDown class="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100 group-data-[state=open]:rotate-180" />
            </Show>
          </span>
        </Show>
        <span>{props.children}</span>
      </div>
      <Show when={!props.leftIcon}>
        <ChevronDown class="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </Show>
    </CollapsibleTrigger>
  );
}

// --- ChainOfThoughtContent ---

export interface ChainOfThoughtContentProps {
  children: JSX.Element;
  class?: string;
}

function ChainOfThoughtContent(props: ChainOfThoughtContentProps) {
  return (
    <CollapsibleContent
      class={cn(
        'text-popover-foreground data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden',
        props.class
      )}
    >
      <div class="grid grid-cols-[min-content_minmax(0,1fr)] gap-x-4">
        <div class="bg-primary/20 ml-1.75 h-full w-px group-data-[last=true]:hidden" />
        <div class="ml-1.75 h-full w-px bg-transparent group-data-[last=false]:hidden" />
        <div class="mt-2 space-y-2">{props.children}</div>
      </div>
    </CollapsibleContent>
  );
}

// --- ChainOfThought (Root) ---

export interface ChainOfThoughtProps {
  children: JSX.Element;
  class?: string;
}

function ChainOfThought(props: ChainOfThoughtProps) {
  return (
    <div class={cn('space-y-0', props.class)}>
      {props.children}
    </div>
  );
}

// --- ChainOfThoughtStep ---

export interface ChainOfThoughtStepProps {
  children: JSX.Element;
  class?: string;
  isLast?: boolean;
}

function ChainOfThoughtStep(props: ChainOfThoughtStepProps) {
  return (
    <Collapsible
      class={cn('group', props.class)}
      data-last={props.isLast ?? false}
    >
      {props.children}
      <div class="flex justify-start group-data-[last=true]:hidden">
        <div class="bg-primary/20 ml-1.75 h-4 w-px" />
      </div>
    </Collapsible>
  );
}

export {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
};
