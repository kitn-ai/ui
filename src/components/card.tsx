import { type JSX, Show, splitProps, mergeProps, createUniqueId } from 'solid-js';
import { cn } from '../utils/cn';
import { AlertTriangle } from 'lucide-solid';

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Heading rendered in the card chrome (the contract's CardEnvelope.title).
   *  NB: NOT `title` — `title` is a reserved IDL attr (see define.tsx RESERVED). */
  heading?: string;
  /** Optional supporting text under the heading. */
  description?: string;
  /** Media region (image/icon) rendered above the heading. */
  media?: JSX.Element;
  /** Footer action region (buttons). */
  actions?: JSX.Element;
  /** When set, the card renders its standard inline error state INSTEAD of body. */
  errorMessage?: string;
  /** Compact spacing for dense lists of cards. */
  dense?: boolean;
  /** Stable id for the heading (so composing cards can `aria-labelledby` it).
   *  Auto-generated when omitted. */
  headingId?: string;
}

/**
 * `Card` — the shared presentational chrome every native card composes from:
 * an optional media region, a heading + description, a body (default slot), an
 * actions footer, and one consistent inline **error** state (the contract's
 * "never a broken/partial card" rule). It is intentionally chrome-only: it reads
 * no `CardContext` and emits no `CardEvent` — the cards that compose it (e.g.
 * `kc-form`) own the contract interaction.
 */
export function Card(props: CardProps): JSX.Element {
  const merged = mergeProps({ dense: false }, props);
  const [local, rest] = splitProps(merged, [
    'heading',
    'description',
    'media',
    'actions',
    'errorMessage',
    'dense',
    'headingId',
    'class',
    'children',
  ]);

  const autoId = createUniqueId();
  const headingId = () => local.headingId ?? `kc-card-heading-${autoId}`;
  const hasError = () => local.errorMessage !== undefined && local.errorMessage !== '';
  const hasHeader = () => Boolean(local.heading) || Boolean(local.description);

  return (
    <div
      class={cn(
        'flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm',
        local.dense ? 'gap-2 p-3' : 'gap-3 p-4',
        local.class,
      )}
      {...rest}
    >
      <Show when={local.media}>
        <div class="overflow-hidden rounded-lg">{local.media}</div>
      </Show>

      <Show when={hasHeader()}>
        <div class={cn('flex flex-col', local.dense ? 'gap-0.5' : 'gap-1')}>
          <Show when={local.heading}>
            <h3 id={headingId()} class="text-base font-semibold leading-tight text-foreground">
              {local.heading}
            </h3>
          </Show>
          <Show when={local.description}>
            <p class="text-sm text-muted-foreground">{local.description}</p>
          </Show>
        </div>
      </Show>

      <Show
        when={hasError()}
        fallback={
          <>
            <Show when={local.children}>
              <div class="text-sm text-foreground">{local.children}</div>
            </Show>
            <Show when={local.actions}>
              <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
                {local.actions}
              </div>
            </Show>
          </>
        }
      >
        <div
          role="alert"
          class="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertTriangle size={16} class="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{local.errorMessage}</span>
        </div>
      </Show>
    </div>
  );
}
