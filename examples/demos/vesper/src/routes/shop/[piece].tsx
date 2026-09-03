import { For, Show, createSignal } from 'solid-js';
import { Title, Meta } from '@solidjs/meta';
import { type RouteProps } from '@solidjs/router';
import Configurator from '../../components/Configurator';
import Accordion from '../../components/Accordion';
import SizeGuide from '../../components/SizeGuide';
import { pieceBySlug, catalog } from '../../data/catalog';
import { looks } from '../../data/looks';
import './piece.css';

export default function PiecePage(props: RouteProps<'/shop/:piece'>) {
  const [guideOpen, setGuideOpen] = createSignal(false);
  const piece = () => pieceBySlug(props.params.piece);
  const inLooks = () =>
    looks.filter((l) => l.hotspots.some((h) => h.pieceId === piece()?.id)).slice(0, 3);
  const alsoIn = () =>
    catalog.filter((p) => p.category === piece()?.category && p.id !== piece()?.id).slice(0, 3);

  return (
    <Show
      when={piece()}
      fallback={
        <section class="wrap piece-missing">
          <h1 class="serif">That piece is not in this collection.</h1>
          <a class="btn btn-quiet" href="/shop">Back to the shop</a>
        </section>
      }
    >
      {(current) => (
        <>
          <Title>{`${current().name} - Vesper`}</Title>
          <Meta name="description" content={current().blurb} />

          <section class="piece">
            <div class="wrap">
              <nav class="piece-crumbs" aria-label="Breadcrumb">
                <a href="/shop">Shop</a>
                <span aria-hidden="true">/</span>
                <a href={`/shop?category=${encodeURIComponent(current().category)}`}>
                  {current().category}
                </a>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{current().name}</span>
              </nav>

              <Configurator piece={current()} size="page">
                <button class="piece-guide-link" onClick={() => setGuideOpen(true)}>
                  Size guide
                </button>
                <Accordion
                  items={[
                    { id: 'fabric', title: 'Fabric', body: current().fabric },
                    { id: 'measure', title: 'Measurements', body: current().measurements },
                    {
                      id: 'care',
                      title: 'Care',
                      body: 'Dry clean only. Rest the garment a day between wearings; the cloth recovers better hung than pressed.',
                    },
                  ]}
                />
              </Configurator>

              <Show when={inLooks().length}>
                <div class="piece-section">
                  <div class="sec-head">
                    <div>
                      <p class="kicker">Styled</p>
                      <h2>Seen in the lookbook</h2>
                    </div>
                  </div>
                  <div class="piece-strip">
                    <For each={inLooks()}>
                      {(look) => (
                        <a class="piece-strip-card" href={`/lookbook/${look.slug}`}>
                          <figure class="photo">
                            <div class="ph">
                              <img src={look.image} alt={look.title} width="800" height="1000" loading="lazy" />
                            </div>
                            <figcaption>{look.caption}</figcaption>
                          </figure>
                        </a>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              <Show when={alsoIn().length}>
                <div class="piece-section">
                  <div class="sec-head">
                    <div>
                      <p class="kicker">{current().category}</p>
                      <h2>Also in this family</h2>
                    </div>
                    <a href={`/shop?category=${encodeURIComponent(current().category)}`}>See all</a>
                  </div>
                  <div class="piece-strip">
                    <For each={alsoIn()}>
                      {(other) => (
                        <a class="piece-strip-card" href={`/shop/${other.slug}`}>
                          <figure class="photo">
                            <div class="ph">
                              <img src={other.image} alt={other.name} width="560" height="700" loading="lazy" />
                            </div>
                          </figure>
                          <span class="serif piece-strip-name">{other.name}</span>
                        </a>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </section>

          <SizeGuide open={guideOpen()} onClose={() => setGuideOpen(false)} />
        </>
      )}
    </Show>
  );
}
