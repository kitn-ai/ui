import { For, Show, createEffect } from 'solid-js';
import './size-guide.css';

const ROWS = [
  ['XS', '81', '63', '88'],
  ['S', '86', '68', '93'],
  ['M', '91', '73', '98'],
  ['L', '97', '79', '104'],
  ['XL', '104', '86', '111'],
];

/** Glass modal: it floats over the product, so it is glass. */
export default function SizeGuide(props: { open: boolean; onClose: () => void }) {
  let closeButton!: HTMLButtonElement;

  // Cleanup is the RETURNED function -- onCleanup here would bind to the
  // component owner, which outlives every open/close cycle.
  createEffect(
    () => props.open,
    (open) => {
      if (!open) return;
      queueMicrotask(() => closeButton?.focus());
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { e.preventDefault(); props.onClose(); }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    },
  );

  return (
    <Show when={props.open}>
      <div class="guide-scrim" onClick={props.onClose} aria-hidden="true" />
      <div class="guide glass" role="dialog" aria-modal="true" aria-label="Size guide">
        <header class="guide-head">
          <div>
            <p class="kicker">Measurements</p>
            <p class="guide-title serif">Size guide</p>
          </div>
          <button ref={closeButton} class="clay guide-close" onClick={props.onClose} aria-label="Close the size guide">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <table class="guide-table">
          <thead>
            <tr><th scope="col">Size</th><th scope="col">Bust</th><th scope="col">Waist</th><th scope="col">Hip</th></tr>
          </thead>
          <tbody>
            <For each={ROWS}>
              {(row) => (
                <tr>
                  <th scope="row">{row[0]}</th>
                  <For each={row.slice(1)}>{(cell) => <td>{cell}cm</td>}</For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <p class="guide-note">
          Body measurements, not garment measurements. Vesper is cut generously;
          between two sizes, take the smaller.
        </p>
      </div>
    </Show>
  );
}
