// src/primitives/embed-providers.ts
// Pure provider resolution for <kai-embed>: map an EmbedCardData → an embeddable
// player URL + poster + iframe sandbox/allow. Covers youtube (privacy-enhanced
// youtube-nocookie), vimeo (dnt=1), and generic (https-only, ORIGIN-ALLOWLISTED).
// No network, no DOM. See docs/superpowers/specs/2026-06-13-kc-link-embed-cards-design.md.
import type { CardEnvelope } from './card-contract';

/** Media provider for an embed card. */
export type EmbedProvider = 'youtube' | 'vimeo' | 'generic';

/** Lazy media-embed payload (YouTube / Vimeo / generic player URL). */
export interface EmbedCardData {
  /** Media provider. 'generic' frames `url` directly. */
  provider: EmbedProvider;
  /** Provider video id (youtube/vimeo) when not parsing from `url`. */
  id?: string;
  /** Full media/watch/embed URL. */
  url?: string;
  /** Accessible iframe title + poster label. */
  title?: string;
  /** Thumbnail before play; derived for youtube/vimeo when omitted. */
  poster?: string;
  /** Start offset, seconds. */
  start?: number;
  /** Player aspect ratio. Default '16:9'. */
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16';
}

/** The full envelope an agent/server emits for an embed card. */
export type EmbedCardEnvelope = CardEnvelope<'embed', EmbedCardData>;

/** The `type` discriminator for embed cards. */
export const EMBED_CARD_TYPE = 'embed' as const;

export interface ResolvedEmbed {
  /** The iframe src loaded on play (already including autoplay/start params). */
  embedUrl: string;
  /** Poster/thumbnail to show before play (derived when not supplied). */
  posterUrl?: string;
  /** sandbox attribute for the player iframe. */
  sandbox: string;
  /** allow attribute (fullscreen, encrypted-media, picture-in-picture, …). */
  allow: string;
}

// A provider player NEEDS allow-scripts + allow-same-origin (its OWN origin) to run.
// That is safe here because the framed origin is a KNOWN, trusted video provider on a
// DIFFERENT origin than the host — same-origin policy still isolates the host page from
// the provider. allow-popups(-to-escape-sandbox) lets "watch on YouTube" work. The
// `allow` attribute (not sandbox) governs autoplay/fullscreen/encrypted-media.
// Contrast <kai-artifact> (allow-scripts allow-forms, NO allow-same-origin) which frames
// arbitrary consumer HTML and so trusts nothing.
const PLAYER_SANDBOX =
  'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox';
const PLAYER_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';

// --- generic origin allowlist (security decision) -------------------------
//
// A `generic` embed frames an ARBITRARY https URL. An agent-supplied generic URL is a
// supply-chain risk, so it is REJECTED unless the app has explicitly allowlisted its
// origin. The allowlist defaults to EMPTY: out of the box, `generic` embeds are blocked.
const allowedGenericOrigins = new Set<string>();

/**
 * App opt-in: allow `generic` embeds whose origin is in this list. Origins are
 * normalized via the URL parser (scheme + host + port). Only https origins are
 * accepted (a non-https origin is ignored). Call once at app startup.
 */
export function configureEmbedAllowlist(origins: string[]): void {
  for (const o of origins) {
    const origin = normalizeOrigin(o);
    if (origin) allowedGenericOrigins.add(origin);
  }
}

/** True when `url`'s origin has been allowlisted for `generic` embeds. */
export function isGenericOriginAllowed(url: string): boolean {
  const origin = originOf(url);
  return origin !== undefined && allowedGenericOrigins.has(origin);
}

/** Test-only: clear the generic allowlist so tests stay isolated. */
export function __resetEmbedAllowlistForTests(): void {
  allowedGenericOrigins.clear();
}

/** Normalize an allowlist entry (a URL or bare origin) to a canonical https origin, or undefined. */
function normalizeOrigin(input: string): string | undefined {
  const origin = originOf(input) ?? originOf(`https://${input}`);
  if (!origin) return undefined;
  return origin.startsWith('https://') ? origin : undefined;
}

/** The `scheme://host[:port]` origin of a URL, or undefined when unparseable. */
function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

// --- id parsing -----------------------------------------------------------

