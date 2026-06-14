import { type JSX, Show, splitProps } from 'solid-js';
import { cn } from '../utils/cn';
import { Button } from '../ui/button';

export interface PromptSuggestionProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children: JSX.Element | string;
  variant?: 'outline' | 'ghost' | 'default';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
  highlight?: string;
  /** Render as a full-width, left-aligned list row (the "suggested questions"
   *  idiom) instead of a rounded pill. Wraps long text. Ignored in highlight
   *  mode, which is always a list row. */
  block?: boolean;
}

function PromptSuggestion(props: PromptSuggestionProps) {
  const [local, rest] = splitProps(props, ['children', 'variant', 'size', 'class', 'highlight', 'block']);

  const isHighlightMode = () => local.highlight !== undefined && local.highlight.trim() !== '';
  const content = () => typeof local.children === 'string' ? local.children : '';

  return (
    <Show
      when={isHighlightMode()}
      fallback={
        <Show
          when={local.block}
          fallback={
            <Button
              variant={local.variant ?? 'outline'}
              size={local.size ?? 'lg'}
              class={cn('rounded-full', local.class)}
              {...rest}
            >
              {local.children}
            </Button>
          }
        >
          <Button
            variant={local.variant ?? 'outline'}
            size={local.size ?? 'md'}
            class={cn(
              'h-auto w-full cursor-pointer justify-start rounded-xl px-4 py-2.5',
              'text-left text-sm leading-snug whitespace-normal text-pretty',
              local.class,
            )}
            {...rest}
          >
            {local.children}
          </Button>
        </Show>
      }
    >
      <Show
        when={content()}
        fallback={
          <Button
            variant={local.variant ?? 'ghost'}
            size={local.size ?? 'sm'}
            class={cn(
              'w-full cursor-pointer justify-start rounded-xl py-2',
              'hover:bg-accent',
              local.class
            )}
            {...rest}
          >
            {local.children}
          </Button>
        }
      >
        <Button
          variant={local.variant ?? 'ghost'}
          size={local.size ?? 'sm'}
          class={cn(
            'w-full cursor-pointer justify-start gap-0 rounded-xl py-2',
            'hover:bg-accent',
            local.class
          )}
          {...rest}
        >
          {renderHighlighted(content(), local.highlight!)}
        </Button>
      </Show>
    </Show>
  );
}

function renderHighlighted(text: string, highlight: string) {
  const trimmed = highlight.trim();
  const textLower = text.toLowerCase();
  const highlightLower = trimmed.toLowerCase();
  const index = textLower.indexOf(highlightLower);

  if (index === -1) {
    return <span class="text-foreground/70 whitespace-pre-wrap">{text}</span>;
  }

  const before = text.substring(0, index);
  const matched = text.substring(index, index + highlightLower.length);
  const after = text.substring(index + matched.length);

  return (
    <>
      <Show when={before}>
        <span class="text-foreground/70 whitespace-pre-wrap">{before}</span>
      </Show>
      <span class="text-primary font-medium whitespace-pre-wrap">{matched}</span>
      <Show when={after}>
        <span class="text-foreground/70 whitespace-pre-wrap">{after}</span>
      </Show>
    </>
  );
}

export { PromptSuggestion };
