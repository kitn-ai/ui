// src/primitives/url-scheme-policy.ts
// The kit's one URL-scheme allow/deny policy, split out of card-routing.ts so it
// has NO DOM dependency (`URL` is a global in both the browser and Node — the
// rest of card-routing.ts uses HTMLElement/window/CustomEvent, which aren't).
// That split matters beyond tidiness: this schema.ts (mcp/construct)
// runs under tsconfig.mcp.json's Node-only, no-DOM-lib pass (it's imported
// transitively via mcp/tools/construct.ts), and importing anything from
// card-routing.ts there drags its HTMLElement/window/Document/CustomEvent
// references into that compile and breaks it — even though only isSafeUrl is
// used. card-routing.ts re-exports everything here so its own public surface
// (isSafeUrl/isScriptUrl, used by markdown.tsx/artifact.tsx/source.tsx) is
// unchanged; this is a location split, not a second policy.

const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];
const SCRIPT_SCHEMES = ['javascript:', 'vbscript:'];

/** The scheme the WHATWG parser reads out of `url`, resolved against a base so a
 *  relative input inherits `http:`. `undefined` when it will not parse at all.
 *
 *  ONE parser for the two questions below, deliberately: the parsing is where
 *  the subtlety lives (it strips embedded tabs/newlines and trims surrounding
 *  whitespace before reading the scheme, so `java\nscript:` and
 *  `  javascript:...  ` are both read as `javascript:` -- which a regex over the
 *  raw string would miss). Two predicates over one parse cannot drift on that;
 *  two hand-rolled parsers would. */
function schemeOf(url: string): string | undefined {
  try { return new URL(url, 'http://_invalid_base').protocol; } catch { return undefined; }
}

/** True when `url` is safe to put in an href / hand to `window.open`.
 *
 *  NOT the `<img src>` policy: this refuses `data:`, and a `data:` image is legitimate
 *  and documented here. An image sink wants `isSafeImageSrc` below.
 *
 *  Exported so the MARKDOWN renderer, the ARTIFACT viewer and the construct
 *  format's `widget.launcherIcon` reuse this exact guard rather than growing a
 *  second scheme list that can drift from this one.
 *
 *  Resolving against a base is deliberate and is what makes it correct for
 *  markdown: a relative or fragment link (`/docs`, `#section`, `./rel`) is
 *  ordinary markdown, and resolving it inherits the base's `http:` so it
 *  passes, while `javascript:`/`data:`/`vbscript:` keep their own protocol and
 *  fail. It is correct for the artifact viewer for the same reason: a file with
 *  no `src` to resolve against yields a bare relative path (`docs/report.pdf`),
 *  which is a legitimate artifact address. Contrast `isRenderableLink` in
 *  `primitives/link-preview.ts`, which takes NO base and so demands an absolute
 *  http(s) URL: that is the right guard for a model-supplied citation -- a
 *  reference to a page on the public web -- this one for markdown body links,
 *  artifact file addresses, and a construct's launcher icon. */
export function isSafeUrl(url: string): boolean {
  // The empty string is REFUSED, and that is a guard against a BYPASS rather than
  // tidiness: `new URL('', base)` resolves to the base and inherits `http:`, so this
  // used to answer true for nothing at all. Any caller that pre-blanks a value it
  // could not parse (a tempting way to "neutralise" a hostile url) would then hand
  // this predicate a value it always blesses, and the original string would never be
  // seen. Refusing it makes the predicate total, and the refused branch at every sink
  // is the inert one (label visible, no attribute).
  if (url === '') return false;
  const scheme = schemeOf(url);
  return scheme !== undefined && SAFE_SCHEMES.includes(scheme);
}

