// Assert every route SERVER-RENDERS its own content, not a shell.
//
//   node tools/verify-ssr.mjs [origin]
//
// The Accept header is load-bearing: the plugin's SSR middleware only handles
// HTML-accepting GETs, and a bare `curl` (Accept: */*) falls through to a 404
// that looks exactly like a broken route.
const origin = process.argv[2] ?? 'http://localhost:4330';

// Counts are asserted by COUNTING ELEMENTS, never by matching a rendered
// string like "8 of 8": Solid separates adjacent JSX expressions with
// hydration comment markers, so that text is never contiguous in the HTML.
const CASES = [
  ['/', { has: ['Studies in', 'Monochrome', 'The Wool Coat', 'wipe-range', 'marquee-item'] }],
  ['/lookbook', { has: ['The Lookbook', 'density-opt'], count: ['data-look=', 12] }],
  ['/lookbook?category=Knitwear', { count: ['data-look=', 2] }],
  ['/lookbook?category=Eveningwear', { count: ['data-look=', 3] }],
  ['/lookbook/the-opening-look', { has: ['The Opening Look', 'pin-wrap', 'Previous'] }],
  ['/lookbook/bias', { has: ['Bias', 'The Silk Slip'] }],
  ['/shop', { has: ['The Collection', 'The Leather Blouson', 'price-track'], count: ['class="shop-card"', 8] }],
  ['/shop?category=Knitwear', { has: ['The Draped Knit'], count: ['class="shop-card"', 1] }],
  ['/shop?low=600', { count: ['class="shop-card"', 2] }],
  ['/shop/wool-coat', { has: ['The Wool Coat', 'Charcoal', 'swatch', 'Biella', 'piece-crumbs'] }],
  ['/shop/silk-slip', { has: ['The Silk Slip', 'Pearl', 'Como'] }],
  ['/atelier', { has: ['Eleven people', 'Vegetable-tanned', 'timeline', '2019'] }],
  ['/nowhere', { has: ['Not found'] }],
];

const occurrences = (haystack, needle) => haystack.split(needle).length - 1;

let failed = 0;
for (const [path, expect] of CASES) {
  const res = await fetch(origin + path, { headers: { Accept: 'text/html' } });
  const html = await res.text();
  const problems = (expect.has ?? []).filter((n) => !html.includes(n)).map((n) => `missing ${JSON.stringify(n)}`);
  if (expect.count) {
    const [needle, want] = expect.count;
    const got = occurrences(html, needle);
    if (got !== want) problems.push(`expected ${want} x ${JSON.stringify(needle)}, found ${got}`);
  }
  const ok = res.ok && !problems.length;
  if (!ok) failed++;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${res.status} ${path}` +
      (problems.length ? `\n       ${problems.join('\n       ')}` : ''),
  );
}

console.log(failed ? `\n${failed} route(s) failed` : `\nall ${CASES.length} routes server-render their content`);
process.exit(failed ? 1 : 0);
