/** Generic interactive playground — data-driven from element-meta.json. Controls
 *  are derived from the element's own props (enum → tabs, boolean → toggle,
 *  string → input); they drive BOTH the live <kc-*> preview AND the copyable
 *  per-framework code (lib/codegen). One component for every element — no
 *  per-element playground. Modeled on the approved AttachmentsDemo. */
import { createSignal, onMount, createEffect, onCleanup, For, Show, createMemo, untrack } from 'solid-js';
import { loadKit } from './example/kit';
import { Resizer } from './example/Resizer';
import { CodePanel } from './example/CodePanel';
import meta from '../data/element-meta.json';
import { generateSnippets, controlsFor, type ElementMeta, type State } from '../lib/codegen';
import { sampleFor } from '../lib/sample-data';

const camelToKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
// camelCase / kebab prop name → human control label, e.g. openInTab → "Open in tab".
const humanize = (s: string) => {
  const w = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase().trim().split(/\s+/);
  return w.map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join(' ');
};

// Optional grouping of boolean toggles for busy elements, so the control bar
// reads as labeled clusters instead of one long flat row. Tag → ordered groups
// of prop names; anything not listed falls into a trailing unlabeled group. Every
// other element keeps the flat row.
const BOOLEAN_GROUPS: Record<string, { label: string; props: string[] }[]> = {
  'kc-artifact': [
    { label: 'Toolbar', props: ['noPathField', 'noTabs', 'noNav', 'noReload', 'noHome', 'openInTab'] },
    { label: 'Behavior', props: ['expandable', 'maximized', 'standalone', 'readonlyPath'] },
  ],
};

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

