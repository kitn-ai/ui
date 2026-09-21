import './site-footer.css';

export default function SiteFooter() {
  return (
    <footer class="site-footer">
      <div class="wrap">
        <div class="site-footer-grid">
          <div>
            <a class="wordmark" href="/">Vesper</a>
            <p class="site-footer-note">
              Studio Vesper, Autumn / Winter 2026. A demonstration site: the
              label, the collection and the prices are invented.
            </p>
          </div>
          <nav aria-label="Footer">
            <p class="kicker">Collection</p>
            <a href="/lookbook">Lookbook</a>
            <a href="/shop">Shop</a>
            <a href="/atelier">Atelier</a>
          </nav>
          <div>
            <p class="kicker">The cloth</p>
            <p class="site-footer-copy">
              Woven in Biella, Como and Huddersfield. Made in a room of eleven
              people in northern Italy.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
