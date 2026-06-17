/** A focused, named example for the Examples section: a fixed-config live
 *  preview + its code. (The playground above is for exploring; these show and
 *  name each real presentation with copyable code.) */
import { createSignal, onMount, createEffect } from 'solid-js';
import { loadKit } from './example/kit';
import { Resizer } from './example/Resizer';
import { CodePanel } from './example/CodePanel';
import { snippetsFor, IMAGE_ITEMS, MIXED_ITEMS, type State } from './attachments-code';

interface Props {
  variant: 'grid' | 'inline' | 'list';
  hoverCard?: boolean;
  removable?: boolean;
  images?: boolean; // use the image-only set (galleries) vs the mixed set
}

export default function AttachmentsExample(props: Props) {
  const [ready, setReady] = createSignal(false);
  let host: (HTMLElement & { items?: unknown[] }) | undefined;

  onMount(async () => {
    await loadKit();
    if (host) customElements.upgrade(host); // ensure upgraded before we set props (client:visible timing)
    setReady(true);
    const sync = () => host?.setAttribute('theme', document.documentElement.dataset.theme || 'light');
    sync();
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  });

  // variant is set as a markup ATTRIBUTE below (correct at first upgrade — the
  // element's variant isn't reactive after render; see known-kit-issues).
  // hoverCard/removable/items ARE reactive, so set them as properties here.
  createEffect(() => {
    if (!ready() || !host) return;
    host.items = props.images ? IMAGE_ITEMS : MIXED_ITEMS;
    (host as any).hoverCard = !!props.hoverCard;
    (host as any).removable = !!props.removable;
  });

  const state = (): State => ({ variant: props.variant, hoverCard: !!props.hoverCard, removable: !!props.removable });

  return (
    <div class="not-content my-4 overflow-hidden rounded-xl border border-line bg-surface">
      <Resizer>
        {/* variant in markup → correct at first upgrade (see known-kit-issues) */}
        {/* @ts-expect-error custom element */}
        <kc-attachments variant={props.variant} ref={(el: HTMLElement) => (host = el)} style={{ display: 'block' }} />
      </Resizer>
      <CodePanel snippets={() => snippetsFor(state())} />
    </div>
  );
}