export default function Playground(props: { tag: string }) {
  const el = (meta as ElementMeta[]).find((e) => e.tag === props.tag);
  if (!el) return <div class="text-ink-3">Unknown element: {props.tag}</div>;
  const controls = controlsFor(el);
  const enums = controls.filter((c) => c.kind === 'enum') as Extract<ReturnType<typeof controlsFor>[number], { kind: 'enum' }>[];
  const bools = controls.filter((c) => c.kind === 'boolean') as Extract<ReturnType<typeof controlsFor>[number], { kind: 'boolean' }>[];
  const sample = sampleFor(props.tag);

  // Resolve the optional boolean grouping for this element (null = flat row).
  type BoolControl = (typeof bools)[number];
  const boolGroups: { label: string; items: BoolControl[] }[] | null = (() => {
    const spec = BOOLEAN_GROUPS[props.tag];
    if (!spec) return null;
    const byProp = new Map(bools.map((c) => [c.prop, c]));
    const used = new Set<string>();
    const groups = spec
      .map((g) => {
        const items = g.props.map((p) => byProp.get(p)).filter((c): c is BoolControl => !!c);
        items.forEach((c) => used.add(c.prop));
        return { label: g.label, items };
      })
      .filter((g) => g.items.length);
    const leftover = bools.filter((c) => !used.has(c.prop));
    if (leftover.length) groups.push({ label: '', items: leftover });
    return groups;
  })();

  // Control state: every control's prop → current value (seeded from defaults).
  const seed: State = {};
  for (const c of controls) seed[c.prop] = c.kind === 'enum' ? (c.default ?? c.options[0]) : c.kind === 'boolean' ? c.default : (c.default ?? '');
  const [state, setState] = createSignal<State>(seed);
  const set = (prop: string, v: unknown) => setState((s) => ({ ...s, [prop]: v }));

  const [ready, setReady] = createSignal(false);
  const [host, setHost] = createSignal<HTMLElement | undefined>();
  const [log, setLog] = createSignal<string[]>([]);

  // Enum props are applied as markup ATTRIBUTES via a remount key (correct even
  // for props that aren't reactive after first render); booleans/strings/data
  // are applied reactively to the live element below.
  const enumKey = createMemo(() => enums.map((c) => `${c.prop}=${state()[c.prop]}`).join('&'));

  // The combined state used to generate code = controls + the non-default sample
  // props that the preview actually sets (so the snippet matches the preview).
  const codeState = createMemo<State>(() => ({ ...state(), ...Object.fromEntries(Object.keys(sample).map((k) => [k, sample[k]])) }));

  let container: HTMLDivElement | undefined;
  const theme = () => document.documentElement.dataset.theme || 'light';

  onMount(async () => {
    await loadKit();
    setReady(true);
    // keep the preview themed when the site theme toggles
    new MutationObserver(() => host()?.setAttribute('theme', theme()))
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  });

  // Remount the element whenever an ENUM control changes — created imperatively
  // with the enum values set as markup attributes BEFORE upgrade, so the first
  // render is correct even for props that aren't reactive after render (matches
  // how a server-rendered <kc-* attr> upgrades).
  createEffect(() => {
    enumKey(); // track enum changes → remount
    if (!ready() || !container) return;
    const enumVals = untrack(() => Object.fromEntries(enums.map((c) => [c.prop, state()[c.prop]])));
    const node = document.createElement(props.tag) as HTMLElement;
    for (const c of enums) node.setAttribute(camelToKebab(c.prop), String(enumVals[c.prop]));
    node.setAttribute('theme', theme());
    node.style.display = 'block';
    // light-DOM slot content (child elements props can't express)
    if (typeof sample.html === 'string') node.innerHTML = sample.html;
    if (typeof sample.previewHeight === 'string' && container) {
      container.style.height = sample.previewHeight as string;
      node.style.height = '100%';
    }
    container.replaceChildren(node);
    customElements.upgrade(node);
    setHost(node);
    const listeners: Array<[string, EventListener]> = [];
    for (const ev of el.events ?? []) {
      const fn: EventListener = (e) => setLog((l) => [...l.slice(-5), `${ev.name}  →  ${JSON.stringify((e as CustomEvent).detail)}`]);
      node.addEventListener(ev.name, fn);
      listeners.push([ev.name, fn]);
    }
    onCleanup(() => listeners.forEach(([n, fn]) => node.removeEventListener(n, fn)));
  });

  // Reactive props (booleans/strings) + sample data, applied to the CURRENT element.
  createEffect(() => {
    const h = host();
    if (!h) return;
    for (const [k, v] of Object.entries(sample)) if (k !== 'html' && k !== 'previewHeight') (h as any)[k] = v;
    for (const c of bools) (h as any)[c.prop] = Boolean(state()[c.prop]);
    for (const c of controls) if (c.kind === 'string' && state()[c.prop]) h.setAttribute(camelToKebab(c.prop), String(state()[c.prop]));
  });

  return (
    <div class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface">
      <Show when={controls.length}>
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4">
          <Show when={enums.length}>
          <div class="flex flex-wrap items-center gap-y-2 py-2.5">
            <For each={enums}>
              {(c, i) => (
                <>
                  {/* vertical divider between separate option groups */}
                  <Show when={i() > 0}>
                    <div class="mx-3 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
                  </Show>
                  <div class="inline-flex items-center gap-1" role="radiogroup" aria-label={c.prop}>
                    <For each={c.options}>
                      {(opt) => (
                        <button role="radio" aria-checked={state()[c.prop] === opt} onClick={() => set(c.prop, opt)}
                          class="cursor-pointer appearance-none rounded-full border-0 px-3 py-1 text-sm capitalize transition-all"
                          classList={{
                            // selected: semi-transparent dark fill + pressed-in inset shadow, strong ink text
                            'bg-[var(--kc-pressed)] text-ink font-semibold shadow-[inset_0_1px_2px_rgb(0_0_0/0.22)]': state()[c.prop] === opt,
                            'bg-transparent text-ink-3 font-medium hover:text-ink hover:bg-line/60': state()[c.prop] !== opt,
                          }}>
                          {opt}
                        </button>
                      )}
                    </For>
                  </div>
                </>
              )}
            </For>
          </div>
          </Show>
          <Show
            when={boolGroups}
            fallback={
              <div class="flex flex-wrap items-center gap-5 py-2">
                <For each={bools}>
                  {(c) => <Toggle checked={Boolean(state()[c.prop])} onChange={(v) => set(c.prop, v)} label={humanize(c.prop)} />}
                </For>
              </div>
            }
          >
            <div class="flex w-full flex-col gap-2 py-2.5">
              <For each={boolGroups!}>
                {(g) => (
                  <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <Show when={g.label}>
                      <span class="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{g.label}</span>
                    </Show>
                    <For each={g.items}>
                      {(c) => <Toggle checked={Boolean(state()[c.prop])} onChange={(v) => set(c.prop, v)} label={humanize(c.prop)} />}
                    </For>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      <Resizer>
        <div ref={container} class="min-h-[3.5rem]" />
      </Resizer>

      <Show when={(el.events ?? []).length}>
        <div class="border-t border-line bg-surface-2 px-4 py-3">
          <div class="mb-1.5 flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
              <span class="size-1.5 rounded-full bg-brand"></span> Console
            </div>
            <button type="button" onClick={() => setLog([])} disabled={!log().length}
              class="cursor-pointer appearance-none border-0 bg-transparent text-xs font-medium text-ink-3 transition-colors hover:text-ink disabled:opacity-40">Clear</button>
          </div>
          <div class="min-h-[1.75rem] font-mono text-sm leading-relaxed text-ink-2">
            <Show when={log().length} fallback={<span class="font-sans text-ink-3">Interactions appear here.</span>}>
              <For each={log()}>{(line) => <div class="whitespace-pre-wrap">{line}</div>}</For>
            </Show>
          </div>
        </div>
      </Show>

      <CodePanel snippets={() => generateSnippets(el, codeState())} />
    </div>
  );
}
