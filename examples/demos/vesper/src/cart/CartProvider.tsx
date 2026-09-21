import {
  createContext,
  createEffect,
  useContext,
  createSignal,
  type ParentProps,
  type Accessor,
} from 'solid-js';
import { isServer } from '@solidjs/web';
import { createCart, type Cart, type CartSnapshot } from './store';

const KEY = 'vesper.cart.v1';

interface CartApi extends Cart {
  open: Accessor<boolean>;
  setOpen: (open: boolean) => void;
  /** The element the bag flies into. Registered by CartButton. */
  bagEl: Accessor<HTMLElement | undefined>;
  setBagEl: (el: HTMLElement | undefined) => void;
}

// Default-less on purpose: in Solid 2 that makes useContext THROW outside a
// provider rather than hand back undefined, so a missing provider is a loud
// bug instead of a cart that silently does nothing.
const CartContext = createContext<CartApi>();

export const useCart = (): CartApi => useContext(CartContext);

/**
 * The cart's only I/O.
 *
 * The server renders an EMPTY cart, always: it has no way to know what is in
 * this reader's bag, and guessing would either leak someone else's or fight
 * hydration. Storage is read in an effect after mount, so the first paint
 * matches the server exactly and the bag fills in a frame later.
 */
export function CartProvider(props: ParentProps) {
  const cart = createCart();
  const [open, setOpen] = createSignal(false);
  const [bagEl, setBagEl] = createSignal<HTMLElement | undefined>();

  const [hydrated, setHydrated] = createSignal(false);

  // NOTE: these effects are created UNCONDITIONALLY, and guard on isServer
  // inside. Wrapping the createEffect calls in `if (!isServer)` instead
  // creates two fewer reactive nodes on the server than on the client, which
  // shifts the hydration id namespace for everything after them -- the whole
  // page then fails to hydrate with "Hydration key miss", and nothing on it
  // is interactive. Server and client must create the same nodes in the same
  // order; only what those nodes DO may differ.

  // Read storage once, after mount. The compute tracks nothing, so the effect
  // runs a single time -- Solid 2 wants the two-function form regardless.
  createEffect(
    () => undefined,
    () => {
      if (isServer) return;
      let snapshot: CartSnapshot | null = null;
      try {
        const raw = localStorage.getItem(KEY);
        snapshot = raw ? (JSON.parse(raw) as CartSnapshot) : null;
      } catch {
        // Private mode, disabled storage, or a half-written value. An empty
        // bag is the right answer; a thrown error in an effect is not.
      }
      cart.hydrateFromStorage(snapshot);
      setHydrated(true);
    },
  );

  // Write on every change -- but not before the read above has landed, or the
  // first pass would persist the empty server-rendered cart over a real saved
  // one.
  createEffect(
    () => (hydrated() ? cart.serialize() : null),
    (snapshot) => {
      if (isServer || !snapshot) return;
      try {
        localStorage.setItem(KEY, JSON.stringify(snapshot));
      } catch {
        // Over quota or storage disabled. The bag still works this session.
      }
    },
  );

  const api: CartApi = { ...cart, open, setOpen, bagEl, setBagEl };
  // The context object doubles as its own provider component in Solid 2;
  // there is no .Provider.
  return <CartContext value={api}>{props.children}</CartContext>;
}
