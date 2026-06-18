/** Proves the new <kc-popover> primitive by rebuilding the ChatGPT-style header
 *  menu: a trigger button opens a popover card holding arbitrary content — a
 *  flagship model row, an expandable "Legacy models" group, and a "Temporary
 *  chat" toggle. All slotted as light DOM; kc-popover frames + positions it. */
import { createSignal, onMount, onCleanup, Show, For } from 'solid-js';
import { loadKit } from './example/kit';
import IconChevron from '~icons/lucide/chevron-down';
import IconCheck from '~icons/lucide/check';
import IconGhost from '~icons/lucide/ghost';

const LEGACY = ['GPT-4o', 'GPT-4.1', 'GPT-4o mini'];

export default function PopoverMenuDemo() {
  const [legacyOpen, setLegacyOpen] = createSignal(false);
  const [temporary, setTemporary] = createSignal(false);
  const [model, setModel] = createSignal('GPT-5.5');
  let popEl: HTMLElement | undefined;
  const theme = () => document.documentElement.dataset.theme ?? 'light';

  onMount(async () => {
    await loadKit();
    if (popEl) {
      customElements.upgrade(popEl);
      popEl.setAttribute('theme', theme());
    }
    const obs = new MutationObserver(() => popEl?.setAttribute('theme', theme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    onCleanup(() => obs.disconnect());
  });

  const row = 'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-line/60';

  return (
    <div class="not-content my-5 flex min-h-[360px] items-start justify-center rounded-xl border border-line bg-surface p-6">
      {/* @ts-expect-error custom element */}
      <kc-popover ref={(el: HTMLElement) => (popEl = el)} placement="bottom-start">
        <button
          slot="trigger"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink hover:bg-line/60"
        >
          {model()}
          <IconChevron style={{ width: '1rem', height: '1rem', opacity: 0.55 }} />
        </button>

        <div class="w-72 text-ink">
          <button type="button" class="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-line/60" onClick={() => setModel('GPT-5.5')}>
            <span class="mt-0.5 inline-flex w-4 shrink-0">
              <Show when={model() === 'GPT-5.5'}><IconCheck style={{ width: '1rem', height: '1rem' }} /></Show>
            </span>
            <span>
              <span class="block text-sm font-medium">GPT-5.5</span>
              <span class="block text-xs text-ink/60">Flagship model</span>
            </span>
          </button>

          <button type="button" class="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-line/60" onClick={() => setLegacyOpen(!legacyOpen())}>
            <span>Legacy models</span>
            <IconChevron style={{ width: '1rem', height: '1rem', opacity: 0.55, transform: legacyOpen() ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          <Show when={legacyOpen()}>
            <For each={LEGACY}>{(m) => (
              <button type="button" class="flex w-full items-center gap-2 rounded-md py-1.5 pl-8 pr-2 text-left text-sm hover:bg-line/60" onClick={() => setModel(m)}>
                <span class="inline-flex w-4 shrink-0">
                  <Show when={model() === m}><IconCheck style={{ width: '1rem', height: '1rem' }} /></Show>
                </span>
                {m}
              </button>
            )}</For>
          </Show>

          <div class="my-1 h-px bg-line" />

          <div class={row} style={{ 'justify-content': 'space-between' }}>
            <span class="flex items-center gap-2"><IconGhost style={{ width: '1rem', height: '1rem', opacity: 0.7 }} /> Temporary chat</span>
            <button
              type="button"
              role="switch"
              aria-checked={temporary()}
              aria-label="Temporary chat"
              onClick={() => setTemporary(!temporary())}
              class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
              style={{ background: temporary() ? 'var(--kc-brand, #d6207f)' : 'var(--color-line, #d4d4d8)' }}
            >
              <span class="inline-block h-4 w-4 rounded-full bg-white transition-transform" style={{ transform: temporary() ? 'translateX(1.125rem)' : 'translateX(0.125rem)' }} />
            </button>
          </div>
        </div>
      </kc-popover>
    </div>
  );
}
