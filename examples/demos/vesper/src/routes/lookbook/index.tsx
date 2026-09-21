import { createMemo, createSignal } from 'solid-js';
import { Title, Meta } from '@solidjs/meta';
import { useSearchParams } from '@solidjs/router';
import DensityControl from '../../components/DensityControl';
import FilterChips from '../../components/FilterChips';
import LookGrid, { type Density } from '../../components/LookGrid';
import { looks } from '../../data/looks';
import { categories } from '../../data/catalog';
import type { Category } from '../../data/types';
import './lookbook.css';

export default function Lookbook() {
  // The filter lives in the URL so the filtered set is server-rendered and
  // the page is shareable; density is a viewing preference, so it does not.
  const [params, setParams] = useSearchParams();
  const [density, setDensity] = createSignal<Density>('editorial');

  const category = createMemo(() => {
    const raw = params.category;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return categories.includes(value as Category) ? (value as Category) : null;
  });

  const shown = createMemo(() => {
    const c = category();
    return c ? looks.filter((l) => l.category === c) : looks;
  });

  return (
    <>
      <Title>Lookbook - Vesper Autumn / Winter 2026</Title>
      <Meta name="description" content="The twelve looks of Vesper's Autumn / Winter 2026 collection." />

      <section>
        <div class="wrap">
          <div class="sec-head">
            <div>
              <p class="kicker">Autumn / Winter 2026</p>
              <h2>The Lookbook</h2>
            </div>
            <p class="lookbook-count" aria-live="polite">
              {shown().length} of {looks.length} looks
            </p>
          </div>

          <div class="lookbook-controls">
            <FilterChips
              label="Filter by category"
              allLabel="All looks"
              options={categories}
              value={category()}
              onChange={(next) =>
                setParams({ category: next ?? undefined }, { replace: true })
              }
            />
            <DensityControl value={density()} onChange={setDensity} />
          </div>

          <LookGrid looks={shown()} density={density()} />
        </div>
      </section>
    </>
  );
}
