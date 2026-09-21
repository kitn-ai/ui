import { Loading } from 'solid-js';
import { Router } from './router';
import { CartProvider } from './cart/CartProvider';
import CartDrawer from './cart/CartDrawer';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import './styles/tokens.css';
import './styles/base.css';

export default function App() {
  return (
    <CartProvider>
      <Router>
        {(props) => (
          <>
            <SiteHeader />
            <main id="main">
              {/* Keyed on the path so the entry animation replays per
                  route. The View Transitions upgrade lives in
                  lib/view-transition.ts, wired to link clicks. */}
              <div class="route-body" data-route={props.location.pathname}>
                <Loading fallback={<div class="route-loading" />}>
                  {props.children}
                </Loading>
              </div>
            </main>
            <SiteFooter />
            <CartDrawer />
          </>
          )}
      </Router>
    </CartProvider>
  );
}
