/** Interactive playground for kc-attachments — controls drive BOTH the live
 *  preview and the copyable code. Resizable preview + event console + the
 *  shared CodePanel. (Focused, named examples live in AttachmentsExample.) */
import { createSignal, onMount, createEffect, onCleanup, For, Show } from 'solid-js';
import { loadKit } from './example/kit';
import { Resizer } from './example/Resizer';
import { CodePanel } from './example/CodePanel';
import { snippetsFor, MIXED_ITEMS, type State } from './attachments-code';

type Variant = 'grid' | 'inline' | 'list';
const VARIANTS: Variant[] = ['grid', 'inline', 'list'];

function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={props.checked} onClick={() => props.onChange(!props.checked)}
      class="inline-flex cursor-pointer appearance-none items-center gap-2 border-0 bg-transparent text-sm text-ink-2">
      <span class="relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full transition-colors duration-150"
        classList={{ 'bg-brand': props.checked, 'bg-ink-3/40': !props.checked }}>
        <span class="inline-block size-3.5 rounded-full bg-white transition-transform duration-150"
          classList={{ 'translate-x-[15px]': props.checked, 'translate-x-0.5': !props.checked }} />
      </span>
      {props.label}
    </button>
  );
}

export default function AttachmentsDemo() {
  const [ready, setReady] = createSignal(false);
  const [variant, setVariant] = createSignal<Variant>('grid');
  const [hoverCard, setHoverCard] = createSignal(false);
  const [removable, setRemovable] = createSignal(true);
  const [log, setLog] = createSignal<string[]>([]);
  // host is a SIGNAL because the element remounts when `variant` changes (the
  // element's variant isn't reactive post-render — see known-kit-issues — so we
  // re-create it, keyed on variant, with the variant set as a markup attribute).
  const [host, setHost] = createSignal<(HTMLElement & { items?: unknown[] }) | undefined>();

  const state = (): State => ({ variant: variant(), hoverCard: hoverCard(), removable: removable() });

  onMount(async () => {
    await loadKit();
    setReady(true);
    const sync = () => host()?.setAttribute('theme', document.documentElement.dataset.theme || 'light');
    sync();
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  });

  // apply reactive props + (re)bind the event listener whenever the element
  // (re)mounts or hoverCard/removable change.
  createEffect(() => {
    const h = host();
    if (!ready() || !h) return;
    customElements.upgrade(h);
    h.items = MIXED_ITEMS;
    (h as any).hoverCard = hoverCard();
    (h as any).removable = removable();
    h.setAttribute('theme', document.documentElement.dataset.theme || 'light');
    const onRemove = (e: Event) => setLog((l) => [...l.slice(-5), `kc-remove  →  { id: "${(e as CustomEvent).detail.id}" }`]);
    h.addEventListener('kc-remove', onRemove);
    onCleanup(() => h.removeEventListener('kc-remove', onRemove));
  });

  return (
    <div class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface">
      {/* controls */}
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4">
        <div class="flex" role="tablist">
          <For each={VARIANTS}>
            {(v) => (
              <button role="tab" aria-selected={variant() === v} onClick={() => setVariant(v)}
                class="-mb-px cursor-pointer appearance-none border-x-0 border-t-0 border-b-2 bg-transparent px-3 py-3 text-sm font-semibold capitalize transition-colors"
                classList={{ 'border-brand text-ink': variant() === v, 'border-transparent text-ink-3 hover:text-ink': variant() !== v }}>
                {v}
              </button>
            )}
          </For>
        </div>
        <div class="flex items-center gap-5">
          <Toggle checked={hoverCard()} onChange={setHoverCard} label="hover card" />
          <Toggle checked={removable()} onChange={setRemovable} label="removable" />
        </div>
      </div>

      {/* resizable preview — keyed on variant so the element remounts with the
          correct variant attribute when the tab changes */}
      <Resizer>
        <Show when={variant()} keyed>
          {(v) => (<>
            {/* @ts-expect-error custom element */}
            <kc-attachments variant={v} ref={setHost} style={{ display: 'block' }} />
          </>)}
        </Show>
      </Resizer>

      {/* event console */}
      <div class="border-t border-line bg-surface-2 px-4 py-3">
        <div class="mb-1.5 flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
            <span class="size-1.5 rounded-full bg-brand"></span> Console
          </div>
          <button type="button" onClick={() => setLog([])} disabled={!log().length}
            class="cursor-pointer appearance-none border-0 bg-transparent text-xs font-medium text-ink-3 transition-colors hover:text-ink disabled:opacity-40">Clear</button>
        </div>
        <div class="min-h-[1.75rem] font-mono text-sm leading-relaxed text-ink-2">
          <Show when={log().length} fallback={<span class="font-sans text-ink-3">Interactions appear here — remove an attachment to see its event.</span>}>
            <For each={log()}>{(line) => <div class="whitespace-pre">{line}</div>}</For>
          </Show>
        </div>
      </div>

      {/* code (reflects the controls) */}
      <CodePanel snippets={() => snippetsFor(state())} />
    </div>
  );
}
