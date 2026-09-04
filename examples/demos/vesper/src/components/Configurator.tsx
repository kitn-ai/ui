import { For, createMemo, createSignal, flush } from 'solid-js';
import type { JSX } from '@solidjs/web';
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
  children?: JSX.Element;
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
  const [added, setAdded] = createSignal(false);
  let photo!: HTMLImageElement;

  // What the reader picked -- which may be a selection made on a DIFFERENT
  // piece, because navigating between two product pages keeps this component
  // mounted and only swaps props.piece.
  const [pickedColorway, setPickedColorway] = createSignal<string | null>(null);
  const [pickedSize, setPickedSize] = createSignal<string | null>(null);

  // The selection is VALIDATED against the current piece on every read rather
  // than reset by an effect. props.piece changes during the render pass and
  // effects only run after it, so an effect leaves one render where the old
  // colorway is looked up in the new piece's list -- `.find()` returns
  // undefined, reading `.hex` off it throws, and the throw aborts the render
  // mid-navigation. The click then appears to do nothing at all.
  const swatch = createMemo(
    () =>
      props.piece.colorways.find((c) => c.name === pickedColorway()) ??
      props.piece.colorways[0]!,
  );
  const colorway = () => swatch().name;

  const size = createMemo(() => {
    const picked = pickedSize();
    if (picked && props.piece.sizes.includes(picked)) return picked;
    return props.piece.sizes[Math.min(2, props.piece.sizes.length - 1)]!;
  });

  const setColorway = (name: string) => setPickedColorway(name);
  const setSize = (value: string) => setPickedSize(value);

  const image = createMemo(() => colorwayImage(props.piece, colorway()));

  const addToBag = async () => {
    cart.add(props.piece, colorway(), size());
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
    // The photograph lands in the bag first, then the bag opens -- opening
    // straight away would cover the flight with the drawer it is flying to.
    // The flight is decoration, so it is fenced: whatever it does, the bag
    // still opens. A dropped promise here would silently cost the user the
    // only confirmation that the add worked.
    try {
      const bag = cart.bagEl();
      if (bag && photo) await flyToCart(photo, bag);
    } finally {
      cart.setOpen(true);
      // Solid 2 defers writes to the next flush. Inside an event handler the
      // framework flushes for you, but this write happens AFTER an await --
      // the synchronous handler has already returned, so nothing schedules
      // it and the bag silently never opens. Flush explicitly.
      flush();
    }
  };

  return (
    <div class={props.size === 'page' ? 'config config-page' : 'config'}>
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
                aria-checked={c.name === colorway() ? 'true' : 'false'}
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
                aria-checked={s === size() ? 'true' : 'false'}
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