/** Extract a YouTube id from a watch / youtu.be / shorts / embed URL. */
export function parseYouTubeId(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  const host = parsed.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') {
    return cleanId(parsed.pathname.slice(1));
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const v = parsed.searchParams.get('v');
    if (v) return cleanId(v);
    // /shorts/<id>, /embed/<id>, /v/<id>
    const m = parsed.pathname.match(/^\/(?:shorts|embed|v)\/([^/?#]+)/);
    if (m) return cleanId(m[1]);
  }
  return undefined;
}

/** Extract a Vimeo id from a vimeo.com/<id> (or player.vimeo.com/video/<id>) URL. */
export function parseVimeoId(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  const host = parsed.hostname.replace(/^www\./, '');
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return undefined;
  const m = parsed.pathname.match(/(?:^|\/)(\d+)(?:\/|$)/);
  return m ? m[1] : undefined;
}

/** A provider video id must be the [A-Za-z0-9_-] alphabet (matches the schema pattern). */
function cleanId(id: string): string | undefined {
  return /^[A-Za-z0-9_-]+$/.test(id) ? id : undefined;
}

// --- resolution -----------------------------------------------------------

/**
 * Resolve an EmbedCardData to an embeddable player URL + poster + sandbox/allow.
 * Throws (with a human message) on a missing/invalid provider id, a non-https
 * generic URL, or a generic origin not in the app allowlist — the card turns these
 * into an inline error + an `error` event.
 */
export function resolveEmbed(data: EmbedCardData): ResolvedEmbed {
  const start = data.start ? `&start=${data.start}` : '';
  switch (data.provider) {
    case 'youtube': {
      const id = data.id ?? (data.url ? parseYouTubeId(data.url) : undefined);
      if (!id) throw new Error('youtube embed: missing or unparseable id/url');
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${start}`,
        posterUrl: data.poster ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        sandbox: PLAYER_SANDBOX,
        allow: PLAYER_ALLOW,
      };
    }
    case 'vimeo': {
      const id = data.id ?? (data.url ? parseVimeoId(data.url) : undefined);
      if (!id) throw new Error('vimeo embed: missing or unparseable id/url');
      return {
        embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1${
          data.start ? `#t=${data.start}s` : ''
        }`,
        // Vimeo has no static thumbnail URL; rely on a supplied poster (or placeholder).
        posterUrl: data.poster,
        sandbox: PLAYER_SANDBOX,
        allow: PLAYER_ALLOW,
      };
    }
    case 'generic': {
      if (!data.url) throw new Error('generic embed: missing url');
      assertHttpsEmbeddable(data.url);
      if (!isGenericOriginAllowed(data.url)) {
        throw new Error(
          `generic embed: origin not allowlisted — call configureEmbedAllowlist([...]) to permit ${
            originOf(data.url) ?? data.url
          }`,
        );
      }
      return { embedUrl: data.url, posterUrl: data.poster, sandbox: PLAYER_SANDBOX, allow: PLAYER_ALLOW };
    }
  }
}

/** Reject non-https or javascript:/data: player URLs (defense in depth). */
function assertHttpsEmbeddable(url: string): void {
  let protocol: string;
  try {
    protocol = new URL(url).protocol;
  } catch {
    throw new Error(`generic embed: invalid url "${url}"`);
  }
  if (protocol !== 'https:') {
    throw new Error(`generic embed: only https player URLs are allowed (got ${protocol})`);
  }
}

/**
 * The canonical "watch on the provider" URL for the optional fallback affordance
 * (emitted as `open`/target:'tab' when an embed is blocked). Returns `undefined`
 * when there is nothing useful to link to.
 */
export function watchUrl(data: EmbedCardData): string | undefined {
  switch (data.provider) {
    case 'youtube': {
      const id = data.id ?? (data.url ? parseYouTubeId(data.url) : undefined);
      return id ? `https://www.youtube.com/watch?v=${id}` : data.url;
    }
    case 'vimeo': {
      const id = data.id ?? (data.url ? parseVimeoId(data.url) : undefined);
      return id ? `https://vimeo.com/${id}` : data.url;
    }
    case 'generic':
      return data.url;
  }
}

/** Human-readable provider label for the fallback affordance ("Open on YouTube"). */
export function providerLabel(provider: EmbedProvider): string {
  switch (provider) {
    case 'youtube':
      return 'YouTube';
    case 'vimeo':
      return 'Vimeo';
    case 'generic':
      return 'site';
  }
}

/** CSS aspect-ratio value for a card's aspectRatio (default 16:9). */
export function aspectRatioValue(aspectRatio: EmbedCardData['aspectRatio']): string {
  switch (aspectRatio) {
    case '4:3':
      return '4 / 3';
    case '1:1':
      return '1 / 1';
    case '9:16':
      return '9 / 16';
    case '16:9':
    default:
      return '16 / 9';
  }
}
