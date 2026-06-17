/** Generic focused example — a fixed-config live preview + its code, for the
 *  Examples section. Data-driven from element-meta + lib/codegen + sample-data,
 *  so every element's named examples reuse one component. `config` is the fixed
 *  scalar prop values; `data` selects a NAMED sample set. Modeled on the
 *  approved AttachmentsExample. */
import { onMount } from 'solid-js';
import { loadKit } from './example/kit';
import { Resizer } from './example/Resizer';
import { CodePanel } from './example/CodePanel';
import meta from '../data/element-meta.json';
import { generateSnippets, type ElementMeta, type State } from '../lib/codegen';
import { sampleFor } from '../lib/sample-data';

const camelToKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

interface Props {
  tag: string;
  /** Fixed scalar prop values (strings → attributes; booleans → properties). */
  config?: State;
  /** Key into the element's NAMED sample-data sets (e.g. "images"). */
  data?: string;
}

export default function Example(props: Props) {
  const el = (meta as ElementMeta[]).find((e) => e.tag === props.tag);
  if (!el) return <div class="text-ink-3">Unknown element: {props.tag}</div>;
  const config = props.config ?? {};
  const sample = sampleFor(props.tag, props.data);
  const theme = () => document.documentElement.dataset.theme || 'light';

  let container: HTMLDivElement | undefined;

  onMount(async () => {
    await loadKit();
    if (!container) return;
    // Enum (string) config → attributes set BEFORE upgrade for a correct first
    // render (matches a server-rendered <kc-* attr>); booleans/data → properties.
    const node = document.createElement(props.tag) as HTMLElement;
    for (const [k, v] of Object.entries(config)) if (typeof v === 'string') node.setAttribute(camelToKebab(k), v);
    node.setAttribute('theme', theme());
    node.style.display = 'block';
    // `html` in the sample is light-DOM slot content (child elements the generic
    // API can't express as props) — set it BEFORE upgrade so it's present when
    // the element first renders.
    if (typeof sample.html === 'string') node.innerHTML = sample.html;
    container.replaceChildren(node);
    customElements.upgrade(node);
    for (const [k, v] of Object.entries(sample)) if (k !== 'html') (node as any)[k] = v;
    for (const [k, v] of Object.entries(config)) if (typeof v === 'boolean') (node as any)[k] = v;
    new MutationObserver(() => node.setAttribute('theme', theme()))
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  });

  return (
    <div class="not-content my-4 overflow-hidden rounded-xl border border-line bg-surface">
      <Resizer>
        <div ref={container} class="min-h-[3.5rem]" />
      </Resizer>
      <CodePanel snippets={() => generateSnippets(el, { ...config, ...sample })} />
    </div>
  );
}
