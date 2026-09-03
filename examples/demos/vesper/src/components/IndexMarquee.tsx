import { For, Show, createMemo, createSignal } from 'solid-js';
import { catalog, categories } from '../data/catalog';
import type { Category } from '../data/types';
import './index-marquee.css';

/**
 * The category index, made answerable.
 *
 * The static page had this as a decorative row of words. Hovering or focusing
 * one now fills a neumorphic well beneath it with three pieces from that
 * category -- so the index previews the shop instead of just labelling it.
 * Pointer and keyboard drive the same signal; the links work with neither.
 */
export default function IndexMarquee() {
  const [active, setActive] = createSignal<Category>(categories[0]!);

  const shown = createMemo(() =>
    catalog.filter((p) => p.category === active()).slice(0, 3),
  );

  return (
    <div class="marquee">
      <ul class="marquee-row">
        <For each={categories}>
          {(category, i) => (
            <>
              <Show when={i() > 0}>
                <li class="marquee-dot" aria-hidden="true" />
              </Show>
              <li>
                <a
                  class={['marquee-item', { on: category === active() }]}
                  href={`/shop?category=${encodeURIComponent(category)}`}
                  onMouseEnter={() => setActive(category)}
                  onFocus={() => setActive(category)}
                >
                  {category}
                </a>
              </li>
            </>
          )}
        </For>
      </ul>

      <div class="marquee-well neu-well">
        <div class="marquee-cards">
          <For each={shown()}>
            {(piece) => (
              <a class="marquee-card" href={`/shop/${piece.slug}`}>
                <img src={piece.image} alt="" width="140" height="175" loading="lazy" />
                <span class="marquee-card-name">{piece.name}</span>
              </a>
            )}
          </For>
          <Show when={!shown().length}>
            <p class="marquee-empty">Nothing in {active()} this season.</p>
          </Show>
        </div>
        {/* Always present, so a category holding one piece reads as a small
            category rather than as a half-loaded row. */}
        <a class="marquee-all" href={`/shop?category=${encodeURIComponent(active())}`}>
          All {active().toLowerCase()}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h13" /><path d="M12 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </div>
  );
}
