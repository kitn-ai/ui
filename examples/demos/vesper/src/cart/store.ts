import { createStore, createMemo, type Accessor } from 'solid-js';
import type { Piece } from '../data/types';
import { pieceById } from '../data/catalog';

/** Spend above which shipping is free. A number the marketing team owns. */
export const FREE_SHIPPING = 500;

export interface CartLine {
  /** `pieceId:colorway:size` -- adding the same configuration increments. */
  key: string;
  pieceId: string;
  colorway: string;
  size: string;
  qty: number;
}

/** What goes to storage. Deliberately not the Piece: prices and copy change. */
export interface CartSnapshot {
  v: 1;
  lines: Omit<CartLine, 'key'>[];
}

export const lineKey = (pieceId: string, colorway: string, size: string) =>
  `${pieceId}:${colorway}:${size}`;

export interface Cart {
  items: CartLine[];
  add(piece: Piece, colorway: string, size: string, qty?: number): void;
  setQty(key: string, qty: number): void;
  remove(key: string): void;
  clear(): void;
  count: Accessor<number>;
  subtotal: Accessor<number>;
  shippingRemainder: Accessor<number>;
  serialize(): CartSnapshot;
  hydrateFromStorage(snapshot: CartSnapshot | null): void;
}

/**
 * The cart. Deliberately free of I/O: no localStorage, no window, no fetch.
 * Persistence is the provider's job (see CartProvider), which is what lets
 * this run in node under vitest and is what makes the SSR rule enforceable --
 * the server has no storage to read, so it always renders an empty cart.
 */
export function createCart(): Cart {
  const [items, setItems] = createStore<CartLine[]>([]);

  const priceOf = (line: CartLine) => pieceById(line.pieceId)?.price ?? 0;

  const count = createMemo(() => items.reduce((n, l) => n + l.qty, 0));
  const subtotal = createMemo(() =>
    items.reduce((n, l) => n + priceOf(l) * l.qty, 0),
  );
  const shippingRemainder = createMemo(() =>
    Math.max(0, FREE_SHIPPING - subtotal()),
  );

  // Solid 2's store setter is a MUTATION PRODUCER -- one function handed a
  // draft to mutate in place (or to replace by returning a new value). Solid
  // 1's path form, setItems(index, 'qty', next), is gone.
  const add: Cart['add'] = (piece, colorway, size, qty = 1) => {
    const key = lineKey(piece.id, colorway, size);
    setItems((lines) => {
      const line = lines.find((l) => l.key === key);
      if (line) line.qty += qty;
      else lines.push({ key, pieceId: piece.id, colorway, size, qty });
    });
  };

  const remove: Cart['remove'] = (key) =>
    setItems((lines) => {
      const at = lines.findIndex((l) => l.key === key);
      if (at >= 0) lines.splice(at, 1);
    });

  const setQty: Cart['setQty'] = (key, qty) => {
    if (qty <= 0) return remove(key);
    setItems((lines) => {
      const line = lines.find((l) => l.key === key);
      if (line) line.qty = qty;
    });
  };

  return {
    items,
    add,
    setQty,
    remove,
    clear: () => setItems(() => []),
    count,
    subtotal,
    shippingRemainder,
    serialize: () => ({
      v: 1,
      lines: items.map(({ pieceId, colorway, size, qty }) => ({
        pieceId,
        colorway,
        size,
        qty,
      })),
    }),
    hydrateFromStorage: (snapshot) => {
      if (!snapshot || snapshot.v !== 1 || !Array.isArray(snapshot.lines)) return;
      setItems(() =>
        snapshot.lines
          // A piece can leave the catalog between visits; drop rather than
          // render a line with no name and no price.
          .filter((l) => pieceById(l.pieceId) && l.qty > 0)
          .map((l) => ({ ...l, key: lineKey(l.pieceId, l.colorway, l.size) })),
      );
    },
  };
}
