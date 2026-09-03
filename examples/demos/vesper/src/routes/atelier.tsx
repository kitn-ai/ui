import { For } from 'solid-js';
import { Title, Meta } from '@solidjs/meta';
import MaterialWell from '../components/MaterialWell';
import Timeline from '../components/Timeline';
import { materials, timeline } from '../data/atelier';
import './atelier.css';

export default function Atelier() {
  return (
    <>
      <Title>The Atelier - Vesper</Title>
      <Meta name="description" content="How Vesper is made: the cloth, the mills, and the eleven people who cut it." />

      <section class="atelier-intro">
        <div class="wrap">
          <p class="kicker">The Atelier</p>
          <h1 class="serif atelier-title">
            Eleven people,<br />
            <em>one room</em>
          </h1>
          <p class="atelier-lede">
            Every Vesper piece is made start to finish by one person, in one
            room in northern Italy. Their initials are inside the pocket bag.
            The collection is small because that is how many coats eleven
            people can make.
          </p>
        </div>
      </section>

      <section>
        <div class="wrap">
          <div class="sec-head">
            <div>
              <p class="kicker">What it is made of</p>
              <h2>The cloth</h2>
            </div>
          </div>
          <div class="materials">
            <For each={materials}>{(material) => <MaterialWell material={material} />}</For>
          </div>
        </div>
      </section>

      <section>
        <div class="wrap">
          <div class="sec-head">
            <div>
              <p class="kicker">Since 2019</p>
              <h2>How it got here</h2>
            </div>
          </div>
          <Timeline entries={timeline} />
        </div>
      </section>

      <section>
        <div class="wrap">
          <div class="atelier-cta neu">
            <div>
              <p class="kicker">Autumn / Winter 2026</p>
              <p class="atelier-cta-title serif">Studies in Monochrome</p>
            </div>
            <a class="btn btn-primary" href="/shop">See the collection</a>
          </div>
        </div>
      </section>
    </>
  );
}
