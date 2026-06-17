/** Expand/collapse code panel — full-width clickable bar + framework tabs +
 *  syntax-highlighted code (dogfooding the kit's <kc-code-block>). `snippets` is
 *  an accessor so the playground can feed it live, state-driven code. */
import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import { loadKit } from './kit';
import { FRAMEWORKS, LANG, type Framework } from '../../lib/codegen';

export function CodePanel(props: { snippets: () => Record<Framework, string>; defaultOpen?: boolean }) {
  const [open, setOpen] = createSignal(props.defaultOpen ?? false);
  const [fw, setFw] = createSignal<Framework>('HTML');
  const [ready, setReady] = createSignal(false);
  const [codeEl, setCodeEl] = createSignal<(HTMLElement & { code?: string; language?: string }) | undefined>();

  onMount(async () => { await loadKit(); setReady(true); });
  createEffect(() => {
    const el = codeEl();
    if (!open() || !ready() || !el) return;
    el.code = props.snippets()[fw()];
    el.language = LANG[fw()];
    el.setAttribute('theme', document.documentElement.dataset.theme || 'light');
  });

  return (
    <div class="border-t border-line">
      <button type="button" onClick={() => setOpen(!open())} aria-expanded={open()}
        class="flex w-full cursor-pointer appearance-none items-center justify-center gap-2 border-0 bg-transparent py-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-brand hover:text-white">
        Code
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          class="size-[18px] transition-transform duration-200" classList={{ 'rotate-180': open() }} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <Show when={open()}>
        <div class="flex items-center gap-1 border-t border-line px-3 py-2">
          <For each={FRAMEWORKS}>
            {(f) => (
              <button type="button" onClick={() => setFw(f)}
                class="cursor-pointer appearance-none rounded-full border-0 px-3 py-1.5 text-sm font-semibold transition-colors"
                classList={{ 'bg-brand text-white': fw() === f, 'bg-transparent text-ink-3 hover:text-ink': fw() !== f }}>
                {f}
              </button>
            )}
          </For>
        </div>
        {/* @ts-expect-error custom element — kc-code-block (Shiki) */}
        <kc-code-block ref={setCodeEl} style={{ display: 'block' }} />
      </Show>
    </div>
  );
}
