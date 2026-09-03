import { createEffect, createSignal } from 'solid-js';
import { useCart } from './CartProvider';

/** The bag. Also the flight animation's destination, which is why it hands
 *  its element back to the provider. */
export default function CartButton() {
  const cart = useCart();
  const [bumping, setBumping] = createSignal(false);
  let previous = 0;

  createEffect(
    () => cart.count(),
    (n) => {
      if (n > previous) {
        setBumping(true);
        setTimeout(() => setBumping(false), 420);
      }
      previous = n;
    },
  );

  return (
    <button
      ref={(el) => cart.setBagEl(el)}
      class={['bag glass-sm', { bumping: bumping() }]}
      onClick={() => cart.setOpen(true)}
      aria-label={`Bag, ${cart.count()} ${cart.count() === 1 ? 'piece' : 'pieces'}`}
      aria-haspopup="dialog"
    >
      <span>Bag</span>
      <span class="bag-count" aria-hidden="true">
        {cart.count()}
      </span>
    </button>
  );
}
