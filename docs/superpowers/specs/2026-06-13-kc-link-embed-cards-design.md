# `<kc-link-card>` + `<kc-embed>` — display cards (design, 2026-06-13)

Two **native display cards** in kitn-chat's generative-UI feature: a rich
link/OG-preview card and a privacy-first media embed. Both are written **against
the frozen Card Contract** (`docs/superpowers/specs/2026-06-13-card-contract-design.md`)
— they consume the same `CardEnvelope` (data down) and emit the same `CardEvent`
verbs (events up). They are the two simplest cards in the fan-out: pure
**data-in → render**, and the only verb either one needs from the contract is
`open`.

> Build target. Foundation = the frozen contract (`CARD_CONTRACT_VERSION = '1'`,
> `CardEnvelope`/`CardContext`/`CardEvent`/`CardHost`, the `kc-card` bubbling
> CustomEvent, and the host policy). This spec defines NATIVE `<kc-*>` cards for
> the *native* transport; the *remote* iframe transport (a separate spec) carries
> the **same** envelope/event shapes over `postMessage`, so a `link`/`embed` card
> can be delivered either way unchanged.

Prior context: handoff `docs/handoff/2026-06-13-kc-rename-resizable-artifact-agui.md`
(provider-owned iframe direction; `<kc-artifact>` as the iframe+sandbox precedent).

---

## Problem / Goal

When an agent (or server) wants to show a **link preview** or **play a video** in
the conversation, today there is no themed, accessible, contract-speaking way to
do it. The two needs are distinct enough to warrant two cards but share a spine
(both render from a typed payload, both only ever ask the host to `open` a URL):

- **`kc-link-card`** — render a rich Open-Graph / link preview (title,
  description, image, favicon, domain, url) **from supplied metadata**. The card
  is **pure** (data down → render); it does **not** fetch. Because resolving OG
  tags from a bare URL requires a server (CORS forbids client-side cross-origin
  HTML reads), an **optional, app-configured fetcher hook**
  (`configureLinkPreview({ fetchMetadata })`) is the *only* sanctioned way to
  turn a bare `url` into metadata — and even then the card calls the hook, never
  the network directly. Clicking the card asks the host to `open` the url
  (`target: 'tab'`).

