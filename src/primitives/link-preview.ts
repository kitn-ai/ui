// src/primitives/link-preview.ts
// The optional, app-supplied bare-URL → metadata hook for <kc-link-card>, plus the
// `link` card's data type. The card stays PURE: it renders from supplied metadata
// and never touches the network. CORS forbids reading cross-origin HTML in the
// browser, so there is intentionally NO built-in network implementation here — an
// app opts in with `configureLinkPreview({ fetchMetadata })` pointing at its OWN
// backend/proxy. See docs/superpowers/specs/2026-06-13-kc-link-embed-cards-design.md.
import type { CardEnvelope } from './card-contract';

/** Rich link / Open-Graph preview payload. The card renders from this; it never fetches. */
export interface LinkCardData {
  /** Canonical destination; opened via the contract `open` verb. */
  url: string;
  /** og:title — falls back to the domain. */
  title?: string;
  /** og:description — clamped to 3 lines. */
  description?: string;
  /** og:image — degrades gracefully when missing/broken. */
  image?: string;
  /** Alt for the preview image (defaults to title / decorative). */
  imageAlt?: string;
  /** Site favicon. */
  favicon?: string;
  /** Display domain; derived from `url` when omitted. */
  domain?: string;
  /** og:site_name; preferred over `domain` when present. */
  siteName?: string;
}

/** The full envelope an agent/server emits for a link card. */
export type LinkCardEnvelope = CardEnvelope<'link', LinkCardData>;

/** The `type` discriminator for link cards. */
export const LINK_CARD_TYPE = 'link' as const;

/** App-supplied resolver: a bare URL → (partial) OG metadata. Usually hits YOUR backend. */
export type LinkMetadataFetcher = (url: string) => Promise<Partial<LinkCardData>>;

let fetcher: LinkMetadataFetcher | undefined;

/**
 * App opt-in: supply a function (usually hitting YOUR backend/proxy) that resolves
 * a bare URL to OG metadata. CORS forbids reading cross-origin HTML in the browser,
 * so there is intentionally NO default network implementation.
 */
export function configureLinkPreview(opts: { fetchMetadata: LinkMetadataFetcher }): void {
  fetcher = opts.fetchMetadata;
}

/** True when an app has registered a fetcher (the bare-URL path is available). */
export function hasLinkPreviewFetcher(): boolean {
  return fetcher !== undefined;
}

/**
 * Used by LinkCard ONLY when the envelope lacks metadata AND a fetcher is set.
 * Returns the merged metadata or throws (card shows its fallback/error state).
 */
export async function resolveLinkMetadata(url: string): Promise<Partial<LinkCardData>> {
  if (!fetcher) throw new Error('No link-preview fetcher configured');
  return fetcher(url);
}

/** Test-only: clear the configured fetcher so tests stay isolated. */
export function __resetLinkPreviewForTests(): void {
  fetcher = undefined;
}

/** Derive a clean display domain from a URL (strips a leading `www.`). `undefined` if unparseable. */
export function deriveDomain(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

const RENDERABLE_SCHEMES = ['http:', 'https:'];

/** True when `url` is a syntactically valid http(s) URL (the only renderable link schemes). */
export function isRenderableLink(url: string): boolean {
  try {
    return RENDERABLE_SCHEMES.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
