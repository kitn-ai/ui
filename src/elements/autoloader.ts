// The kai-* autoloader (opt-in, additive — the Web Awesome model).
//
// Include this ONE module and it watches the DOM for undefined kai-* elements and
// dynamically imports each element's module on demand — so a page that only uses
// <kai-chat> never downloads the other elements. The "register everything" bundle
// (@kitn.ai/ui/elements) stays the default; this is an alternative delivery for
// no-build / CDN / lazy consumers.
//
// Tag → module is resolved through the generated manifest (filenames don't always
// equal the tag, and some modules register more than one tag), and modules are
// fetched relative to THIS module's URL.
import manifest from './element-manifest.json';

const tagToModule: Record<string, string> = manifest.tags;
const inFlight = new Set<string>();

// Base = the directory of this module. Computed via string ops on import.meta.url
// (NOT `new URL('./x', import.meta.url)`, which Vite rewrites into a static-asset
// glob that resolves to undefined at runtime).
const BASE = import.meta.url.slice(0, import.meta.url.lastIndexOf('/') + 1);

/** Override where element modules are fetched from (e.g. a CDN). Call before use. */
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
    // eslint-disable-next-line no-console
    console.error(`[kai-autoloader] failed to load ${tag}`, err);
  }
}

function discover(root: ParentNode | Element): void {
  const tags = new Set<string>();
  const self = (root as Element).tagName?.toLowerCase?.();
  if (self && self in tagToModule && !customElements.get(self)) tags.add(self);
  root.querySelectorAll?.(':not(:defined)').forEach((el) => {
    const t = el.tagName.toLowerCase();
    if (t in tagToModule) tags.add(t);
  });
  tags.forEach(register);
}

/** Start watching `root` (default: the whole document) for undefined kai-* elements. */
export function startAutoloader(root: ParentNode = document): void {
  discover(root as Element);
  new MutationObserver((mutations) => {
    for (const m of mutations)
      for (const node of m.addedNodes)
        if (node.nodeType === 1) discover(node as Element);
  }).observe(document.documentElement, { childList: true, subtree: true });
}

// Self-start on import (the <script type="module"> use case).
if (typeof document !== 'undefined') startAutoloader();