- **`kc-embed`** — embed a video/media player (YouTube / Vimeo / generic iframe
  URL) using a **lazy facade**: render a lightweight poster + play button first,
  and only swap in the provider `<iframe>` on user click. This buys privacy
  (no provider cookies/tracking until the user opts in; YouTube via
  `youtube-nocookie.com`) and performance (no third-party player JS on load).
  This card **does** use an iframe — but a *known-provider embed* iframe, which is
  categorically different from the generic remote-card transport (see
  [§ How `kc-embed` differs from the remote-card transport](#how-kc-embed-differs-from-the-remote-card-iframe-transport)).

**Goal:** two contract-compliant, two-layer, theme-aware, fully accessible cards
with published JSON Schemas, real TS types, source-visible stories, and graceful
error states — no placeholders.

## Non-goals

- **No server / no OG scraping in the card.** `kc-link-card` never fetches. The
  optional `fetchMetadata` hook is the app's responsibility (it points at the
  app's own backend/proxy). Designing that backend is out of scope.
- **No generic remote-card rendering.** `kc-embed`'s iframe frames a *provider's
  player URL*, not provider-owned kitn UI. The provider-owned iframe transport
  (postMessage bridge, AG-UI wire) is a separate spec; this card does not touch
  it.
- **No new event verbs.** Both cards use only `open` (and the contract's
  lifecycle `ready` / failure `error`). No additions to `CardEvent`.
- **No autoplay-with-sound, no playlist/queue UI, no analytics.** `kc-embed` is a
  single-media lazy player.
- **No `kc-image` duplication.** `kc-link-card` reuses the existing `kc-image`
  primitive's pattern for its preview thumbnail (with its own fallback); it does
  not re-implement image loading.

---

## Architecture (two-layer, exact files)

Matches the codebase's established split (Solid component in `src/components/`,
web-component wrapper in `src/elements/` via `defineKitnElement`) and the
contract's "conventions every card spec MUST follow".

### `kc-link-card`

| File | Role |
| --- | --- |
| `src/components/link-card.tsx` | Solid `LinkCard` component — pure data-down render of OG metadata; click → `host.emit({ kind: 'open', … })`. |
| `src/elements/link-card.tsx` | `<kc-link-card>` wrapper via `defineKitnElement`; takes `data` (the link payload) as a **property** + `card-id`/`title` attrs; dispatches the contract `kc-card` CustomEvent. |
| `src/elements/link-card.stories.tsx` | Source-visible WC stories (shows the `CardEnvelope` JSON). |
| `src/primitives/card-schemas/link.schema.json` | JSON Schema for the `link` card's `data` (data-down). |
| `src/primitives/link-preview.ts` | `configureLinkPreview({ fetchMetadata })` + `resolveLinkMetadata(url)` — the optional, app-supplied bare-URL → metadata hook. **Pure plumbing; no built-in network call.** |
| `tests/components/link-card.test.tsx` | Unit + a11y. |

### `kc-embed`

| File | Role |
| --- | --- |
| `src/components/embed.tsx` | Solid `Embed` component — lazy facade (poster + play → click → provider `<iframe>`); resolves provider+id → a sandboxed embed URL. |
| `src/elements/embed.tsx` | `<kc-embed>` wrapper via `defineKitnElement`; `data` payload as a property; dispatches `kc-card`. |
| `src/elements/embed.stories.tsx` | Source-visible WC stories. |
| `src/primitives/card-schemas/embed.schema.json` | JSON Schema for the `embed` card's `data`. |
| `src/primitives/embed-providers.ts` | Pure provider registry: parse a provider URL/id → `{ embedUrl, posterUrl, sandbox, allow }`. Covers `youtube`, `vimeo`, `generic`. |
| `tests/components/embed.test.tsx` | Unit + a11y. |

### Shared dependency on the contract (from `feat/card-contract`, once merged)

Both Solid components are handed a `CardHost` and read `host.context()` / call
`host.emit(...)`:

- **Native (Solid) host:** consume the contract's `CardProvider` context. When no
  provider is present (a bare `<kc-link-card>` on a plain HTML page), the element
  wrapper still works: it dispatches the **bubbling `kc-card` CustomEvent**
  (`{ bubbles: true, composed: true }`) that a host-level listener routes through
  the policy — exactly as the contract specifies for "let bare `<kc-form>` work
  without a Solid host."

> Note on the wrapper's dispatch: `defineKitnElement`'s built-in `dispatch`
> helper fires **non-bubbling, non-composed** events (for per-element listeners).
> The Card Contract requires the **bubbling, composed `kc-card`** event so a
> single host listener can route every card. So these wrappers dispatch
> `kc-card` **directly** (`element.dispatchEvent(new CustomEvent('kc-card',
> { detail: cardEvent, bubbles: true, composed: true }))`) rather than via the
> facade `dispatch` helper — see the shared `emitCardEvent(element, cardEvent)`
> helper proposed in [§ Consuming the Card contract](#consuming-the-card-contract).

---

## Data-down: JSON Schemas + TS types

Schema-first per the contract's core tenet: each card ships a versioned
`*.schema.json` (validated at the host boundary) and a matching `.d.ts`/TS type.
The `data` of the `CardEnvelope` is what these schemas describe.

### `kc-link-card` — `link.schema.json`

```jsonc
// src/primitives/card-schemas/link.schema.json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kitn.ai/schemas/card/link.schema.json",
  "title": "LinkCardData",
  "description": "Rich link / Open-Graph preview payload. The card renders from this; it never fetches.",
  "type": "object",
  "x-kitn-card-type": "link",
  "x-kitn-contract-version": "1",
  "required": ["url"],
  "additionalProperties": false,
  "properties": {
    "url": {
      "type": "string",
      "format": "uri",
      "description": "Canonical destination. Opened via the contract `open` verb (target 'tab').",
      "x-kitn-format": "url"
    },
    "title": {
      "type": "string",
      "description": "OG title (og:title). Falls back to the domain when absent.",
      "maxLength": 300
    },
    "description": {
      "type": "string",
      "description": "OG description (og:description). Clamped to 3 lines in the UI.",
      "maxLength": 1000
    },
    "image": {
      "type": "string",
      "format": "uri",
      "description": "Preview image (og:image). Optional; the card degrades gracefully when missing or it fails to load.",
      "x-kitn-format": "url"
    },
    "imageAlt": {
      "type": "string",
      "description": "Alt text for the preview image. Defaults to the title (or empty = decorative) when omitted.",
      "maxLength": 300
    },
    "favicon": {
      "type": "string",
      "format": "uri",
      "description": "Site favicon shown next to the domain.",
      "x-kitn-format": "url"
    },
    "domain": {
      "type": "string",
      "description": "Display domain (e.g. 'example.com'). Derived from `url` when omitted.",
      "maxLength": 253
    },
    "siteName": {
      "type": "string",
      "description": "OG site name (og:site_name). Shown in place of the domain when present.",
      "maxLength": 200
    }
  }
}
```

```ts
// matching TS (lives beside the contract types / re-exported from the barrel)
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
```

**`x-kitn-*` hints used:** `x-kitn-card-type` (the discriminator, for tooling),
`x-kitn-contract-version` (matches `CARD_CONTRACT_VERSION`), `x-kitn-format: 'url'`
(marks URL-ish fields so the boundary validator / authoring tools can flag scheme
issues — only `http`/`https` are renderable as links).

> `kc-link-card` **submits nothing**, so there is **no** `link.result.schema.json`
> (the contract only requires a result schema "if it submits").

### `kc-embed` — `embed.schema.json`

```jsonc
// src/primitives/card-schemas/embed.schema.json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kitn.ai/schemas/card/embed.schema.json",
  "title": "EmbedCardData",
  "description": "Lazy media-embed payload (YouTube / Vimeo / generic player URL).",
  "type": "object",
  "x-kitn-card-type": "embed",
  "x-kitn-contract-version": "1",
  "required": ["provider"],
  "additionalProperties": false,
  "properties": {
    "provider": {
      "type": "string",
      "enum": ["youtube", "vimeo", "generic"],
      "description": "Media provider. 'generic' frames `url` directly (must be an https embeddable player URL).",
      "x-kitn-control": "select"
    },
    "id": {
      "type": "string",
      "description": "Provider video id (required for youtube/vimeo when `url` is absent). e.g. 'dQw4w9WgXcQ'.",
      "maxLength": 64,
      "pattern": "^[A-Za-z0-9_-]+$"
    },
    "url": {
      "type": "string",
      "format": "uri",
      "description": "Full media/watch URL. For youtube/vimeo it is parsed to an id; for 'generic' it is the embeddable player src (https only).",
      "x-kitn-format": "url"
    },
    "title": {
      "type": "string",
      "description": "Accessible title for the player iframe + the poster label. Strongly recommended for a11y.",
      "maxLength": 300
    },
    "poster": {
      "type": "string",
      "format": "uri",
      "description": "Thumbnail shown before play. When omitted, youtube/vimeo derive a default thumbnail; 'generic' shows a neutral play placeholder.",
      "x-kitn-format": "url"
    },
    "start": {
      "type": "integer",
      "minimum": 0,
      "description": "Optional start offset in seconds.",
      "x-kitn-unit": "seconds"
    },
    "aspectRatio": {
      "type": "string",
      "enum": ["16:9", "4:3", "1:1", "9:16"],
      "default": "16:9",
      "description": "Player box aspect ratio (CSS aspect-ratio).",
      "x-kitn-control": "select"
    }
  },
  "allOf": [
    {
      "if": { "properties": { "provider": { "const": "generic" } } },
      "then": { "required": ["url"] }
    },
    {
      "if": { "properties": { "provider": { "enum": ["youtube", "vimeo"] } } },
      "then": { "anyOf": [{ "required": ["id"] }, { "required": ["url"] }] }
    }
  ]
}
```

```ts
export type EmbedProvider = 'youtube' | 'vimeo' | 'generic';

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

export type EmbedCardEnvelope = CardEnvelope<'embed', EmbedCardData>;
```

**`x-kitn-*` hints used:** `x-kitn-card-type`, `x-kitn-contract-version`,
`x-kitn-format: 'url'`, `x-kitn-control: 'select'` (authoring/Storybook control
hint for enum fields), `x-kitn-unit: 'seconds'` (numeric unit hint).

---

## Consuming the Card contract

Both cards consume the contract identically and minimally. The **only** outbound
verb either emits is `open`; both emit lifecycle `ready` and failure `error`.

### Verbs emitted

| Verb | When | Payload | Policy effect (from the frozen contract) |
| --- | --- | --- | --- |
| `ready` | After the card mounts. | `{ kind: 'ready', cardId }` | Host may push initial `CardContext`. |
| `open` | User activates a `kc-link-card` (whole card is the link). | `{ kind: 'open', cardId, url, target: 'tab' }` | Host validates scheme (http/https/mailto only) → `window.open(url, '_blank', 'noopener,noreferrer')`. |
| `error` | Invalid `data` (fails its schema) or a hard render failure. | `{ kind: 'error', cardId, message }` | Routed to `policy.onError`; card also shows an inline error state. |

`kc-embed` does **not** emit `open` for play (play swaps in the in-card iframe). It
**may** offer a secondary "Open on YouTube ↗" affordance that emits
`open`/`target:'tab'` — useful when the provider blocks embedding (see error
handling). Neither card uses `submit-data`, `action`, `send-prompt`, `resize`,
`state`, or `dismiss`.

### Context consumed

- `context().theme.mode` — already handled by the element wrapper's `theme`
  attribute + `--kitn-*` tokens; the cards add nothing special, they just use
  themed classes (`bg-card`, `text-card-foreground`, `border-border`, etc.) so
  light/dark work for free.
- `context().locale` — used only for the (optional) "Open on …" label and
  number/title direction; cards render fine without it.

### Native dispatch helper (shared)

Because the contract's `kc-card` event must **bubble + be composed** (and
`defineKitnElement.dispatch` is deliberately neither), both wrappers use a tiny
shared helper:

```ts
// src/elements/emit-card-event.ts
import type { CardEvent } from '../primitives/card-contract';

/** Dispatch a contract CardEvent as the bubbling, composed `kc-card` event a
 *  host-level listener routes through CardPolicy. */
export function emitCardEvent(element: HTMLElement, event: CardEvent): void {
  element.dispatchEvent(
    new CustomEvent<CardEvent>('kc-card', { detail: event, bubbles: true, composed: true }),
  );
}
```

When a Solid `CardProvider` is present (the 90% path inside `<kc-chat>`), the
Solid component instead calls `host.emit(event)` from context; the wrapper falls
back to `emitCardEvent` when no provider context exists, so a **bare** element on
a plain HTML page still routes through a top-level `kc-card` listener.

---

## `kc-link-card` — render + interaction

### Anatomy

A single themed card (`role` + clickable):

```
┌─────────────────────────────────────────┐
│ [        preview image (16:9)         ]  │  ← optional; hidden if no/broken image
├─────────────────────────────────────────┤
│ ◆ siteName · domain                      │  ← favicon + site/domain row
│ Title (1–2 lines, bold)                  │
│ Description (clamped to 3 lines, muted)  │
└─────────────────────────────────────────┘
```

- The **whole card is a single link target**. Implemented as one
  `role="link"`/anchor-like control (a `<button>` or `<a>`; see a11y) so screen
  readers announce one actionable unit, not nested links.
- Activation (click, Enter, Space) → `emit({ kind: 'open', cardId, url, target: 'tab' })`.
  The card does **not** itself call `window.open`; the host policy does (so policy
  can veto/redirect). Visual `cursor: pointer` + hover elevation.
- **Derived display:** `domain` defaults to `new URL(url).hostname` (strip
  leading `www.`); the header shows `siteName || domain`; `title` defaults to the
  domain when absent.

### Optional bare-URL resolution (`configureLinkPreview`)

The card stays pure. To support an envelope that carries only `{ url }` (no OG
metadata), an app may register a fetcher once:

```ts
// src/primitives/link-preview.ts
import type { LinkCardData } from './card-contract';

export type LinkMetadataFetcher = (url: string) => Promise<Partial<LinkCardData>>;

let fetcher: LinkMetadataFetcher | undefined;

/** App opt-in: supply a function (usually hitting YOUR backend/proxy) that
 *  resolves a bare URL to OG metadata. CORS forbids reading cross-origin HTML in
 *  the browser, so there is intentionally NO default network implementation. */
export function configureLinkPreview(opts: { fetchMetadata: LinkMetadataFetcher }): void {
  fetcher = opts.fetchMetadata;
}

/** Used by LinkCard ONLY when the envelope lacks metadata AND a fetcher is set.
 *  Returns the merged metadata or throws (card shows its error/blank state). */
export async function resolveLinkMetadata(url: string): Promise<Partial<LinkCardData>> {
  if (!fetcher) throw new Error('No link-preview fetcher configured');
  return fetcher(url);
}
```

`LinkCard` behavior:
- If `data` already has any of `title`/`description`/`image` → render immediately
  (pure path; **no** hook call).
- Else, if a fetcher is configured → show a **skeleton**, call
  `resolveLinkMetadata(url)`, merge result over `data`, render. On reject →
  fallback "bare link chip" (favicon + domain + url) and emit `error` only if even
  the URL is unusable.
- Else (no metadata, no fetcher) → render the **bare link chip** (still a valid,
  clickable card — never empty).

This keeps the card a pure function of its inputs in the default path; the hook is
the single, explicit, app-owned escape hatch (no hidden network in a UI kit).

---

## `kc-embed` — lazy facade + sandbox

### The facade interaction (privacy + perf)

1. **Initial render = poster only** (no iframe, no provider JS, no cookies):
   - A box with `aspect-ratio` from `aspectRatio` (default 16:9).
   - The `poster` image (or a provider-derived thumbnail; or a neutral gradient
     placeholder for `generic`/missing).
   - A centered **play button** (`<button>`, `aria-label` = `Play {title || 'video'}`).
   - Loading the poster is the only network on first paint.
2. **On activate** (click / Enter / Space on the play button):
   - Swap the poster for the provider `<iframe>` with `autoplay=1` in the embed
     URL (sound governed by the provider's autoplay policy; we never force muted
     unmute).
   - Move focus into the player region; the iframe carries `title` for SR.
3. Single media unit — no re-collapse. Re-render only if `data` changes.

This is the standard "lite-embed" facade (à la `lite-youtube`): one image + one
button until intent, then the real player.

### Provider resolution (`embed-providers.ts`)

Pure functions mapping `EmbedCardData` → an embeddable URL + poster + sandbox:

```ts
// src/primitives/embed-providers.ts
import type { EmbedCardData } from './card-contract';

export interface ResolvedEmbed {
  /** The iframe src loaded on play (already including autoplay/start params). */
  embedUrl: string;
  /** Poster/thumbnail to show before play (derived when not supplied). */
  posterUrl?: string;
  /** sandbox attribute for the player iframe. */
  sandbox: string;
  /** allow attribute (fullscreen, encrypted-media, picture-in-picture). */
  allow: string;
}

const PLAYER_SANDBOX =
  'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox';
const PLAYER_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';

/** Extract a YouTube id from a watch/youtu.be/shorts URL. */
export function parseYouTubeId(url: string): string | undefined { /* … */ return undefined; }
/** Extract a Vimeo id from a vimeo.com/<id> URL. */
export function parseVimeoId(url: string): string | undefined { /* … */ return undefined; }

export function resolveEmbed(data: EmbedCardData): ResolvedEmbed {
  const start = data.start ? `&start=${data.start}` : '';
  switch (data.provider) {
    case 'youtube': {
      const id = data.id ?? (data.url ? parseYouTubeId(data.url) : undefined);
      if (!id) throw new Error('youtube embed: missing id/url');
      return {
        // privacy-enhanced host — no cookies until play
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${start}`,
        posterUrl: data.poster ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        sandbox: PLAYER_SANDBOX,
        allow: PLAYER_ALLOW,
      };
    }
    case 'vimeo': {
      const id = data.id ?? (data.url ? parseVimeoId(data.url) : undefined);
      if (!id) throw new Error('vimeo embed: missing id/url');
      return {
        embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1${data.start ? `#t=${data.start}s` : ''}`,
        posterUrl: data.poster, // vimeo thumbnails need an API call; poster is supplied or a placeholder is shown
        sandbox: PLAYER_SANDBOX,
        allow: PLAYER_ALLOW,
      };
    }
    case 'generic': {
      if (!data.url) throw new Error('generic embed: missing url');
      assertHttpsEmbeddable(data.url); // throws on non-https / disallowed scheme
      return { embedUrl: data.url, posterUrl: data.poster, sandbox: PLAYER_SANDBOX, allow: PLAYER_ALLOW };
    }
  }
}

/** Reject non-https or javascript:/data: player URLs (defense in depth). */
function assertHttpsEmbeddable(url: string): void { /* throws if not https */ }
```

**Sandbox rationale.** A provider player **needs** `allow-scripts` and
`allow-same-origin` (its own origin) to run. That is safe here because the framed
origin is a *known, trusted video provider* (youtube-nocookie/vimeo) on a
*different origin from the host* — same-origin policy still isolates the host page
from the provider. `allow-popups`/`-to-escape-sandbox` lets "watch on YouTube"
work. `allow` (not `sandbox`) governs `autoplay`/`fullscreen`/`encrypted-media`.
For `generic`, we require **https** and reject `javascript:`/`data:` schemes.

> Contrast `<kc-artifact>`, which uses a *stricter* `allow-scripts allow-forms`
> (no `allow-same-origin`) because it frames *consumer-served arbitrary HTML*. The
> embed iframe trusts a specific provider; the artifact iframe trusts none. Both
> keep the host protected by cross-origin isolation.

### How `kc-embed` differs from the remote-card (iframe) transport

These look similar (both are iframes) but are different layers — important to keep
straight per the established decisions:

| | `kc-embed` iframe | Remote-card transport (separate spec) |
| --- | --- | --- |
| What's framed | A **third-party media player** (YouTube/Vimeo/your player URL). | A **provider-owned kitn UI document** rendering `<kc-*>` cards. |
| Protocol across the boundary | **None.** Fire-and-forget media playback; no postMessage contract. | The **Card Contract over `postMessage`** (`{ protocol: 'kitn-card', version }`, origin-validated both ways). |
| Card identity | `kc-embed` **is** a native card (type `'embed'`); the iframe is just its *internal player*. | The iframe **is** the transport carrying *other* cards' envelopes/events. |
| Trust model | Trust a known video provider; player sandbox + `allow`. | Trust a configured provider origin; sandbox + strict origin checks + short-lived `authToken`. |
| Events to host | Only the native card's `open` (optional "watch on provider"). | The full `CardEvent` union relayed from the framed cards. |

In short: `kc-embed` is a **leaf card that happens to contain a media iframe**;
the remote transport is a **pipe that carries cards**. `kc-embed` could itself be
delivered *through* the remote transport unchanged (the envelope is the same).

---

## Error handling

Per the contract ("malformed shapes fail loud; never render silently wrong").

**`kc-link-card`:**
- **Missing image / image load error** → drop the image region, keep the
  title/description/domain card (degrade, not error). Implemented with an
  `onerror` on the `<img>` flipping to a no-image layout. Not an `error` event.
- **Invalid `url`** (not parseable / non-http(s)/mailto scheme) → render a
  non-clickable error chip ("Invalid link") **and** emit
  `{ kind: 'error', cardId, message }`. The host policy already rejects bad
  schemes on `open`, so this is belt-and-suspenders.
- **`data` fails `link.schema.json`** at the host boundary → host shows the
  contract's inline error + emits `error`; the card never receives bad data.
- **Fetcher rejects** (bare-URL path) → fall back to the bare link chip; emit
  `error` only if the URL itself is unusable.

**`kc-embed`:**
- **Blocked embed / provider refuses framing** (X-Frame-Options / CSP
  `frame-ancestors`): the iframe loads but the provider shows its own "watch on
  …" page. We add a **fallback affordance** under the player — an "Open on
  {provider} ↗" link that emits `open`/`target:'tab'` — so a blocked embed is
  never a dead end. (We cannot reliably detect cross-origin frame-refusal in JS;
  the affordance is always available, not conditional.)
- **Missing id/url for the provider** (schema `allOf` should catch this, but
  defense in depth) → `resolveEmbed` throws → card renders an inline "Can't load
  this video" state + emits `error`.
- **Poster load error** → fall back to the neutral play placeholder (still
  playable). Not an `error` event.
- **`generic` non-https / bad scheme** → `assertHttpsEmbeddable` throws → inline
  error + `error` event.
- **`data` fails `embed.schema.json`** at the boundary → contract error path.

Neither card ever throws to the host; failures become an inline state + at most a
single `error` event.

---

## Accessibility

Project gate: 0 axe violations, light + dark; full keyboard + SR. (Per contract
convention 5.)

**`kc-link-card`:**
- One actionable element for the whole card. Preferred: a real `<a href={url}>`
  styled as the card (native link semantics, middle-click/right-click work) whose
  `click` is intercepted to route through the `open` verb (`preventDefault` + emit;
  the `href` keeps SR/affordance correct and provides a no-JS fallback). If a
  pure-event model is required, use `<button>` with `aria-label` describing the
  destination ("Open {title} on {domain}").
- The preview image is `role="img"` with `imageAlt` (or `alt=""` decorative when
  the title already conveys it). Favicon is always decorative (`alt=""`).
- Description uses CSS line-clamp; full text remains in the accessible name/DOM.
- Focus-visible ring via the kit's `focus-visible:ring-*` tokens (matches
  `file-tree.tsx`).

**`kc-embed`:**
- The play button is a real `<button>` with `aria-label="Play {title || 'video'}"`;
  Enter/Space activate.
- On play, focus moves into the player region; the iframe has a meaningful
  `title` (from `data.title`, defaulting to "Embedded video").
- Poster image alt = `title` (or decorative). The "Open on {provider}" fallback is
  a real link/button in the tab order.
- Respect `prefers-reduced-motion` for any hover/scale transitions.

---

## Testing

### Unit (Vitest + @solidjs/testing-library)

`kc-link-card`:
- Renders title/description/image/domain from `data`; derives `domain` from `url`
  when omitted; prefers `siteName` over `domain`.
- Click/Enter/Space emits exactly one `kc-card` event with
  `{ kind: 'open', url, target: 'tab' }` and the right `cardId`.
- Image `onerror` → image region removed, rest intact, **no** `error` event.
- Invalid url → error chip + one `error` event; not clickable.
- Pure path: when `data` has metadata, `resolveLinkMetadata` is **never** called
  (spy asserts 0 calls).
- Bare-URL path: with a configured fetcher, skeleton → merged render; rejecting
  fetcher → bare chip fallback.
- Schema: `link.schema.json` parses; validates a known-good envelope and rejects a
  known-bad one (missing `url`, non-uri `image`).

`kc-embed`:
- `resolveEmbed` for youtube → `youtube-nocookie.com/embed/{id}?autoplay=1&rel=0`
  and derived `hqdefault.jpg` poster; honors `start`.
- `parseYouTubeId` / `parseVimeoId` cover watch URLs, `youtu.be`, `shorts`,
  `vimeo.com/<id>`; reject garbage.
- Facade: initial DOM has **no `<iframe>`** (only poster + play button); after
  activating play, exactly one `<iframe>` with the resolved `src`, `sandbox`,
  `allow`, and `title`.
- `generic` with non-https url → throws → inline error + `error` event.
- "Open on provider" affordance emits `open`/`target:'tab'`.
- Schema: `embed.schema.json` enforces provider-specific `required` via `allOf`
  (generic needs `url`; youtube/vimeo need `id` or `url`).

### a11y
- axe on both cards, light + dark, in initial and (for embed) post-play states.

### Empirical / Playwright (per the project's "verify visually" norm)
- `kc-embed`: assert **zero requests to youtube/vimeo origins before play**
  (network panel / route interception) and that the player iframe appears only
  after the click — the privacy guarantee, measured, not assumed.
- `kc-link-card`: assert the whole card is one tab stop and that activating it
  fires `kc-card` (listen on a wrapping element to prove bubbling/composed).
- Both: measure light/dark token application (computed `background-color` matches
  the active theme), since static screenshots have missed real bugs before.

### Gate
`npm run build` + `npm run typecheck` (3 tsconfigs) + `npm test` (baseline 3
pre-existing Shiki failures) + `npm run test:react` + a11y (0 violations).

---

## Source-visible Storybook stories

Per contract convention 6 and the Examples norm: every story shows the live
render **and** the exact `CardEnvelope` JSON via `parameters.docs.source.code`,
following the `kc-image`/`kc-resizable` `HTML_SNIPPET` pattern.

### `kc-link-card` stories
- **Full preview** — envelope with full OG metadata.
- **No image** — graceful degrade.
- **Bare URL + fetcher** — shows the `configureLinkPreview` opt-in + skeleton.
- **Invalid link** — error chip.

Source snippet shown for the Full preview story (the `CardEnvelope` JSON):

```json
{
  "type": "link",
  "id": "card-link-1",
  "title": "Shared link",
  "data": {
    "url": "https://example.com/blog/generative-ui",
    "title": "Generative UI, explained",
    "description": "How agents render typed, themed cards in the chat — across native components and provider iframes.",
    "image": "https://example.com/og/gen-ui.png",
    "imageAlt": "Diagram of the card contract",
    "favicon": "https://example.com/favicon.ico",
    "siteName": "Example Blog",
    "domain": "example.com"
  }
}
```

And the HTML wiring shown in the Code tab:

```html
<kc-link-card id="lc"></kc-link-card>
<script type="module">
  import '@kitnai/chat/elements';
  const lc = document.getElementById('lc');
  lc.cardId = 'card-link-1';
  lc.data = { url: 'https://example.com/blog/generative-ui', title: 'Generative UI, explained', /* … */ };
  // Route the card's `open` verb (bubbles as `kc-card`):
  document.addEventListener('kc-card', (e) => {
    const ev = e.detail; // CardEvent
    if (ev.kind === 'open' && ev.target === 'tab') window.open(ev.url, '_blank', 'noopener,noreferrer');
  });
</script>
```

### `kc-embed` stories
- **YouTube (lazy)** — poster + play; iframe only after click.
- **Vimeo** — supplied poster.
- **Generic player** — an https embed URL.
- **Custom aspect ratio** — `9:16`.
- **Blocked-embed fallback** — shows the "Open on provider" affordance.

Source snippet shown for the YouTube story:

```json
{
  "type": "embed",
  "id": "card-embed-1",
  "title": "Intro video",
  "data": {
    "provider": "youtube",
    "id": "dQw4w9WgXcQ",
    "title": "Product intro",
    "aspectRatio": "16:9"
  }
}
```

```html
<kc-embed id="em"></kc-embed>
<script type="module">
  import '@kitnai/chat/elements';
  const em = document.getElementById('em');
  em.cardId = 'card-embed-1';
  em.data = { provider: 'youtube', id: 'dQw4w9WgXcQ', title: 'Product intro' };
  // No network to YouTube until the user clicks play (privacy-first lazy facade).
</script>
```

---

## Layering & files summary (when built — separate cycle)

- New Solid components: `src/components/link-card.tsx`, `src/components/embed.tsx`.
- New element wrappers: `src/elements/link-card.tsx`, `src/elements/embed.tsx`
  (registered in `src/elements/register.*` and added to
  `src/elements/element-meta.json`; tags **exactly** `kc-link-card`, `kc-embed`).
- New primitives: `src/primitives/link-preview.ts`,
  `src/primitives/embed-providers.ts`, `src/elements/emit-card-event.ts`.
- New schemas: `src/primitives/card-schemas/link.schema.json`,
  `src/primitives/card-schemas/embed.schema.json` (copied to `dist/schemas/` by
  the build, per the contract).
- Barrel exports: `LinkCard`, `Embed`, `configureLinkPreview`, `resolveEmbed`,
  `LinkCardData`, `EmbedCardData`, `LinkCardEnvelope`, `EmbedCardEnvelope`.
- Depends on `feat/card-contract` being merged (for `card-contract.ts`,
  `CardProvider`, and the `kc-card` host listener).

## Out of scope (separate efforts)

- The OG-scraping backend behind `configureLinkPreview` (app-owned).
- The remote/iframe provider transport + AG-UI wire mapping.
- Live/streaming `state` updates (contract reserves the shape).
- Vimeo thumbnail auto-derivation via Vimeo's oEmbed API (would add a network
  call; left to the supplied `poster` for now — see open questions).

