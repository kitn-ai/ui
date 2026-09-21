import { For, createEffect, createSignal, flush } from 'solid-js';
import { isServer } from '@solidjs/web';
import { useLocation } from '@solidjs/router';
import CartButton from '../cart/CartButton';
import './site-header.css';

const LINKS = [
  { href: '/lookbook', label: 'Lookbook' },
  { href: '/shop', label: 'Shop' },
  { href: '/atelier', label: 'Atelier' },
];

/**
 * At rest the nav is bare text on the page ground -- the right look for the
 * top of an editorial page, and what the reader sees first.
 *
 * On scroll the header starts floating over photographs, and bare text there
 * is unreadable: it has nothing to sit on. So the links gather into a glass
 * capsule -- the same material and radius as the bag on the other side of the
 * wordmark -- and a lozenge slides behind whichever route you are on. Glass
 * earns its place only once there is a page moving underneath it.
 */
export default function SiteHeader() {
  const [scrolled, setScrolled] = createSignal(false);
  const location = useLocation();

  // Signal refs, not plain `let`. A `let` is not reactive: an effect whose
  // compute reads one runs ONCE, while the ref is still undefined, and never
  // again when the element lands. That failure is silent -- the observer
  // below simply never gets created and the header never gains its scrolled
  // state, which is exactly what happened here.
  const [sentinel, setSentinel] = createSignal<HTMLElement>();
  const [nav, setNav] = createSignal<HTMLElement>();
  const [pill, setPill] = createSignal<{ x: number; w: number } | null>(null);

  createEffect(
    () => sentinel(),
    (el) => {
      if (isServer || !el) return;
      // A sentinel rather than a scroll listener: no main-thread work on
      // every frame of every scroll.
      const io = new IntersectionObserver(
        ([entry]) => {
          setScrolled(!entry!.isIntersecting);
          // Solid 2 defers writes to the next flush, and a browser callback
          // is outside any handler or effect, so nothing schedules one. Left
          // unflushed the signal changes and the DOM never does: the header
          // silently never gains its scrolled state.
          flush();
        },
        { rootMargin: '0px' },
      );
      io.observe(el);
      // Returned, not onCleanup: that is what an effect's teardown is here.
      return () => io.disconnect();
    },
  );

  // Where the lozenge sits. Re-measured on route change and on the transition
  // into the capsule, because the links move when it appears.
  createEffect(
    () => [location.pathname, scrolled(), nav()] as const,
    ([pathname, isScrolled, list]) => {
      if (isServer || !list) return;
      if (!isScrolled) {
        setPill(null);
        return;
      }

      const measure = () => {
        const match = LINKS.find((l) => pathname.startsWith(l.href));
        const active = match
          ? list.querySelector<HTMLElement>(`a[href="${match.href}"]`)
          : null;
        if (!active) {
          setPill(null);
          return;
        }
        const box = active.getBoundingClientRect();
        const parent = list.getBoundingClientRect();
        setPill({ x: box.left - parent.left, w: box.width });
      };

      measure();
      // Again after the capsule's own transition, or the lozenge lands where
      // the links used to be rather than where they end up.
      const timer = setTimeout(measure, 340);
      return () => clearTimeout(timer);
    },
  );

  return (
    <>
      <div ref={setSentinel} class="header-sentinel" aria-hidden="true" />
      <header class={scrolled() ? 'site-header scrolled' : 'site-header'}>
        <div class="site-header-inner">
          <nav ref={setNav} class="site-links" aria-label="Collections">
            <span
              class="site-links-pill"
              aria-hidden="true"
              style={
                pill()
                  ? {
                      transform: `translateX(${pill()!.x}px)`,
                      width: `${pill()!.w}px`,
                      opacity: '1',
                    }
                  : { opacity: '0' }
              }
            />
            <For each={LINKS}>
              {(link) => (
                <a
                  href={link.href}
                  aria-current={
                    location.pathname.startsWith(link.href) ? 'page' : undefined
                  }
                >
                  {link.label}
                </a>
              )}
            </For>
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
