import { createEffect, createSignal, onCleanup } from 'solid-js';
import { isServer } from '@solidjs/web';
import CartButton from '../cart/CartButton';
import './site-header.css';

/**
 * Glass, because it floats over the page as you scroll. It earns the material
 * only once there is something behind it -- above the fold it sits flat on the
 * ground colour, and the blur and shadow arrive with the first scroll.
 */
export default function SiteHeader() {
  const [scrolled, setScrolled] = createSignal(false);
  let sentinel!: HTMLDivElement;

  // createEffect, not onMount: Solid 2 has no onMount. But note the isServer
  // guard -- unlike Solid 1, effects DO run during the server render, so
  // anything touching a browser API needs saying so explicitly.
  createEffect(() => {
    if (isServer) return;
    // A sentinel rather than a scroll listener: no work on the main thread
    // for every frame of every scroll.
    const io = new IntersectionObserver(
      ([entry]) => setScrolled(!entry!.isIntersecting),
      { rootMargin: '0px' },
    );
    io.observe(sentinel);
    onCleanup(() => io.disconnect());
  });

  return (
    <>
      <div ref={sentinel} class="header-sentinel" aria-hidden="true" />
      <header class="site-header" classList={{ scrolled: scrolled() }}>
        <div class="site-header-inner">
          <nav class="site-links" aria-label="Collections">
            <a href="/lookbook">Lookbook</a>
            <a href="/shop">Shop</a>
            <a href="/atelier">Atelier</a>
          </nav>
          <a class="wordmark" href="/">Vesper</a>
          <div class="site-header-end">
            <CartButton />
          </div>
        </div>
      </header>
    </>
  );
}
