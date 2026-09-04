import { For, Show, createSignal, flush } from 'solid-js';
import type { Look } from '../data/types';
import { pieceById, colorwayImage } from '../data/catalog';
import { useCart } from '../cart/CartProvider';
import { flyToCart } from '../cart/flight';
import { money } from '../lib/format';
import './hotspots.css';

/**
 * Shop the look: glass pins over the photograph that open into a card.
 *
 * Each pin is a real <button>, so the garments in a look are reachable by
 * keyboard in the order they were marked. A hover-only hotspot would put the
 * only route to those products behind a pointer.
 */
export default function Hotspots(props: { look: Look }) {
  const cart = useCart();
  const [open, setOpen] = createSignal<string | null>(null);

  return (
    <figure class="look-figure photo">
      <div class="ph">
        <img src={props.look.image} alt={props.look.title} width="800" height="1000" />
      </div>

      <For each={props.look.hotspots}>
        {(hotspot) => {
          const piece = pieceById(hotspot.pieceId)!;
          const id = `${props.look.slug}-${piece.id}`;
          const isOpen = () => open() === id;
          let thumb!: HTMLImageElement;

          return (
            <div
              class={hotspot.x > 62 ? 'pin-wrap pin-right' : 'pin-wrap'}
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
            >
              <button
                class="pin glass-sm"
                aria-expanded={isOpen() ? 'true' : 'false'}
                aria-label={`${piece.name}, ${money(piece.price)}`}
                onClick={() => setOpen(isOpen() ? null : id)}
              >
                <span class="pin-dot" aria-hidden="true" />
              </button>

              <Show when={isOpen()}>
                <div class="pin-card glass">
                  <img
                    ref={thumb}
                    src={piece.image}
                    alt=""
                    width="56"
                    height="70"
                    class="pin-thumb"
                  />
                  <div class="pin-body">
                    <a class="pin-name serif" href={`/shop/${piece.slug}`}>
                      {piece.name}
                    </a>
                    <p class="pin-price">{money(piece.price)}</p>
                    <button
                      class="btn btn-quiet pin-add"
                      onClick={async () => {
                        const colorway = piece.colorways[0]!.name;
                        cart.add(piece, colorway, piece.sizes[Math.min(2, piece.sizes.length - 1)]!);
                        void colorwayImage(piece, colorway);
                        try {
                          const bag = cart.bagEl();
                          if (bag && thumb) await flyToCart(thumb, bag);
                        } finally {
                          // Decoration never gates the outcome. flush()
                          // because these writes land after an await, where
                          // Solid 2 has nothing scheduling the update.
                          setOpen(null);
                          cart.setOpen(true);
                          flush();
                        }
                      }}
                    >
                      Add to bag
                    </button>
                  </div>
                  <button
                    class="pin-close"
                    onClick={() => setOpen(null)}
                    aria-label="Close"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              </Show>
            </div>
          );
        }}
      </For>

      <figcaption>{props.look.caption}</figcaption>
    </figure>
  );
}
