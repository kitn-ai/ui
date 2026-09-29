import { type JSX, splitProps } from 'solid-js';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Empty: a composable empty-state block, modeled on shadcn/ui's `Empty`.
 * Structure:
 *   Empty
 *   ├── EmptyHeader
 *   │   ├── EmptyMedia   (icon / avatar)
 *   │   ├── EmptyTitle
 *   │   └── EmptyDescription
 *   └── EmptyContent     (actions / suggestions)
 *
 * Styling is token-driven (`--color-*`), so it themes with the rest of the kit.
 * No visible border by default; add `border border-dashed` via `class` for a card.
 */

// --- Empty (root) ---

export interface EmptyProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

function Empty(props: EmptyProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div
      // NO `text-center` / `text-balance` on the root. Both INHERIT, and
      // `EmptyContent` is an arbitrary-content slot — a `PromptInput` dropped in
      // it picked the centering up and rendered its placeholder and its typed
      // text centred (owner report). Centering is a fact about the empty state's
      // OWN title/description, so it lives on `EmptyTitle`/`EmptyDescription`
      // (and `EmptyHeader`, which wraps only those). The root still centres its
      // children as BOXES via `items-center`, which is what it actually wants.
      data-slot="empty"
      class={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-6 rounded-lg p-6',
        // NOT `justify-center`, and the difference only shows when content is TALLER
        // than the box: `justify-center` splits that overflow in both directions, so
        // the first child sits above the box and no amount of scrolling reaches it.
        // A centred auto margin instead collapses to zero on the overflow side, which
        // leaves tall content top-aligned and scrollable — centred while there is room,
        // ordinary when there is not.
        //
        // The OUTER pair, not `my-auto` on every child: auto margins on each child
        // would put free space BETWEEN them as well, spreading a header away from the
        // content it belongs to. Two margins keep the group centred and leave the gaps
        // to `gap-*`, which is what declares them.
        '[&>*:first-child]:mt-auto [&>*:last-child]:mb-auto',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// --- EmptyHeader ---

export interface EmptyHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

function EmptyHeader(props: EmptyHeaderProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div
      data-slot="empty-header"
      class={cn('flex max-w-sm flex-col items-center gap-2 text-center', local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// --- EmptyMedia ---

const emptyMediaVariants = cva(
  'flex shrink-0 items-center justify-center mb-2 [&_svg]:size-6',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: 'bg-muted text-foreground size-10 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface EmptyMediaProps
  extends JSX.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyMediaVariants> {
  children: JSX.Element;
}

function EmptyMedia(props: EmptyMediaProps) {
  const [local, rest] = splitProps(props, ['class', 'variant', 'children']);
  return (
    <div
      data-slot="empty-media"
      data-variant={local.variant ?? 'default'}
      class={cn(emptyMediaVariants({ variant: local.variant }), local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// --- EmptyTitle ---

export interface EmptyTitleProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

function EmptyTitle(props: EmptyTitleProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div
      data-slot="empty-title"
      // Carries its own centering + balance (the root no longer broadcasts them
      // to every slotted child), so a title is centred wherever it is placed.
      class={cn('text-title font-medium tracking-tight text-center text-balance', local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// --- EmptyDescription ---

export interface EmptyDescriptionProps extends JSX.HTMLAttributes<HTMLParagraphElement> {
  children: JSX.Element;
}

function EmptyDescription(props: EmptyDescriptionProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <p
      data-slot="empty-description"
      class={cn(
        // Same as EmptyTitle: own the centering + balance rather than inheriting
        // it from a root that also reaches arbitrary slotted content.
        'text-muted-foreground text-body text-center text-balance [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </p>
  );
}

// --- EmptyContent ---

export interface EmptyContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

function EmptyContent(props: EmptyContentProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div
      data-slot="empty-content"
      class={cn(
        // HOW WIDE THE SLOTTED CONTENT MAY BE is a fact about the CONSUMER's
        // content, so it is theirs to declare: `--kai-empty-content-width`
        // (default `24rem`, the prose measure `max-w-sm` is; the same shape as
        // `--kai-dock-launcher-size, 56px` and `--kai-kbd-cap-gap, 0.125rem`).
        //
        // THAT SEAM EXISTS BECAUSE ITS ABSENCE WAS BEING WORKED AROUND. The
        // assistant block slots a two-up guide-card grid in here, and the prose
        // cap left each card 188px. With no way to say "this content may be
        // wider", the block had to make the grid WIDER THAN THE BOX IT IS
        // SLOTTED INTO (`min(48rem, ...)` + `min-width: 100%`). A child that
        // paints outside the box its parent declares is a landmine: an
        // `overflow: hidden` ancestor clips it, anything measuring the parent
        // gets a number that is wrong, and nothing in the kit said the width was
        // negotiable. The variable inherits - set it on `<kai-empty>` (or any
        // ancestor) and this box widens, the slotted content stays INSIDE it.
        //
        // The default is unchanged, so nothing moves until it is set; and
        // `class="max-w-none"` still wins for a one-off (`cn` is last-wins).
        'flex w-full max-w-[var(--kai-empty-content-width,24rem)] min-w-0 flex-col items-center gap-2 text-sm text-balance',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  emptyMediaVariants,
};
