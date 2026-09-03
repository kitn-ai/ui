import { createEffect, createSignal } from 'solid-js';
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

  // Solid 2's createEffect takes TWO functions: a compute that declares what
  // is tracked, and an effect that receives its value. A one-argument
  // createEffect is an error, not a shorthand. There is also no onMount, and
  // effects DO run during the server render -- hence isServer.
  createEffect(
    () => sentinel,
    (el) => {
      if (isServer || !el) return;
      // A sentinel rather than a scroll listener: no work on the main thread
      // for every frame of every scroll.
      const io = new IntersectionObserver(
        ([entry]) => setScrolled(!entry!.isIntersecting),
        { rootMargin: '0px' },
      );
      io.observe(el);
      // Returned, not onCleanup: that is what an effect's teardown is here.
      return () => io.disconnect();
    },
  );

  return (
    <>
      <div ref={sentinel} class="header-sentinel" aria-hidden="true" />
      <header class={['site-header', { scrolled: scrolled() }]}>
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
