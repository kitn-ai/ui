import { For } from 'solid-js';
import { Title, Meta } from '@solidjs/meta';
import TonalWipe from '../components/TonalWipe';
import IndexMarquee from '../components/IndexMarquee';
import Configurator from '../components/Configurator';
import { pieceBySlug } from '../data/catalog';
import { looks } from '../data/looks';
import './home.css';

const Arrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 12h13" />
    <path d="M12 6l6 6-6 6" />
  </svg>
);

export default function Home() {
  const featured = pieceBySlug('wool-coat')!;
  const teaser = looks.slice(0, 3);

  return (
    <>
      <Title>Vesper - Studies in Monochrome, Autumn / Winter 2026</Title>
      <Meta
        name="description"
        content="Vesper Autumn / Winter 2026: quiet tailoring and soft volume, shot in natural light."
      />

      <section class="herosec">
        <div class="wrap">
          <div class="hero">
            <div class="hero-copy">
              <p class="kicker">Autumn / Winter 2026</p>
              <h1 class="serif">
                Studies in<br />
                <em>Monochrome</em>
              </h1>
              <p class="hero-lede">
                A collection of quiet tailoring and soft volume, shot in natural
                light. Vesper is dressing reduced to its most essential gestures.
              </p>
              <div class="cta-row">
                <a class="btn btn-primary" href="/shop">
                  Shop the collection
                </a>
                <a class="link-cta" href="/lookbook">
                  View lookbook <Arrow />
                </a>
              </div>
              <p class="hero-hint">Drag the opening look to see it two ways.</p>
            </div>

            <TonalWipe
              a="/img/hero-a.jpg"
              b="/img/hero-b.jpg"
              labelA="Daylight"
              labelB="Studio"
              alt="The opening look of the Autumn/Winter 2026 collection"
              tag="Nº 01"
            />
          </div>

          <IndexMarquee />
        </div>
      </section>

      <section>
        <div class="wrap">
          <div class="sec-head">
            <div>
              <p class="kicker">The Lookbook</p>
              <h2>The Collection</h2>
            </div>
            <a href="/lookbook">All {looks.length} looks</a>
          </div>
          <div class="teaser">
            <For each={teaser}>
              {(look) => (
                <a class="teaser-item" href={`/lookbook/${look.slug}`}>
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
      </section>

      <section id="featured">
        <div class="wrap">
          <div class="sec-head">
            <div>
              <p class="kicker">Featured Piece</p>
              <h2>{featured.name}</h2>
            </div>
            <a href={`/shop/${featured.slug}`}>Full details</a>
          </div>
          <Configurator piece={featured} />
        </div>
      </section>
    </>
  );
}
