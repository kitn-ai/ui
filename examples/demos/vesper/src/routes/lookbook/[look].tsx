import { Show } from 'solid-js';
import { Title, Meta } from '@solidjs/meta';
import { type RouteProps } from '@solidjs/router';
import Hotspots from '../../components/Hotspots';
import { lookBySlug, adjacentLooks } from '../../data/looks';
import './look.css';

export default function LookDetail(props: RouteProps<'/lookbook/:look'>) {
  const look = () => lookBySlug(props.params.look);
  const around = () => adjacentLooks(props.params.look);

  return (
    <Show
      when={look()}
      fallback={
        <section class="wrap look-missing">
          <h1 class="serif">That look is not in this collection.</h1>
          <a class="btn btn-quiet" href="/lookbook">Back to the lookbook</a>
        </section>
      }
    >
      {(current) => (
        <>
          <Title>{`${current().title} - Vesper Lookbook`}</Title>
          <Meta name="description" content={current().note} />

          <section class="look-detail">
            <div class="wrap">
              <nav class="look-nav" aria-label="Looks">
                <a href="/lookbook" class="look-back">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M19 12H6" /><path d="M12 6l-6 6 6 6" />
                  </svg>
                  Lookbook
                </a>
                <Show when={around()}>
                  {(pair) => (
                    <span class="look-pager">
                      <a href={`/lookbook/${pair().prev.slug}`} rel="prev">Previous</a>
                      <i aria-hidden="true" />
                      <a href={`/lookbook/${pair().next.slug}`} rel="next">Next</a>
                    </span>
                  )}
                </Show>
              </nav>

              <div class="look-body">
                <Hotspots look={current()} />
                <div class="look-copy">
                  <p class="kicker">{current().caption}</p>
                  <h1 class="serif look-title">{current().title}</h1>
                  <p class="look-note">{current().note}</p>
                  <p class="look-hint">
                    The marks on the photograph open each piece.
                  </p>
                  <a class="link-cta" href="/shop">
                    Shop the collection
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M5 12h13" /><path d="M12 6l6 6-6 6" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </Show>
  );
}
