import type { ParentProps } from 'solid-js';
import { HydrationScript } from '@solidjs/web';

// The document shell -- the new index.html. Picked up by the src/Document.*
// convention, it wraps the app in the plugin's generated entries and must
// render the full <html>, including <HydrationScript />.
export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#e9ebf0" />
        {/* The display face is the first thing the eye lands on; preload the
            regular weight so the hero does not swap under the reader. */}
        <link
          rel="preload"
          href="/fonts/playfair-display-400.woff2"
          as="font"
          type="font/woff2"
          crossorigin="anonymous"
        />
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
