import { For, Show, createMemo } from 'solid-js';
import { Title, Meta } from '@solidjs/meta';
import { useSearchParams } from '@solidjs/router';
import FilterChips from '../../components/FilterChips';
import PriceSlider from '../../components/PriceSlider';
import { catalog, categories, priceBounds } from '../../data/catalog';
import type { Category } from '../../data/types';
import { money } from '../../lib/format';
import './shop.css';

const [MIN, MAX] = priceBounds();

export default function Shop() {
  // Every facet lives in the URL. That is what makes the filtered catalog
  // server-rendered and the result shareable -- a filter held only in a
  // signal would render the whole catalog on the server and then blink.
  const [params, setParams] = useSearchParams();

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const category = createMemo(() => {
    const value = one(params.category);
    return categories.includes(value as Category) ? (value as Category) : null;
  });
  const low = createMemo(() => {
    const n = Number(one(params.low));
    return Number.isFinite(n) && n >= MIN && n <= MAX ? n : MIN;
  });
  const high = createMemo(() => {
    const n = Number(one(params.high));
    return Number.isFinite(n) && n >= MIN && n <= MAX ? n : MAX;
  });

  const shown = createMemo(() =>
    catalog.filter(
      (p) =>
        (!category() || p.category === category()) &&
        p.price >= low() &&
        p.price <= high(),
    ),
  );

  const reset = () => setParams({ category: undefined, low: undefined, high: undefined });

  return (
    <>
      <Title>Shop - Vesper Autumn / Winter 2026</Title>
      <Meta name="description" content="The Vesper Autumn / Winter 2026 collection: outerwear, tailoring, knitwear, eveningwear and leather." />

      <section>
        <div class="wrap">
          <div class="sec-head">
            <div>
              <p class="kicker">Autumn / Winter 2026</p>
              <h2>The Collection</h2>
            </div>
            <p class="shop-count" aria-live="polite">
              {shown().length} of {catalog.length} pieces
            </p>
          </div>

          <div class="shop-filters glass">
            <FilterChips
              label="Filter by category"
              allLabel="Everything"
              options={categories}
              value={category()}
              onChange={(next) => setParams({ category: next ?? undefined })}
            />
            <PriceSlider
              min={MIN}
              max={MAX}
              low={low()}
              high={high()}
              onChange={(l, h) =>
                setParams({
                  low: l === MIN ? undefined : String(l),
                  high: h === MAX ? undefined : String(h),
                })
              }
            />
          </div>

          <Show
            when={shown().length}
            fallback={
              <div class="shop-empty neu-well">
                <p class="serif">Nothing matches that.</p>
                <button class="btn btn-quiet" onClick={reset}>
                  Clear the filters
                </button>
              </div>
            }
          >
            <div class="shop-grid">
              <For each={shown()}>
                {(piece, i) => (
                  <a class="shop-card" href={`/shop/${piece.slug}`} style={{ '--i': i() }}>
                    <figure class="photo">
                      <div class="ph">
                        <img src={piece.image} alt={piece.name} width="560" height="700" loading="lazy" />
                      </div>
                      <span class="tag">{money(piece.price)}</span>
                    </figure>
                    <div class="shop-card-meta">
                      <span class="serif shop-card-name">{piece.name}</span>
                      <span class="shop-card-blurb">{piece.blurb}</span>
                      <span class="shop-card-cat">{piece.category}</span>
                    </div>
                  </a>
                )}
              </For>
            </div>
          </Show>
        </div>
      </section>
    </>
  );
}
