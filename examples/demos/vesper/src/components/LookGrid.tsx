import { For, createEffect, createMemo } from 'solid-js';
import { isServer } from '@solidjs/web';
import type { Look } from '../data/types';
import './look-grid.css';

export type Density = 'editorial' | 'grid' | 'index';

interface Props {
  looks: Look[];
  density: Density;
}

/**
 * The lookbook grid, in three densities.
 *
 * Retiling is FLIP-animated: measure where every card is, let the layout
 * change, then invert each card to where it was and play it forward. Without
 * it a density change is a jump cut, and the reader loses track of which look
 * was which -- which is precisely what a lookbook cannot afford.
 */
export default function LookGrid(props: Props) {
  let root!: HTMLDivElement;
  const list = createMemo(() => props.looks);

  createEffect((previous: DOMRect[] | undefined) => {
    // Read both so the effect re-runs on a density change AND a filter change.
    const density = props.density;
    void list();
    if (isServer || !root) return undefined;

    const cards = [...root.querySelectorAll<HTMLElement>('.look-card')];
    const now = cards.map((c) => c.getBoundingClientRect());

    if (
      previous &&
      previous.length === now.length &&
      typeof root.animate === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      cards.forEach((card, i) => {
        const from = previous[i]!;
        const to = now[i]!;
        const dx = from.left - to.left;
        const dy = from.top - to.top;
        const sx = from.width / to.width;
        const sy = from.height / to.height;
        if (!dx && !dy && sx === 1 && sy === 1) return;
        card.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
            { transform: 'none' },
          ],
          { duration: 460, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        );
      });
    }

    void density;
    return now;
  });

  return (
    <div ref={root} class="look-grid" data-density={props.density}>
      <For each={list()}>
        {(look, i) => (
          <a
            class="look-card"
            href={`/lookbook/${look.slug}`}
            style={{ '--i': i() }}
            data-look={look.slug}
          >
            <figure class="photo">
              <div class="ph">
                <img src={look.image} alt={look.title} width="800" height="1000" loading="lazy" />
              </div>
              <figcaption>{look.caption}</figcaption>
            </figure>
            <span class="look-card-meta">
              <span class="serif">{look.title}</span>
              <span class="look-card-cat">{look.category}</span>
            </span>
          </a>
        )}
      </For>
    </div>
  );
}