---

## Open questions for review

1. **`kc-link-card` element: `<a>` vs `<button>` as the root control.** `<a href>`
   gives native link semantics (middle/right-click, SR "link", no-JS fallback) but
   we intercept its click to route the `open` verb through host policy — a slight
   tension (the href could be opened directly, bypassing policy, via
   middle-click). `<button>` routes everything through policy but loses native
   link affordances. **Lean:** `<a href>` with intercepted click (affordance wins;
   middle-click opening the real URL is acceptable and still safe). Flagging
   because it trades one contract property (all opens via policy) for UX.

2. **Vimeo poster.** Vimeo has no static thumbnail URL like YouTube's
   `i.ytimg.com`; deriving one needs a runtime oEmbed/API call (a network hit
   before play, against the privacy goal). **Lean:** require/recommend `poster`
   for Vimeo and show a neutral placeholder otherwise; do **not** auto-fetch.
   Confirm this is acceptable vs. adding an opt-in `configureVimeoThumbnails` hook
   mirroring `configureLinkPreview`.

3. **Generic embed sandbox strictness.** `generic` frames an arbitrary (app- or
   agent-supplied) https URL with `allow-same-origin allow-scripts` — appropriate
   for a *trusted* player, risky for an *agent-chosen* arbitrary URL. **Options:**
   (a) keep it permissive and document "only pass player URLs you trust"; (b) gate
   `generic` behind an app allowlist of origins; (c) make `generic` opt-in via
   config. **Lean:** (b) — an app-configured origin allowlist for `generic`,
   defaulting to empty (so an agent can't frame arbitrary origins unless the app
   opts in). Wants a decision since it affects the schema/config surface.
