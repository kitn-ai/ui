import { For, createSignal } from 'solid-js';
import './accordion.css';

/** Neumorphic inset panels, one open at a time. */
export default function Accordion(props: {
  items: { id: string; title: string; body: string }[];
  initial?: string;
}) {
  const [open, setOpen] = createSignal<string | null>(props.initial ?? null);

  return (
    <div class="accordion">
      <For each={props.items}>
        {(item) => {
          const isOpen = () => open() === item.id;
          return (
            <div class={isOpen() ? 'acc-item open' : 'acc-item'}>
              <h3>
                <button
                  class="acc-trigger"
                  aria-expanded={isOpen() ? 'true' : 'false'}
                  aria-controls={`acc-${item.id}`}
                  onClick={() => setOpen(isOpen() ? null : item.id)}
                >
                  <span>{item.title}</span>
                  <svg class="acc-chev" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </h3>
              {/* Always in the DOM, collapsed by grid-template-rows: the panel
                  animates open without measuring, and its text stays
                  server-rendered and findable. */}
              <div class="acc-panel" id={`acc-${item.id}`} role="region" hidden={!isOpen()}>
                <div class="acc-panel-inner neu-well">{item.body}</div>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
}
