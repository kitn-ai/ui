import { For, createSignal } from 'solid-js';
import type { TimelineEntry } from '../data/types';
import './timeline.css';

export default function Timeline(props: { entries: TimelineEntry[] }) {
  const [open, setOpen] = createSignal(props.entries.at(-1)?.year ?? null);

  return (
    <ol class="timeline">
      <For each={props.entries}>
        {(entry) => {
          const isOpen = () => open() === entry.year;
          return (
            <li class="tl-item" classList={{ open: isOpen() }}>
              <button
                class="tl-trigger"
                aria-expanded={isOpen()}
                onClick={() => setOpen(isOpen() ? null : entry.year)}
              >
                <span class="tl-year serif">{entry.year}</span>
                <span class="tl-node" aria-hidden="true" />
                <span class="tl-title">{entry.title}</span>
              </button>
              <div class="tl-body" hidden={!isOpen()}>
                <p>{entry.body}</p>
              </div>
            </li>
          );
        }}
      </For>
    </ol>
  );
}
