import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import { cn } from '../../utils/cn';
import { Button } from '../../components/button/button';
import { ArrowDown } from 'lucide-solid';
import { defineWebComponent } from '../define/define';

interface Props extends Record<string, unknown> {
  // When omitted the element walks up the DOM (outside its own shadow root) to find the
  // nearest scrollable ancestor. Mirrors the `for` convention of `<label for="...">`.
  /** CSS id of the scroll container to control. */
  for?: string;
  /** Button visual variant: `'outline' | 'ghost' | 'default'`. Defaults to
   *  `'outline'`. */
  variant?: 'outline' | 'ghost' | 'default';
  /** Button size token. Defaults to `'icon'` (square). */
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
  /** The button's accessible name. It is announced whether or not the label is
   *  visible, so the text is always localisable. Defaults to
   *  `'Scroll to bottom'`. */
  label?: string;
  // When the text is visible it IS the accessible name, so nothing gets announced twice.
  /** Also render `label` visibly beside the icon. Default `false` (icon-only). */
  showLabel?: boolean;
}

/** Events fired by `<kai-scroll-button>`. */
interface Events {
  /** Emitted when the user clicks the button and `scrollToBottom()` is
   *  called. Carries no detail; consumers use it to know a manual scroll
   *  occurred. */
  'kai-scroll': void;
}

const SCROLL_THRESHOLD = 50;

/** The accessible name used when the consumer does not supply one. */
const DEFAULT_LABEL = 'Scroll to bottom';

/**
 * The floating chip surface. Mirrors `surfaceClasses` in
 * `components/scroll/scroll-button.tsx`: the shared `outline` button variant is
 * `bg-muted/50`, half-transparent, so message text showed through a control
 * floating over scrolling content and its edge measured about 1.05:1 against
 * the thread behind it (SC 1.4.11 wants 3:1). `bg-card` is the opaque surface
 * popovers and dropdowns already use, `border-input` is the kit's control edge
 * and clears 3:1 in both themes, and `kai-elevation` is the shared themeable
 * float shadow that keeps an opaque button reading as ABOVE the content.
 * `ghost` and `default` are explicit consumer choices about the fill, so they
 * keep theirs.
 */
function surfaceClasses(variant: Props['variant']) {
  return (variant ?? 'outline') === 'outline'
    ? 'border border-input bg-card text-card-foreground kai-elevation'
    : 'kai-elevation';
}

/** Walk the composed tree upwards from `startEl` (outside shadow roots) to
 *  find the nearest scrollable ancestor. */
function findScrollableAncestor(startEl: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = startEl.parentElement;
  while (el && el !== document.documentElement) {
    const style = getComputedStyle(el);
    const overflow = style.overflow + style.overflowY;
    if (/auto|scroll/.test(overflow) && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * A floating button that scrolls a container to its bottom, visible while the
 * container is scrolled up.
 */
defineWebComponent<Props, Events>('kai-scroll-button', {
  for: undefined,
  variant: 'outline',
  size: 'icon',
  label: undefined,
  showLabel: undefined,
}, (props, { element, dispatch, flag }) => {
  const [isAtBottom, setIsAtBottom] = createSignal(true);
  let containerEl: HTMLElement | null = null;
  let cleanupFns: (() => void)[] = [];

  function checkIfAtBottom() {
    if (!containerEl) return;
    const { scrollTop, scrollHeight, clientHeight } = containerEl;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD);
  }

  function scrollToBottom() {
    if (!containerEl) return;
    containerEl.scrollTo({ top: containerEl.scrollHeight, behavior: 'smooth' });
    setIsAtBottom(true);
  }

  function attach(el: HTMLElement) {
    containerEl = el;
    el.addEventListener('scroll', checkIfAtBottom, { passive: true });
    checkIfAtBottom();
    cleanupFns.push(() => el.removeEventListener('scroll', checkIfAtBottom));
  }

  function detach() {
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
    containerEl = null;
  }

  onMount(() => {
    // Resolve the scroll container: `for` id → nearest scrollable ancestor.
    const target = props.for
      ? document.getElementById(props.for)
      : findScrollableAncestor(element);

    if (target) attach(target);
  });

  onCleanup(detach);

  const label = () => (props.label as string | undefined) ?? DEFAULT_LABEL;
  const showLabel = () => flag('showLabel');

  return (
    <Button
      variant={props.variant ?? 'outline'}
      size={props.size ?? 'icon'}
      // When the label is visible it IS the accessible name; an aria-label on
      // top of it would override the visible text and the two could disagree.
      aria-label={showLabel() ? undefined : label()}
      // While at the bottom this button is fully transparent and pointer-inert,
      // but it stayed in the tab order — a keyboard user landed on a control
      // they could not see. Mirrors ScrollButton in components/scroll/scroll-button.tsx.
      tabindex={isAtBottom() ? -1 : 0}
      aria-hidden={isAtBottom() ? 'true' : undefined}
      class={cn(
        'rounded-lg transition-all duration-150 ease-out',
        surfaceClasses(props.variant),
        showLabel() ? 'h-9 w-auto gap-1.5 px-3 text-sm' : '',
        !isAtBottom()
          ? 'translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none translate-y-4 scale-95 opacity-0',
      )}
      onClick={() => {
        scrollToBottom();
        dispatch('kai-scroll');
      }}
    >
      {/* h-4, not the h-5 the chevron used, and the same reasoning as
          components/scroll/scroll-button.tsx: a ChevronDown only inks the lower part of
          its 24px viewBox, so at a 20px box its visible mass is small, while
          ArrowDown inks the full height (stem + head) and at 20px crowded the
          padding. Re-checked here because this button box is 36px (size="icon")
          rather than the Solid component's 40px, and 16px balances both. It is
          also the size lucide pairs with text-sm, which the label renders at. */}
      <ArrowDown class="h-4 w-4 shrink-0" aria-hidden="true" />
      <Show when={showLabel()}>
        <span>{label()}</span>
      </Show>
    </Button>
  );
});
