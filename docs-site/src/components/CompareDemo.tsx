/** Live demo for <kai-compare> — pick a response (collapses + reports the pair),
 *  replay both candidates streaming, and toggle the layout. */
import { createSignal, onMount, onCleanup, For } from 'solid-js';
import { loadKit, syncKaiTheme } from './example/kit';

type AnyEl = HTMLElement & Record<string, unknown>;
type Layout = 'auto' | 'columns' | 'tabs';
type Candidate = { id: string; label?: string; content: string; streaming?: boolean };
type CompareData = { prompt: string; candidates: Candidate[] };

const PROMPT = 'Fix the N+1 query when loading a cart.';
const A =
  'Batch the per-item lookups into **one query** (`WHERE id IN (…)`) and hydrate the cart from the result — one round-trip instead of N.';
const B =
  'Add a cache in front of the per-item lookup so repeat hits are fast, and let the slow path warm it.';

const baseData = (): CompareData => ({
  prompt: PROMPT,
  candidates: [
    { id: 'a', label: 'Response A', content: A },
    { id: 'b', label: 'Response B', content: B },
  ],
});

export default function CompareDemo() {
  let host: AnyEl | undefined;
  const [status, setStatus] = createSignal('Pick a response…');
  const [layout, setLayout] = createSignal<Layout>('auto');

  onMount(async () => {
    await loadKit();
    if (!host) return;
    customElements.upgrade(host);
    host.data = baseData();
    host.addEventListener('kai-compare-select', (e: Event) => {
      const d = (e as CustomEvent).detail;
      setStatus(`Preferred ${d.chosenId} · rejected ${d.rejectedIds.join(', ')} → send this pair to your model.`);
    });
    onCleanup(syncKaiTheme(host));
  });

  const applyLayout = (l: Layout) => {
    setLayout(l);
    host?.setAttribute('layout', l);
  };

  const reset = () => {
    if (!host) return;
    host.selection = undefined;
    host.data = baseData();
    setStatus('Pick a response…');
  };

  const replay = () => {
    if (!host) return;
    setStatus('Streaming both candidates…');
    const chunks: Record<string, string[]> = { a: A.match(/\S+\s*/g) ?? [A], b: B.match(/\S+\s*/g) ?? [B] };
    let ia = 0;
    let ib = 0;
    host.data = {
      prompt: PROMPT,
      candidates: [
        { id: 'a', label: 'Response A', content: '', streaming: true },
        { id: 'b', label: 'Response B', content: '', streaming: true },
      ],
    } satisfies CompareData;
    const tick = () => {
      if (!host) return;
      if (ia >= chunks.a.length && ib >= chunks.b.length) {
        setStatus('Pick a response…');
        return;
      }
      if (ia < chunks.a.length) ia += 1;
      if (ib < chunks.b.length) ib += 1;
      const cur = host.data as CompareData;
      host.data = {
        ...cur,
        candidates: cur.candidates.map((c) =>
          c.id === 'a'
            ? { ...c, content: chunks.a.slice(0, ia).join(''), streaming: ia < chunks.a.length }
            : { ...c, content: chunks.b.slice(0, ib).join(''), streaming: ib < chunks.b.length },
        ),
      } satisfies CompareData;
      setTimeout(tick, 90);
    };
    tick();
  };

  const CTL =
    'cursor-pointer rounded-md border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:text-ink';
  const CTL_ON =
    'cursor-pointer rounded-md border border-brand bg-brand/10 px-2.5 py-1 text-xs font-medium text-ink transition-colors';

  return (
    <div class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface">
      <div class="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5 text-xs">
        <span class="font-semibold uppercase tracking-wider text-ink-3">Layout</span>
        <For each={['auto', 'columns', 'tabs'] as Layout[]}>
          {(l) => (
            <button type="button" class={layout() === l ? CTL_ON : CTL} onClick={() => applyLayout(l)}>{l}</button>
          )}
        </For>
        <span class="mx-1 h-3 w-px bg-line" />
        <button type="button" class={CTL} onClick={replay}>Replay streaming</button>
        <button type="button" class={CTL} onClick={reset}>Reset</button>
      </div>
      <div class="p-5">
        {/* @ts-expect-error custom element */}
        <kai-compare ref={(el: HTMLElement) => (host = el as AnyEl)} style={{ display: 'block' }} />
        <p class="mt-3.5 text-sm text-ink-3">{status()}</p>
      </div>
    </div>
  );
}
