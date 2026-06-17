/** Bespoke placement picker for the <kc-popover> page. Unlike the generic
 *  Playground's pill/select controls, placement is spatial — so the trigger sits
 *  in the center and the 12 placements are buttons arranged around it (the
 *  Floating UI docs pattern). Click one and the always-open popover jumps there,
 *  so you see exactly what each placement does. The popover is remounted per
 *  placement (its position is read at mount), and kept open to showcase it.
 *
 *  NB: no CSS `transform` on any ancestor of <kc-popover> — a transformed
 *  ancestor becomes the containing block for the panel's `position: fixed`, which
 *  would break Floating UI's viewport-relative positioning. */
import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { loadKit } from './example/kit';
import IconChevron from '~icons/lucide/chevron-down';

const TOP = ['top-start', 'top', 'top-end'];
const BOTTOM = ['bottom-start', 'bottom', 'bottom-end'];
const LEFT = ['left-start', 'left', 'left-end'];
const RIGHT = ['right-start', 'right', 'right-end'];

export default function PopoverPlayground() {
  const [placement, setPlacement] = createSignal('bottom');
  const [ready, setReady] = createSignal(false);
  let popEl: (HTMLElement & { open?: boolean }) | undefined;
  const theme = () => document.documentElement.dataset.theme ?? 'light';

  const init = (el: HTMLElement) => {
    popEl = el as typeof popEl;
    customElements.upgrade(el);
    el.setAttribute('theme', theme());
    (el as any).open = true; // controlled-open: always visible to showcase placement
  };

  onMount(async () => {
    await loadKit();
    setReady(true);
    const obs = new MutationObserver(() => popEl?.setAttribute('theme', theme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    onCleanup(() => obs.disconnect());
  });

  const dot = (p: string) => (
    <button
      type="button"
      aria-label={p}
      aria-pressed={placement() === p}
      title={p}
      onClick={() => setPlacement(p)}
      class="h-6 w-6 rounded-md border transition-colors"
      classList={{
        'border-brand bg-brand': placement() === p,
        'border-line bg-surface-2 hover:border-ink-3': placement() !== p,
      }}
    />
  );

  const edge = (group: string[], dir: 'h' | 'v', pos: Record<string, string>) => (
    <div class="absolute flex" style={{ ...pos, gap: '0.5rem', 'flex-direction': dir === 'h' ? 'row' : 'column' }}>
      <For each={group}>{(p) => dot(p)}</For>
    </div>
  );

  return (
    <div class="not-content my-5 rounded-xl border border-line bg-surface px-6 py-8">
      <div class="relative mx-auto flex items-center justify-center" style={{ width: '440px', 'max-width': '100%', height: '300px' }}>
        {edge(TOP, 'h', { top: '0', left: '0', right: '0', 'justify-content': 'center' })}
        {edge(BOTTOM, 'h', { bottom: '0', left: '0', right: '0', 'justify-content': 'center' })}
        {edge(LEFT, 'v', { left: '0', top: '0', bottom: '0', 'justify-content': 'center' })}
        {edge(RIGHT, 'v', { right: '0', top: '0', bottom: '0', 'justify-content': 'center' })}

        {/* centered trigger + always-open popover, remounted per placement.
            Gated on ready() so the element mounts AFTER loadKit — otherwise the
            ref runs pre-upgrade and `el.open = true` is lost. */}
        <Show when={ready()}>
        <For each={[placement()]}>
          {(p) => (
            // @ts-expect-error custom element
            <kc-popover ref={init} placement={p}>
              <button slot="trigger" type="button" class="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink">
                GPT-5.5
                <IconChevron style={{ width: '0.9rem', height: '0.9rem', opacity: 0.55 }} />
              </button>
              <div class="w-52 text-ink">
                <button type="button" class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-line/60">
                  <span><strong class="font-semibold">GPT-5.5</strong> <span class="text-ink-3">— Flagship</span></span>
                </button>
                <button type="button" class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-line/60">
                  <span>Legacy models</span>
                  <IconChevron style={{ width: '0.9rem', height: '0.9rem', opacity: 0.55 }} />
                </button>
                <button type="button" class="flex w-full items-center rounded-md px-2 py-1.5 text-left hover:bg-line/60">Settings…</button>
              </div>
              {/* @ts-expect-error custom element */}
            </kc-popover>
          )}
        </For>
        </Show>
      </div>

      <p class="mt-6 text-center text-sm text-ink-3">
        placement <code class="rounded bg-surface-2 px-1.5 py-0.5 text-ink">{placement()}</code> — click a position to move the panel
      </p>
    </div>
  );
}
