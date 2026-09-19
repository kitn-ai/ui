// The kai-* autoloader (opt-in, additive — the Web Awesome model).
//
// Include this ONE module (via a CDN/static `<script type="module">` tag) and it
// watches the DOM for undefined kai-* web components and dynamically imports each
// web component's module on demand — so a page that only uses <kai-chat> never downloads
// the others. The register-all bundle (@kitn.ai/ui/web-components) stays the default;
// this is the delivery for NO-BUILD / CDN / static-served pages.
//
// IMPORTANT — this is a CDN / static-file pattern (it resolves sibling web-component
// modules relative to its own URL). It is NOT importable through a bundler: Vite /
// webpack relocate `import.meta.url` away from the web-component files and cannot analyze
// the dynamic import, so it 404s. In a BUNDLED app use per-web-component imports
// (`import '@kitn.ai/ui/web-components/<el>'`) or the register-all bundle. (Advanced: host
// dist/web-components/ yourself and call setAutoloaderBasePath('<url>/') before use.)
//
// Tag → module is resolved through the generated manifest (filenames don't always
// equal the tag, and some modules register more than one tag), and modules are
// fetched relative to THIS module's URL.
import manifest from './web-component-manifest.json';
import { undefinedAutoloadableTags } from './autoloader-walk';

const tagToModule: Record<string, string> = manifest.tags;
const inFlight = new Set<string>();

// Base = the directory of this module. Computed via string ops on import.meta.url
// (NOT `new URL('./x', import.meta.url)`, which Vite rewrites into a static-asset
// glob that resolves to undefined at runtime).
const BASE = import.meta.url.slice(0, import.meta.url.lastIndexOf('/') + 1);

/** Override where web-component modules are fetched from (e.g. a CDN). Call before use. */
let baseOverride: string | null = null;
export function setAutoloaderBasePath(path: string): void {
  baseOverride = path.endsWith('/') ? path : path + '/';
}

async function register(tag: string): Promise<void> {
  if (customElements.get(tag) || inFlight.has(tag)) return;
  const file = tagToModule[tag];
  if (!file) return; // not one of ours
  inFlight.add(tag);
  try {
    await import(/* @vite-ignore */ `${baseOverride ?? BASE}${file}.js`);
  } catch (err) {
    inFlight.delete(tag);
    warnOnce(tag, err);
  }
}

// One actionable warning per session (the failure is almost always "imported
// through a bundler" — see the header note), instead of a silent per-tag error.
let warned = false;
function warnOnce(tag: string, err: unknown): void {
  if (warned) return;
  warned = true;
  const msg = (err as { message?: string })?.message ?? String(err);
  // eslint-disable-next-line no-console
  console.warn(
    `[kai-autoloader] could not load "${tag}" (${msg}). The autoloader is a CDN / ` +
      `static-file tool — load it from a <script type="module" src=".../@kitn.ai/ui/dist/web-components/autoloader.js">. ` +
      `It is NOT importable through a bundler. In a bundled app, register the web components with per-web-component imports ` +
      `(import '@kitn.ai/ui/web-components/<el>') or the register-all bundle (import '@kitn.ai/ui/web-components'). To drive ` +
      `the autoloader from a bundler, host dist/web-components/ and call setAutoloaderBasePath('<url>/') before use.`,
  );
}

// Two lines over the walk, which lives in its own INTERNAL module so it can
// have a unit test without becoming a public export of this subpath.
function discover(root: ParentNode | Element): void {
  undefinedAutoloadableTags(root).forEach(register);
}

/** Start watching `root` (default: the whole document) for undefined kai-* web components. */
export function startAutoloader(root: ParentNode = document): void {
  discover(root as Element);
  new MutationObserver((mutations) => {
    for (const m of mutations)
      for (const node of m.addedNodes)
        if (node.nodeType === 1) discover(node as Element);
  }).observe(document.documentElement, { childList: true, subtree: true });
}

// Self-start on import (the <script type="module"> use case). Deferred to a
// microtask so a consumer that calls setAutoloaderBasePath() right after importing
// (the advanced bundler-from-CDN path) takes effect before the first discovery pass.
if (typeof document !== 'undefined') queueMicrotask(() => startAutoloader());
