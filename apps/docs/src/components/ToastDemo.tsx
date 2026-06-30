/** Live demo for the toast primitive, in the Playground shell (controls · preview ·
 *  Console · Code). Toast is IMPERATIVE/transient, so a static data-driven Playground
 *  can't show it well — instead, trigger buttons raise toasts into a contained preview
 *  box. The demo drives a declarative <kai-toast-region> scoped to that box (so the
 *  stack stays IN the box, not the viewport) and the Position pills set the region's
 *  `position` — which now anchors to the chosen corner of the box. */
import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { loadKit } from './example/kit';
import { CodePanel } from './example/CodePanel';
import { FRAMEWORKS, type Framework } from '../lib/codegen';

type AnyEl = HTMLElement & Record<string, unknown>;
type Position = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
type Stack = 'expanded' | 'collapsed';
interface DemoToast {
  id: string;
  message: string;
  variant?: 'neutral' | 'success';
  duration?: number;
  action?: { label: string; onAction: () => void };
  target?: HTMLElement;
}

const POSITIONS: Position[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
const STACKS: Stack[] = ['expanded', 'collapsed'];

// Spatial placement for the position picker (Floating-UI-style): each position is
// a button pinned to that corner/edge of a little rectangle standing in for the
// toast area, so you pick WHERE toasts appear rather than reading a label.
const POS_PLACE: Record<Position, string> = {
  'top-left': 'top-1 left-1',
  'top-center': 'top-1 left-1/2 -translate-x-1/2',
  'top-right': 'top-1 right-1',
  'bottom-left': 'bottom-1 left-1',
  'bottom-center': 'bottom-1 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-1 right-1',
};

const SNIPPET_JS = `import { toast, configureToasts } from '@kitn.ai/ui/elements';

// Opt the imperative singleton into the collapsed pile (call once at app start).
configureToasts({ stack: 'collapsed', position: 'top-right' });

toast('Saved your changes');               // neutral
toast.success('Copied to clipboard');      // emerald check
toast('Conversation dismissed', {          // with an Undo action
  action: { label: 'Undo', onAction: () => restore() },
});
const t = toast('Generating report…', { duration: 0 }); // sticky
t.update({ message: 'Report ready', variant: 'success', duration: 2000 });`;

const SNIPPET_HTML = `<kai-toast-region position="top-right" stack="collapsed"></kai-toast-region>

<script type="module">
  import { toast } from '@kitn.ai/ui/elements';

  toast.success('Copied to clipboard');
  toast('Conversation dismissed', {
    action: { label: 'Undo', onAction: () => restore() },
  });
<\/script>`;

const snippets = (): Record<Framework, string> =>
  Object.fromEntries(FRAMEWORKS.map((f) => [f, f === 'HTML' ? SNIPPET_HTML : SNIPPET_JS])) as Record<Framework, string>;

let seq = 0;

const TRIGGER =
  'cursor-pointer rounded-lg border border-line bg-surface-2 px-3.5 py-2 text-sm font-medium ' +
  'text-ink transition-colors hover:border-ink-3 disabled:opacity-40';

export default function ToastDemo() {
  let region: AnyEl | undefined;
  let box: HTMLDivElement | undefined;
  const [position, setPosition] = createSignal<Position>('top-right');
  const [stack, setStack] = createSignal<Stack>('collapsed');
  const [toasts, setToasts] = createSignal<DemoToast[]>([]);
  const [log, setLog] = createSignal<string[]>([]);
  const push = (m: string) => setLog((l) => [...l.slice(-5), m]);

  const theme = () => document.documentElement.dataset.theme || 'light';

  // Single source of truth: keep the signal AND the element's `toasts` in lockstep,
  // with STABLE item identities. A controlled <kai-toast-region> never prunes itself
  // — kai-dismiss (below) is our cue to drop the item from BOTH, or it lingers in the
  // element's array and a later update re-materializes it. Items carry the box as
  // `target` from creation (the region is scoped to the box), so we never re-map +
  // re-key survivors — re-keying a mid-dismiss toast would re-mount it and it reappears.
  const sync = (next: DemoToast[]) => {
    setToasts(next);
    if (region) region.toasts = next;
  };
  const raise = (t: Omit<DemoToast, 'id' | 'target'>) => {
    seq += 1;
    sync([...toasts(), { ...t, id: `d${seq}`, target: box }]);
  };

  const choosePosition = (p: Position) => {
    setPosition(p);
    region?.setAttribute('position', p);
  };

  const chooseStack = (s: Stack) => {
    setStack(s);
    region?.setAttribute('stack', s);
  };

  onMount(async () => {
    await loadKit();
    if (!region || !box) return;
    customElements.upgrade(region);
    region.target = box;
    region.setAttribute('position', position());
    region.setAttribute('stack', stack());
    region.setAttribute('theme', theme());
    region.addEventListener('kai-dismiss', (e: Event) => {
      const d = (e as CustomEvent).detail;
      push(`kai-dismiss  →  ${JSON.stringify(d)}`);
      // drop it from BOTH the signal and the element so it's gone for good (and the
      // queue promotes the next one) — not just hidden but lingering in region.toasts.
      sync(toasts().filter((t) => t.id !== d.id));
    });
    region.addEventListener('kai-action', (e: Event) => {
      push(`kai-action  →  ${JSON.stringify((e as CustomEvent).detail)}`);
    });
    const obs = new MutationObserver(() => region?.setAttribute('theme', theme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    onCleanup(() => obs.disconnect());
  });

  const PILL = 'cursor-pointer appearance-none rounded-full border-0 px-3 py-1 text-sm capitalize transition-all';
  const SELECTED = 'bg-[var(--kai-pressed)] text-ink font-semibold shadow-[inset_0_1px_2px_rgb(0_0_0/0.22)]';
  const UNSELECTED = 'bg-transparent text-ink-3 font-medium hover:text-ink hover:bg-line/60';
  const stackCls = (s: Stack) => `${PILL} ${s === stack() ? SELECTED : UNSELECTED}`;

  return (
    <div class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface">
      {/* Controls — Stack mode. Position is picked ON the canvas below (popover-style). */}
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2.5">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Stack</span>
        <div class="flex gap-1" role="radiogroup" aria-label="Stack mode">
          <For each={STACKS}>
            {(s) => (
              <button type="button" role="radio" aria-checked={s === stack()} class={stackCls(s)} onClick={() => chooseStack(s)}>
                {s}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Preview — trigger buttons raise toasts into the box below */}
      <div class="p-5">
        <div class="mb-4 flex flex-wrap gap-2">
          <button type="button" class={TRIGGER} onClick={() => raise({ message: 'Saved your changes' })}>Neutral</button>
          <button type="button" class={TRIGGER} onClick={() => raise({ message: 'Copied to clipboard', variant: 'success' })}>Success</button>
          <button
            type="button"
            class={TRIGGER}
            onClick={() => raise({ message: 'Conversation dismissed', action: { label: 'Undo', onAction: () => raise({ message: 'Restored', variant: 'success' }) } })}
          >Undo action</button>
          <button type="button" class={TRIGGER} onClick={() => raise({ message: 'Generating report…', duration: 0 })}>Sticky</button>
          <button
            type="button"
            class={TRIGGER}
            onClick={() => { raise({ message: 'Connecting…' }); raise({ message: 'Syncing files' }); raise({ message: 'All set', variant: 'success' }); }}
          >Stack three</button>
          <button type="button" class={`${TRIGGER} ml-auto`} disabled={!toasts().length} onClick={() => sync([])}>Clear</button>
        </div>

        <div ref={box} class="relative h-[300px] overflow-hidden rounded-lg border border-line bg-surface-2/40">
          {/* Position picker — dots on the canvas edges (the popover-demo pattern):
              click a corner and the toasts anchor there. */}
          <div class="pointer-events-none absolute inset-0 z-10" role="radiogroup" aria-label="Toast position">
            <For each={POSITIONS}>
              {(p) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={p === position()}
                  aria-label={p}
                  title={p}
                  onClick={() => choosePosition(p)}
                  class={`pointer-events-auto absolute size-4 rounded border transition-colors ${POS_PLACE[p]}`}
                  classList={{
                    'border-brand bg-brand': p === position(),
                    'border-line bg-surface hover:border-ink-3': p !== position(),
                  }}
                />
              )}
            </For>
          </div>
          <Show when={!toasts().length}>
            <span class="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ink-3">
              Raise a toast — it lands at the highlighted corner. Collapsed piles them; hover to expand.
            </span>
          </Show>
          {/* @ts-expect-error custom element — viewport-fixed, anchored to this box */}
          <kai-toast-region ref={(el: HTMLElement) => (region = el as AnyEl)} />
        </div>
        <p class="mt-3 text-center text-sm text-ink-3">
          position <code class="rounded bg-surface-2 px-1.5 py-0.5 text-ink">{position()}</code> — click a corner to move the toasts
        </p>
      </div>

      {/* Console */}
      <div class="border-t border-line bg-surface-2 px-4 py-3">
        <div class="mb-1.5 flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
            <span class="size-1.5 rounded-full bg-brand"></span> Console
          </div>
          <button type="button" onClick={() => setLog([])} disabled={!log().length}
            class="cursor-pointer appearance-none border-0 bg-transparent text-xs font-medium text-ink-3 transition-colors hover:text-ink disabled:opacity-40">Clear</button>
        </div>
        <div class="min-h-[1.75rem] font-mono text-sm leading-relaxed text-ink-2">
          <Show when={log().length} fallback={<span class="font-sans text-ink-3">Dismiss a toast or press Undo — events appear here.</span>}>
            <For each={log()}>{(line) => <div class="whitespace-pre-wrap break-words">{line}</div>}</For>
          </Show>
        </div>
      </div>

      <CodePanel snippets={snippets} />
    </div>
  );
}