/** True when `url` can be an `<img src>`, which is a DIFFERENT question from
 *  `isSafeUrl` and the reason this exists: `<img>` cannot execute a scheme, so
 *  `javascript:` in `src` is inert, while a `data:` image is legitimate and used
 *  (`image.tsx` builds `data:<mediaType>;base64,`; an inline SVG icon is a documented
 *  icon input). So the allowlist is wider than SAFE_SCHEMES on one axis and narrower
 *  on another: `data:` is allowed only for `data:image/`, because a `data:` that is
 *  not an image cannot render as one and the media type there can be model-supplied.
 *
 *  Do NOT reuse this for anything navigable, and do not hand-roll a third classifier
 *  at the sink -- `icon.tsx` did, with a bare `/^(https?:|\/|data:)/`, which is what
 *  this replaces.
 *
 *  NOT APPLIED where a MODEL supplies an image url (`choice` media images, a link
 *  card's image/favicon, an embed's poster, an attachment's url). That is a decision,
 *  not an oversight: `<img>` cannot execute a scheme, so there is no script sink to
 *  close, and the legitimate case is a `data:` image; the leftover risk is that a model
 *  can force an outbound GET and pick an image size, which SECURITY.md files under
 *  decisions the APP owns (CSP `img-src`, a proxy, or filtering the envelope). Those
 *  sinks each carry a comment saying so, and tests/components/model-image-sinks.test.ts
 *  pins the behaviour. If you are tempted to add a filter there, read that test first:
 *  it will fail, and it should, because the change is a decision rather than a fix. */
export function isSafeImageSrc(url: string): boolean {
  // TWO questions, and both are needed. The PREFIX answers "is this URL-shaped at
  // all": resolving a bare word against a base (which is what `schemeOf` does, and
  // what `isSafeUrl` needs) classifies `definitely-not-an-icon` as a relative URL,
  // and at the icon sink a bare word is a NAME, not a URL -- the first cut of this
  // painted every typo'd icon as an <img> and the icon suite caught it. The PARSE
  // stays the authority on the scheme, so `java\nscript:` and a padded
  // `  javascript:...` still fail (a regex over the raw string misses those).
  if (IMAGE_PATH_PREFIX.test(url)) return true; // site-absolute or relative PATH: same-origin by construction
  if (!IMAGE_URL_PREFIX.test(url)) return false;
  const scheme = schemeOf(url);
  return scheme !== undefined && IMAGE_SCHEMES.includes(scheme);
}

/** A URL-shaped image value: an absolute URL, an inline image, or a blob. `data:` is
 *  limited to `data:image/` here because the media type on that path can be
 *  model-supplied and a non-image `data:` cannot render as an image anyway. */
const IMAGE_URL_PREFIX = /^(https?:|blob:|data:image\/)/i;
/** A path, not a name: `/icon.svg`, `./icon.svg`, `../icon.svg`. */
const IMAGE_PATH_PREFIX = /^(\/|\.\/|\.\.\/)/;
const IMAGE_SCHEMES = ['http:', 'https:', 'blob:', 'data:'];

/** True when navigating to `url` would EXECUTE it as script in the initiating
 *  document's origin.
 *
 *  Strictly narrower than `!isSafeUrl(url)`, and not a competing policy: it
 *  answers a different question, for the one sink where the allowlist is the
 *  wrong tool. An `<iframe src>` legitimately takes `data:` and `blob:` (a
 *  `data:` blob artifact is a documented `<kai-artifact>` use -- it is what
 *  `displayUrl` exists for) and both get an OPAQUE origin in every modern
 *  browser, so neither can reach the host page. `javascript:`/`vbscript:` are
 *  the schemes that run in the EMBEDDER's origin, and they are the whole risk:
 *  the default sandbox (no `allow-same-origin`) already makes the browser refuse
 *  them, but a consumer who sets `allow-same-origin` turns a model-supplied
 *  `src` into host-origin script execution. The artifact viewer used to suggest
 *  that setting for "an artifact you trust"; it no longer does, and this guard
 *  is what protects the consumers who took the old advice. */
export function isScriptUrl(url: string): boolean {
  const scheme = schemeOf(url);
  return scheme !== undefined && SCRIPT_SCHEMES.includes(scheme);
}
