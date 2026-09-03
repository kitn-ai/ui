import { For, createMemo, createSignal } from 'solid-js';
import type { Piece } from '../data/types';
import { colorwayImage } from '../data/catalog';
import { useCart } from '../cart/CartProvider';
import { flyToCart } from '../cart/flight';
import { money } from '../lib/format';
import './configurator.css';

interface Props {
  piece: Piece;
  /** The product page gives it more room and a larger type scale. */
  size?: 'panel' | 'page';
  children?: unknown;
}

/**
 * Choose a colorway and a size, then add to the bag.
 *
 * The controls are clay -- the one material reserved for things a hand
 * touches -- and the photograph swaps with the colorway wherever that
 * colorway has its own. It is the site's most-repeated interaction, so it
 * lives in one component and appears identically on the home page and the
 * product page.
 */
export default function Configurator(props: Props) {
  const cart = useCart();
  const [colorway, setColorway] = createSignal(props.piece.colorways[0]!.name);
  const [size, setSize] = createSignal(
    props.piece.sizes[Math.min(2, props.piece.sizes.length - 1)]!,
  );
  const [added, setAdded] = createSignal(false);
  let photo!: HTMLImageElement;

  const image = createMemo(() => colorwayImage(props.piece, colorway()));
  const swatch = createMemo(
    () => props.piece.colorways.find((c) => c.name === colorway())!,
  );

  const addToBag = async () => {
    cart.add(props.piece, colorway(), size());
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
    const bag = cart.bagEl();
    if (bag && photo) await flyToCart(photo, bag);
  };

  return (
    <div class="config" classList={{ 'config-page': props.size === 'page' }}>
      <figure class="config-photo photo">
        <div class="ph">
          {/* Keyed on the source so a colorway change cross-fades rather than
              snapping to the new frame. */}
          <img
            ref={photo}
            src={image()}
            alt={`${props.piece.name} in ${colorway()}`}
            width="560"
            height="700"
          />
        </div>
        <span class="tag">AW26</span>
      </figure>

      <div class="config-detail">
        <p class="kicker">Vesper / {props.piece.category}</p>
        <h2 class="config-name serif">{props.piece.name}</h2>
        <p class="config-price serif">{money(props.piece.price)}</p>
        <p class="config-desc">{props.piece.description}</p>

        <div class="opt-label">
          <span>Color</span>
          <b>{colorway()}</b>
          <span class="opt-dot" style={{ background: swatch().hex }} aria-hidden="true" />
        </div>
        <div class="swatches" role="radiogroup" aria-label="Color">
          <For each={props.piece.colorways}>
            {(c) => (
              <button
                class="clay swatch"
                role="radio"
                aria-checked={c.name === colorway()}
                aria-label={c.name}
                onClick={() => setColorway(c.name)}
              >
                <i style={{ background: c.hex }} />
              </button>
            )}
          </For>
        </div>

        <div class="opt-label">
          <span>Size</span>
          <b>{size()}</b>
        </div>
        <div class="sizes" role="radiogroup" aria-label="Size">
          <For each={props.piece.sizes}>
            {(s) => (
              <button
                class="clay size"
                role="radio"
                aria-checked={s === size()}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            )}
          </For>
        </div>

        <button class="btn btn-primary config-add" onClick={addToBag}>
          {added() ? 'Added to bag' : 'Add to bag'}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            {added() ? <path d="M5 13l4 4L19 7" /> : <><path d="M5 12h13" /><path d="M12 6l6 6-6 6" /></>}
          </svg>
        </button>
        <p class="config-ship">Free shipping over {money(500)}. Returns within 30 days.</p>

        {props.children}
      </div>
    </div>
  );
}
