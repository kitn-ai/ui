import { For, Show, createEffect, createMemo, onCleanup } from 'solid-js';
import { useCart } from './CartProvider';
import { FREE_SHIPPING } from './store';
import { pieceById, colorwayImage } from '../data/catalog';
import { money } from '../lib/format';
import './cart.css';

/**
 * The bag, as a glass panel over the page. Glass because it floats: there is
 * a page behind it that should stay visible, which is the whole argument for
 * the material.
 */
export default function CartDrawer() {
  const cart = useCart();
  let panel!: HTMLDivElement;
  let closeButton!: HTMLButtonElement;
  let opener: HTMLElement | null = null;

  const lines = createMemo(() =>
    cart.items.map((line) => ({ line, piece: pieceById(line.pieceId)! })),
  );

  const progress = createMemo(() =>
    Math.min(100, Math.round((cart.subtotal() / FREE_SHIPPING) * 100)),
  );

  createEffect(
    () => cart.open(),
    (open) => {
    if (!open) return;
    opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    // Focus the panel, not the first control: the reader should hear the
    // dialog's name before its buttons.
    queueMicrotask(() => closeButton?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cart.setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    onCleanup(() => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      opener?.focus();
    });
    },
  );

  return (
    <Show when={cart.open()}>
      <div class="cart-scrim" onClick={() => cart.setOpen(false)} aria-hidden="true" />
      <div
        ref={panel}
        class="cart-drawer glass"
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
      >
        <header class="cart-head">
          <div>
            <div class="kicker">Your bag</div>
            <p class="cart-count">
              {cart.count()} {cart.count() === 1 ? 'piece' : 'pieces'}
            </p>
          </div>
          <button
            ref={closeButton}
            class="cart-close clay"
            onClick={() => cart.setOpen(false)}
            aria-label="Close the bag"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <Show
          when={lines().length}
          fallback={
            <div class="cart-empty">
              <p class="serif">Nothing in the bag yet.</p>
              <p>Pieces you add will collect here.</p>
              <a class="btn btn-quiet" href="/shop" onClick={() => cart.setOpen(false)}>
                Browse the collection
              </a>
            </div>
          }
        >
          <ul class="cart-lines">
            <For each={lines()}>
              {({ line, piece }) => (
                <li class="cart-line">
                  <img
                    class="cart-thumb"
                    src={colorwayImage(piece, line.colorway)}
                    alt=""
                    width="64"
                    height="80"
                  />
                  <div class="cart-line-body">
                    <a
                      class="cart-line-name serif"
                      href={`/shop/${piece.slug}`}
                      onClick={() => cart.setOpen(false)}
                    >
                      {piece.name}
                    </a>
                    <p class="cart-line-spec">
                      {line.colorway} / {line.size}
                    </p>
                    <div class="cart-line-foot">
                      <div class="stepper" role="group" aria-label={`Quantity, ${piece.name}`}>
                        <button
                          class="clay step"
                          onClick={() => cart.setQty(line.key, line.qty - 1)}
                          aria-label="One fewer"
                        >
                          &minus;
                        </button>
                        <span class="step-n" aria-live="polite">{line.qty}</span>
                        <button
                          class="clay step"
                          onClick={() => cart.setQty(line.key, line.qty + 1)}
                          aria-label="One more"
                        >
                          +
                        </button>
                      </div>
                      <span class="cart-line-price serif">
                        {money(piece.price * line.qty)}
                      </span>
                    </div>
                  </div>
                  <button
                    class="cart-remove"
                    onClick={() => cart.remove(line.key)}
                    aria-label={`Remove ${piece.name}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              )}
            </For>
          </ul>

          <footer class="cart-foot">
            <div class="ship">
              <p class="ship-copy">
                <Show
                  when={cart.shippingRemainder() > 0}
                  fallback={<>Shipping is on us.</>}
                >
                  {money(cart.shippingRemainder())} more for free shipping.
                </Show>
              </p>
              <div
                class="ship-track neu-well"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progress()}
                aria-label="Progress toward free shipping"
              >
                <div class="ship-fill" style={{ width: `${progress()}%` }} />
              </div>
            </div>
            <div class="cart-total">
              <span class="kicker">Subtotal</span>
              <span class="serif cart-total-n">{money(cart.subtotal())}</span>
            </div>
            <button class="btn btn-primary cart-checkout">Checkout</button>
            <p class="cart-note">Taxes and duties calculated at checkout.</p>
          </footer>
        </Show>
      </div>
    </Show>
  );
}
