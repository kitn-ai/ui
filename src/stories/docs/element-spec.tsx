import { For, Show } from 'solid-js';
import meta from '../../elements/element-meta.json';

type Prop = { name: string; type: string; default?: string; scalar: boolean; description: string };
type Event = { name: string; detail: string | null; description: string };
type Composed = { name: string; group: string; storyId?: string };
type ElementMeta = { tag: string; className: string; props: Prop[]; events: Event[]; composedFrom: Composed[]; tokens: string[] };

const all = meta as unknown as ElementMeta[];

const th = 'text-left font-semibold px-2 py-1.5 border-b border-border text-foreground';
const td = 'px-2 py-1.5 border-b border-border align-top text-muted-foreground';
const code = 'font-mono text-[0.85em] text-code-foreground';

export function ElementSpec(props: { tag: string }) {
  const el = () => all.find((e) => e.tag === props.tag);
  return (
    <Show when={el()} fallback={<p>Unknown element: {props.tag}</p>}>
      {(e) => (
        <div class="text-sm space-y-6">
          <section>
            <h3 class="text-title font-semibold text-foreground mb-2">Properties</h3>
            <table class="w-full border-collapse">
              <thead><tr><th class={th}>Property</th><th class={th}>Attribute</th><th class={th}>Type / values</th><th class={th}>Default</th></tr></thead>
              <tbody>
                <For each={e().props}>{(p) => (
                  <tr>
                    <td class={td}><span class={code}>{p.name}</span></td>
                    <td class={td}>{p.scalar ? <span class={code}>{kebab(p.name)}</span> : <span class="opacity-50">— (property only)</span>}</td>
                    <td class={td}><span class={code}>{p.type}</span></td>
                    <td class={td}>{p.default ? <span class={code}>{p.default}</span> : '—'}</td>
                  </tr>
                )}</For>
              </tbody>
            </table>
          </section>

          <Show when={e().events.length}>
            <section>
              <h3 class="text-title font-semibold text-foreground mb-2">Events</h3>
              <p class="text-muted-foreground mb-2 text-xs">Non-bubbling <span class={code}>CustomEvent</span>s on the element; the payload is on <span class={code}>event.detail</span>.</p>
              <table class="w-full border-collapse">
                <thead><tr><th class={th}>Event</th><th class={th}>detail</th><th class={th}>Description</th></tr></thead>
                <tbody>
                  <For each={e().events}>{(ev) => (
                    <tr>
                      <td class={td}><span class={code}>{ev.name}</span></td>
                      <td class={td}><span class={code}>{ev.detail ?? '—'}</span></td>
                      <td class={td}>{ev.description}</td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </section>
          </Show>

          <Show when={e().composedFrom.length}>
            <section>
              <h3 class="text-title font-semibold text-foreground mb-2">Composed from</h3>
              <p class="text-muted-foreground mb-2 text-xs">This element wraps these SolidJS components:</p>
              <div class="flex flex-wrap gap-2">
                <For each={e().composedFrom}>{(c) => (
                  <a class="rounded-md bg-muted px-2 py-1 text-xs text-foreground hover:bg-accent no-underline" href={`?path=/docs/${c.storyId}`}>
                    {c.group}/{c.name}
                  </a>
                )}</For>
              </div>
            </section>
          </Show>

          <section>
            <h3 class="text-title font-semibold text-foreground mb-2">Theming</h3>
            <p class="text-muted-foreground text-xs">
              Themed by the global design tokens — override any <span class={code}>--color-*</span> token to rebrand (see the <a href="?path=/docs/theming-token-reference--docs" class="text-primary">Token Reference</a>).
              <Show when={e().tokens.length}>{' '}This element also reads:{' '}<For each={e().tokens}>{(t, i) => <><span class={code}>{t}</span>{i() < e().tokens.length - 1 ? ', ' : ''}</>}</For>.</Show>
            </p>
          </section>
        </div>
      )}
    </Show>
  );
}

function kebab(name: string) { return name.replace(/([A-Z])/g, '-$1').toLowerCase(); }
