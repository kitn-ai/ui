/**
 * The class-name merger behind `cn()` — a domain-specific replacement for
 * `tailwind-merge`, sized to what this kit emits.
 *
 * WHY THIS EXISTS
 * ---------------
 * `tailwind-merge` ships the whole Tailwind v4 vocabulary so it can merge any
 * class a consumer might write. This kit emits a few hundred distinct classes --
 * `cn-merge.drift.test.ts` prints the exact count on every run -- and the
 * import cost every consumer pays for that generality is the largest single item
 * in an `import { cn } from '@kitn.ai/ui'` bundle: minified with esbuild, one
 * probe per invocation, `tailwind-merge` measures ~27 KB raw / ~8.5 KB gzip
 * against ~13.5 KB raw / ~4.5 KB gzip for the table below -- 2x smaller, not 4x, because
 * hardening the table (the validator/arbitrary families below) is table too. The consumer-visible
 * cost is re-measured on the packed tarball by
 * `scripts/verify-consumer-sideeffects.mjs`, whose ceilings are derived from the
 * measurement it prints, not quoted from here.
 *
 * TWO PROPERTIES ARE LOAD-BEARING, and both were forced by measurement against
 * `tailwind-merge` as an oracle. The obvious design — "same group, last wins" —
 * diverges on all of them:
 *
 * 1. PASS-THROUGH DEFAULT. A class this table does not recognise keeps its own
 *    identity as its key and can never conflict with anything. Unknown classes
 *    are never dropped. `tailwind-merge` knows all of Tailwind; this knows what
 *    the kit emits, and what the kit fails to name keeps working the way CSS
 *    says it does.
 *
 * 2. DIRECTIONAL CONFLICT. `tailwind-merge`'s model is "a class removes EARLIER
 *    classes in the groups it lists", not "same group, last wins":
 *
 *      `h-2 size-4`            -> `size-4`        (`size-*` removes `w-*`/`h-*`)
 *      `size-4 h-2`            -> `size-4 h-2`    (a bare `h-2` removes nothing)
 *      `p-2 pt-3`              -> `p-2 pt-3`
 *      `pt-3 p-2`              -> `p-2`
 *      `leading-none text-xs`  -> `text-xs`       (font-size removes leading)
 *      `text-xs leading-none`  -> both kept
 *      `border-border border-t-transparent` -> both kept (width vs color)
 *      `gap-2 gap-x-3`         -> both kept, `gap-x-3 gap-2` -> `gap-2`
 *
 *    So the table carries both the key AND the list of keys each key removes —
 *    see REMOVES. Order is the whole point: the same two classes in the other
 *    order produce a different result, and a symmetric merger gets both wrong.
 *
 * MODIFIERS AND ARBITRARY VALUES. `splitModifier` cuts at the last `:` outside
 * brackets/parens, so `[&>svg]:size-4` is the modifier stack `[&>svg]:` plus
 * `size-4`, `text-[color:var(--border)]` stays one utility, and
 * `motion-safe:group-hover:opacity-100` keys on the whole stack. That is what
 * keeps `hover:p-2` from colliding with `p-2` while `hover:p-2 hover:p-4` still
 * collapses. A bracketed length is a font size (`text-[11px]`) and a bracketed
 * anything-else is a color (`text-[var(--color-primary)]`) — measured off the
 * oracle, and the second half of the kit's own font-size aliasing below.
 *
 * THE KIT'S FONT-SIZE ALIASING IS THE CASE THIS FILE EXISTS FOR. `theme.css`
 * re-points Tailwind's scale at the kit's tokens (`text-xs` ≡ `text-meta`,
 * `text-sm` ≡ `text-body`, `text-base` ≡ `text-title`), so a semantic name and
 * its Tailwind alias are the same declaration and MUST land in one group or
 * `cn('text-sm', 'text-body')` would emit two rules for one declaration. CSS
 * cannot decide this — in the compiled sheet `.text-body` (offset 70899) sits
 * before `.text-sm` (71502), so the cascade would always hand it to `text-sm` —
 * while `cn('text-sm', 'text-body')` has to yield `text-body`, because the
 * semantic name is the one the caller wrote last. Only a name-level table can
 * do that. Pinned by `cn.test.ts`, extended and diffed against the oracle by
 * `cn-merge.drift.test.ts`.
 *
 * GROUP KEYS ARE THIS FILE'S OWN NAMESPACE, NOT TAILWIND CLASSES. A few natural
 * names (`flex`, `rounded`, `shadow`, `transition`, `transform`, `resize`,
 * `backdrop-blur`, `container`) are valid Tailwind utilities themselves. That
 * would normally be free — those eight already have rules in `compiled.css`
 * because components use them — but `src/web-components/styles.css` compiles the
 * shipped shadow sheet from `@source "../utils"`, so a string literal here that
 * spells a generable class the kit does NOT use would add a rule to every
 * consumer's shadow root. The keys below therefore never spell a generable class
 * outside a regex literal (the Tailwind scanner does not read regex source as
 * class candidates; it does read string literals and object keys). Renaming a
 * key is free: keys are only ever compared to each other.
 *
 * THE ORACLE. `tailwind-merge` stays a devDependency and
 * `cn-merge.drift.test.ts` diffs this merger against it on the classes the kit
 * emits (extracted by AST), on `tailwind-merge`'s own shipped literal corpus,
 * and on random tuples — naming both outputs and the input on any divergence.
 */

/** A matcher entry: a pattern over a utility's base name, and the key it lands in. */
type ClassMatcherEntry = readonly [
  pattern: RegExp,
  key: string | ((match: RegExpMatchArray, base: string) => string),
];

/** The pattern table. Earlier entries win, so narrower patterns come first. */
export type ClassMergeTable = readonly ClassMatcherEntry[];

/** key -> keys it removes from the classes that came BEFORE it. */
export type ClassRemoves = Readonly<Record<string, readonly string[]>>;

export type ClassMerger = (classList: string) => string;

/** The Tailwind font-size ladder plus the kit's own `@theme` rungs. */
const SIZES =
  'xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|micro|caption|meta|compact|body|title';

/**
 * A length unit, or `%`. `0` is a length in CSS (`[0]`), every other unitless
 * number is not one: tailwind-merge's `isArbitraryLength` accepts `[0]` and
 * `[3px]` and rejects `[550]`, which is why `text-[550]` is a COLOR to it and a
 * length is not free to claim bare numbers.
 */
const LENGTH_UNIT =
  /^(?:0|-?(?:\d+|\d*\.\d+)(?:px|em|rem|ex|ch|vw|vh|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|cqw|cqh|cqi|cqb|cqmin|cqmax|cm|mm|in|pt|pc|q|lh|rlh|cap|ic|%))$/;

/**
 * The inside of a bracketed arbitrary value, or `null` when the class is not one.
 * `bracketValue('text-[11px]', 5)` -> `'11px'`.
 */
const bracketValue = (base: string, prefixLength: number): string | null =>
  base.charCodeAt(prefixLength) === 91 && base.endsWith(']') ? base.slice(prefixLength + 1, -1) : null;

/**
 * Does the bracketed arbitrary value on this class name spell a LENGTH? Underscore
 * separates a multi-value length (`[10px_20px]`); `calc`/`min`/`max`/`clamp` and an
 * explicit `length:` marker are lengths too. Everything else: `[#f00]`,
 * `[var(--x)]`, `[family-name:var(--x)]`, `[550]`, is not.
 */
const isBracketedLength = (base: string, prefixLength: number): boolean => {
  const value = bracketValue(base, prefixLength);
  if (value === null) return false;
  // An explicit `length:` marker decides on its own — `[length:var(--x)]` is a width
  // even though the value inside is a variable.
  if (value.startsWith('length:')) return true;
  const inner = value;
  if (/^(?:calc|min|max|clamp)\(.*\)$/.test(inner)) return true;
  return inner.split('_').every((part) => LENGTH_UNIT.test(part));
};

/**
 * A box-shadow shape, as tailwind-merge's `isArbitraryShadow` reads one: several
 * values (`[0_0_1px_red]`) or an explicit `shadow:`/`inset:` marker.
 * `shadow-[3px]` is NOT one, and tailwind-merge leaves it alone: claiming it drops
 * a real `shadow` beside it.
 */
const isShadowShape = (base: string, prefixLength: number): boolean => {
  const value = bracketValue(base, prefixLength);
  return value !== null && (value.includes('_') || /^(?:shadow|inset|color):/.test(value));
};

const BORDER_SIDES = ['x', 'y', 't', 'r', 'b', 'l', 's', 'e'] as const;
/** Block-start / block-end widths are their own groups in Tailwind, but `border` still removes them. */
const BORDER_BLOCK_SIDES = ['bs', 'be'] as const;
const ROUND_SIDES = ['t', 'r', 'b', 'l', 'tl', 'tr', 'br', 'bl', 's', 'e', 'ss', 'se', 'es', 'ee'] as const;
const withPrefix = (prefix: string, sides: readonly string[]) => sides.map((side) => `${prefix}${side}`);

/** `border-x` / `borderc-x` ... : width and color are separate families. */
const BORDER_WIDTH_KEYS = withPrefix('borderw-', [...BORDER_SIDES, ...BORDER_BLOCK_SIDES]);
const BORDER_COLOR_KEYS = withPrefix('borderc-', [...BORDER_SIDES, ...BORDER_BLOCK_SIDES]);
/** `radius-t`, `radius-tl`, ..., the corner keys the `rounded` group removes. */
const RADIUS_KEYS = withPrefix('radius-', ROUND_SIDES);

/** The five `font-variant-numeric` variants `normal-nums` resets. */
const FVN_VARIANTS = ['fvn-ordinal', 'fvn-slashed-zero', 'fvn-figure', 'fvn-spacing', 'fvn-fraction'];

/** `border-2` and `border-[length:2px]` are widths; `border-transparent` is a color. */
/** `border-2` and `border-[length:2px]` are widths; `border-transparent` is a color. */
const isBorderWidth = (value: string) =>
  /^(?:\d+(?:\.\d+)?)$/.test(value) || isBracketedLength(value, 0);

export const CLASS_TABLE: ClassMergeTable = [
  // position / inset. `inset-shadow-*` and `inset-ring-*` (v4.1) SHARE the prefix but are
  // box-shadow / ring utilities; claiming them under `inset` would drop an inset-0 that
  // sits beside them.
  [/^-?inset-shadow-(?:none|2xs|xs|sm|md|lg|xl|2xl)$/, 'inset-shadow'],
  [/^-?inset-shadow$/, 'inset-shadow'],
  [/^-?inset-shadow-\[/, (_m, base) => {
    const offset = base.charCodeAt(0) === 45 ? 14 : 13;
    return isShadowShape(base, offset) ? 'inset-shadow' : isBracketedLength(base, offset) ? '' : 'inset-shadow-color';
  }],
  [/^-?inset-shadow-/, 'inset-shadow-color'],
  // `inset-ring-*` splits same as `ring-*`: a width, or a colour.
  [/^-?inset-ring-(?:\d+(?:\.\d+)?)$/, 'inset-ring-w'],
  [/^-?inset-ring$/, 'inset-ring-w'],
  [/^-?inset-ring-\[/, (_m, base) =>
    isBracketedLength(base, base.charCodeAt(0) === 45 ? 12 : 11) ? 'inset-ring-w' : 'inset-ring-color'],
  [/^-?inset-ring-/, 'inset-ring-color'],
  // `inset-s` / `inset-e` are the SAME groups as `start` / `end` (Tailwind renamed them), so
  // they must key together; `inset-bs` / `inset-be` (block start/end) are groups of their own.
  [
    /^-?inset-(s|bs|e|be)-/,
    (m) => (m[1] === 's' ? 'start' : m[1] === 'e' ? 'end' : `inset-${m[1]}`),
  ],
  [/^-?inset-x-/, 'inset-x'],
  [/^-?inset-y-/, 'inset-y'],
  [/^-?inset-/, 'inset'],
  [/^-?(top|right|bottom|left|start|end)-/, (m) => m[1]],
  // margin / padding
  [/^-?mx-/, 'mx'],
  [/^-?my-/, 'my'],
  [/^-?m-/, 'm'],
  [/^-?m(bs|be)-/, (m) => `m${m[1]}`],
  [/^-?(mt|mr|mb|ml|ms|me)-/, (m) => m[1]],
  [/^px-/, 'px'],
  [/^py-/, 'py'],
  [/^p-/, 'p'],
  [/^p(bs|be)-/, (m) => `p${m[1]}`],
  [/^(pt|pr|pb|pl|ps|pe)-/, (m) => m[1]],
  // box sizes. Only `size-*` removes anything.
  [/^size-/, 'size'],
  [/^w-/, 'w'],
  [/^h-/, 'h'],
  [/^min-w-/, 'min-w'],
  [/^min-h-/, 'min-h'],
  [/^max-w-/, 'max-w'],
  [/^max-h-/, 'max-h'],
  // gap / space / divide
  [/^gap-x-/, 'gap-x'],
  [/^gap-y-/, 'gap-y'],
  [/^gap-/, 'gap'],
  // `divide-x-reverse` / `space-y-reverse` are their OWN utilities in Tailwind, not values of
  // the axis family: they set a sibling variable and compose with it. Claiming them under
  // `divide-x` / `space-x` would drop a real `divide-x-2` beside them, which the oracle keeps.
  [/^divide-(x|y)-reverse$/, (m) => `divide-${m[1]}-reverse`],
  [/^divide-(?:solid|dashed|dotted|double|hidden|none)$/, 'divide-style'],
  [/^divide-[xy](-|$)/, (_m, base) => (base.startsWith('divide-x') ? 'divide-x' : 'divide-y')],
  [/^divide-/, 'divide-color'],
  [/^space-(x|y)-reverse$/, (m) => `space-${m[1]}-reverse`],
  [/^space-x-/, 'space-x'],
  [/^space-y-/, 'space-y'],
  // borders. `border-t` is a WIDTH and `border-t-transparent` is a COLOR; the two
  // live in separate key families so `border-border border-t-transparent` keeps both.
  [/^border-(?:solid|dashed|dotted|double|none|hidden)$/, 'border-style'],
  [/^border-(?:collapse|separate)$/, 'border-collapse'],
  // `border-spacing-*` shares the prefix but is table spacing; claiming it as a border
  // colour dropped the kit's real border whenever a consumer set spacing.
  [/^border-spacing-x-/, 'border-spacing-x'],
  [/^border-spacing-y-/, 'border-spacing-y'],
  [/^border-spacing-/, 'border-spacing'],
  [/^border(?:-[xytrblse])?$/, (_m, base) => (base.length > 6 ? `borderw-${base[7]}` : 'borderw')],
  // The logical sides are their own groups and must be matched before the generic
  // pattern, whose optional single-character side would otherwise split `border-bs-2`
  // as side `b` + value `s-2` and file it as a COLOR.
  [/^border-(bs|be)$/, (m) => `borderw-${m[1]}`],
  [/^border-(bs|be)-(.+)$/, (m) => `${isBorderWidth(m[2]) ? 'borderw' : 'borderc'}-${m[1]}`],
  [
    /^border-([xytrblse])-(.+)$/,
    (m) => `${isBorderWidth(m[2]) ? 'borderw' : 'borderc'}-${m[1]}`,
  ],
  [
    /^border-(.+)$/,
    (m) => (isBorderWidth(m[1]) ? 'borderw' : 'borderc'),
  ],
  // corner radius
  [/^rounded(?:-(tl|tr|br|bl|ss|se|es|ee|t|r|b|l|s|e))?$/, (m) => (m[1] ? `radius-${m[1]}` : 'radius')],
  [/^rounded(?:-(tl|tr|br|bl|ss|se|es|ee|t|r|b|l|s|e))?-/, (m) => (m[1] ? `radius-${m[1]}` : 'radius')],
  // background — color, image, clip and size all compose, so they are four keys
  [/^bg-clip-/, 'bg-clip'],
  [/^bg-(?:fixed|local|scroll)$/, 'bg-attachment'],
  [/^bg-origin-/, 'bg-origin'],
  [/^bg-(?:no-repeat|repeat|repeat-x|repeat-y|repeat-space|repeat-round)$/, 'bg-repeat'],
  [/^bg-(?:top|bottom|left|right|center)(?:-(?:top|bottom|left|right))?$/, 'bg-position'],
  [/^bg-\[position:/, 'bg-position'],
  [/^bg-blend-/, 'bg-blend'],
  [/^bg-(?:none|gradient-|linear-|radial|conic|\[(?:linear|radial|conic|url|image:))/, 'bg-image'],
  [/^bg-(?:size-|\[length:|\[size:|auto$|cover$|contain$)/, 'bg-size'],
  [/^bg-/, 'bg-color'],
  // text
  [new RegExp(`^text-(?:${SIZES})$`), 'font-size'],
  [/^text-\[/, (_m, base) => (isBracketedLength(base, 5) ? 'font-size' : 'text-color')],
  [/^text-(?:left|right|center|justify|start|end)$/, 'text-align'],
  [/^text-(?:wrap|nowrap|balance|pretty)$/, 'text-wrap-mode'],
  [/^text-(?:ellipsis|clip)$/, 'text-overflow'],
  [/^text-shadow-(?:none|2xs|xs|sm|md|lg)$/, 'text-shadow'],
  [/^text-shadow$/, 'text-shadow'],
  [/^text-shadow-\[/, (_m, base) =>
    isShadowShape(base, 12) ? 'text-shadow' : isBracketedLength(base, 12) ? '' : 'text-shadow-color'],
  [/^text-shadow-/, 'text-shadow-color'],
  [/^text-/, 'text-color'],
  [/^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/, 'font-weight'],
  [/^font-(?:sans|serif|mono)$/, 'font-family'],
  // `font-[550]` is an arbitrary WEIGHT; only the `family-name:` marker (or a bare
  // CSS variable, which tailwind-merge also reads as a weight) makes it a family.
  [/^font-\[/, (_m, base) => (/^\[family-name:/.test(base.slice(5)) ? 'font-family' : 'font-weight')],
  [/^font-\(/, 'font-weight'],
  [/^leading-/, 'leading'],
  [/^tracking-/, 'tracking'],
  // `line-clamp-[3px]` is not a line clamp to tailwind-merge (its validator wants a
  // number), so the pattern only claims numbers, `none` and a variable.
  [/^line-clamp-(?:none|\d+(?:\.\d+)?)$/, 'line-clamp'],
  [/^line-clamp-\[\d+\]$/, 'line-clamp'],
  [/^line-clamp-\[(?:var\(|--)/, 'line-clamp'],
  [/^truncate$/, 'text-overflow'],
  [/^(?:uppercase|lowercase|capitalize|normal-case)$/, 'text-transform'],
  [/^(?:italic|not-italic)$/, 'font-style'],
  [/^(?:underline|line-through|no-underline|overline)$/, 'text-decoration'],
  [/^underline-offset-/, 'underline-offset'],
  [/^decoration-(?:solid|dashed|dotted|double|wavy)$/, 'decoration-style'],
  [/^decoration-(?:from-font|auto|\d)/, 'decoration-thickness'],
  [/^decoration-\[/, (_m, base) =>
    isBracketedLength(base, 11) ? 'decoration-thickness' : 'decoration-color'],
  // A VARIABLE decoration (`decoration-(--x)`) sits in the thickness group, the same one
  // `from-font` / `auto` are in — measured off the oracle, not guessed.
  [/^decoration-\(/, 'decoration-thickness'],
  [/^decoration-/, 'decoration-color'],
  // layout
  [/^overflow-x-/, 'overflow-x'],
  [/^overflow-y-/, 'overflow-y'],
  [/^overflow-/, 'overflow'],
  [
    /^(?:block|inline-block|inline-flex|inline-grid|inline-table|inline|flex|table-caption|table-cell|table-column|table-column-group|table-footer-group|table-header-group|table-row|table-row-group|table|grid|contents|list-item|flow-root|hidden)$/,
    'display',
  ],
  [/^flex-(?:row-reverse|col-reverse|row|col)$/, 'flex-flow'],
  [/^flex-(?:wrap-reverse|wrap|nowrap)$/, 'flex-wrap'],
  [/^flex-(?:1|auto|initial|none|\[.*\])$/, 'flex-shorthand'],
  [/^shrink-/, 'shrink-factor'],
  [/^shrink$/, 'shrink-factor'],
  [/^grow-/, 'grow-factor'],
  [/^grow$/, 'grow-factor'],
  [/^basis-/, 'flex-basis'],
  [/^items-/, 'items'],
  [/^justify-items-/, 'justify-items'],
  [/^justify-self-/, 'justify-self'],
  [/^justify-/, 'justify'],
  [/^self-/, 'self'],
  [/^place-items-/, 'place-items'],
  [/^place-self-/, 'place-self'],
  [/^place-content-/, 'place-content'],
  [/^content-(?:normal|start|end|center|between|around|evenly|stretch|baseline|center-safe|end-safe)$/, 'align-content'],
  [/^content-/, 'content'],
  [/^grid-cols-/, 'grid-cols'],
  [/^grid-rows-/, 'grid-rows'],
  // `col-start-*` / `col-end-*` (and the row pair) are separate Tailwind groups from the
  // `col-span`/`col-auto` shorthand; one key made a grid span delete a line placement.
  [/^col-(start|end)-/, (m) => `col-${m[1]}`],
  [/^col-/, 'grid-column'],
  [/^row-(start|end)-/, (m) => `row-${m[1]}`],
  [/^row-/, 'grid-row'],
  [/^(?:absolute|relative|fixed|sticky|static)$/, 'position'],
  [/^z-/, 'z'],
  [/^-?order-/, 'order'],
  // box effects
  // `shadow-*` splits into the shadow VALUE and the shadow COLOR, and an arbitrary
  // value only belongs to the value group when it is shadow-shaped. A non-shape like
  // `shadow-[3px]` is filed as a colour so it stops deleting a real `shadow` beside it.
  [/^shadow-(?:none|2xs|xs|sm|md|lg|xl|2xl)$/, 'box-shadow'],
  [/^shadow$/, 'box-shadow'],
  // A non-shape arbitrary is the shadow COLOUR group — unless it spells a length, which
  // tailwind-merge does not model at all (`shadow-[3px]`), and filing that as a colour would
  // delete a real `shadow` beside it.
  [/^shadow-\[/, (_m, base) => (isShadowShape(base, 7) ? 'box-shadow' : isBracketedLength(base, 7) ? '' : 'shadow-color')],
  [/^shadow-/, 'shadow-color'],
  [/^opacity-/, 'opacity'],
  [/^mix-blend-/, 'mix-blend'],
  // Every filter function is its OWN Tailwind group and they COMPOSE on one element —
  // `blur-sm brightness-50` is a valid pair, so a single `filter` key would delete one.
  [/^filter(?:-none)?$/, 'filter'],
  [/^\[filter:/, 'filter'],
  [/^blur($|-)/, 'blur'],
  [/^brightness-/, 'brightness'],
  [/^contrast-/, 'contrast'],
  [/^drop-shadow-(?:none|sm|md|lg|xl|2xl)$/, 'drop-shadow'],
  [/^drop-shadow$/, 'drop-shadow'],
  [/^drop-shadow-\[/, (_m, base) =>
    isShadowShape(base, 12) ? 'drop-shadow' : isBracketedLength(base, 12) ? '' : 'drop-shadow-color'],
  [/^drop-shadow-/, 'drop-shadow-color'],
  [/^grayscale($|-)/, 'grayscale'],
  [/^hue-rotate-/, 'hue-rotate'],
  [/^invert($|-)/, 'invert'],
  [/^saturate-/, 'saturate'],
  [/^sepia($|-)/, 'sepia'],
  // Same for the backdrop functions, which compose with the backdrop-filter reset.
  [
    /^backdrop-(blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia)($|-)/,
    (m) => `backdrop-${m[1]}`,
  ],
  [/^backdrop-filter(?:-none)?$/, 'backdrop-filter'],
  [/^ring-offset-(?:\d+(?:\.\d+)?)$/, 'ring-offset-w'],
  [/^ring-offset-\[/, (_m, base) => (isBracketedLength(base, 12) ? 'ring-offset-w' : 'ring-offset-color')],
  [/^ring-offset-/, 'ring-offset-color'],
  [/^ring-inset$/, 'ring-inset'],
  [/^ring$/, 'ring-w'],
  [/^ring-(?:\d+(?:\.\d+)?)$/, 'ring-w'],
  [/^ring-\[/, (_m, base) => (isBracketedLength(base, 5) ? 'ring-w' : 'ring-color')],
  [/^ring-/, 'ring-color'],
  [/^-?outline-offset-/, 'outline-offset'],
  [/^\[outline-style:/, 'arb-outline-style'],
  [/^outline-(?:none|solid|dashed|dotted|double|hidden)$/, 'outline-style'],
  [/^outline$/, 'outline-w'],
  [/^outline-(?:\d+(?:\.\d+)?)$/, 'outline-w'],
  [/^outline-\[/, (_m, base) => (isBracketedLength(base, 8) ? 'outline-w' : 'outline-color')],
  [/^outline-/, 'outline-color'],
  // motion. `transition-normal` / `transition-discrete` are the transition-BEHAVIOR
  // utilities, a different group from the property list despite the shared prefix.
  [/^transition-(?:normal|discrete)$/, 'transition-behavior'],
  [/^transition/, 'transition-property'],
  [/^duration-/, 'duration'],
  [/^delay-/, 'delay'],
  [/^ease-/, 'ease'],
  [/^animate-(?:none|spin|ping|pulse|bounce|\[)/, 'animate'],
  [/^transform(?:-none|-gpu|-cpu)?$/, 'transform-property'],
  // `scale-3d` sets `transform-style`; it is its own utility, NOT a scale value, so it must
  // not collapse against `scale-95` (the oracle keeps both).
  [/^scale-3d$/, 'scale-3d'],
  [/^scale-([xyz])-/, (m) => `scale-${m[1]}`],
  [/^scale-/, 'scale'],
  [/^-?rotate-([xyz])-/, (m) => `rotate-${m[1]}`],
  [/^-?rotate-/, 'rotate'],
  // `translate-none` is `transform: none` and REMOVES the translate families before it.
  [/^-?translate-none$/, 'translate-none'],
  [/^-?translate-([xyz])-/, (m) => `translate-${m[1]}`],
  [/^-?translate-(?:full|\d|\[)/, 'translate'],
  [/^origin-/, 'transform-origin'],
  // misc
  [/^appearance-/, 'appearance'],
  [/^cursor-/, 'cursor'],
  [/^pointer-events-/, 'pointer-events'],
  [/^select-/, 'user-select'],
  [/^resize/, 'resize-mode'],
  [/^scroll-(m|p)(x|y|t|r|b|l|s|e|bs|be)-/, (m) => `scroll-${m[1]}${m[2]}`],
  [/^scroll-(m|p)-/, (m) => `scroll-${m[1]}`],
  [/^whitespace-/, 'whitespace'],
  [/^break-(?:words|all|keep|normal)$/, 'overflow-wrap'],
  // `object-fit` and `object-position` share the prefix and are separate Tailwind groups; a
  // single key would let a consumer's `object-top` delete the kit's `object-cover`.
  [/^object-(?:contain|cover|fill|none|scale-down)$/, 'object-fit'],
  [/^object-/, 'object-position'],
  [/^fill-/, 'fill'],
  // Stroke splits like ring/outline: a width, or a colour (`none` is a colour too).
  [/^stroke-(?:\d+(?:\.\d+)?)$/, 'stroke-w'],
  // The stroke WIDTH group also carries an arbitrary NUMBER (`stroke-[3]`); the other
  // width groups do not, which is why this extra branch is stroke-only.
  [/^stroke-\[/, (_m, base) =>
    isBracketedLength(base, 7) || /^\[\d+(?:\.\d+)?\]$/.test(base.slice(7)) ? 'stroke-w' : 'stroke-color'],
  [/^stroke-/, 'stroke-color'],
  [/^list-image-/, 'list-image'],
  [/^list-(?:inside|outside)$/, 'list-position'],
  [/^list-/, 'list-type'],
  [/^align-/, 'align'],
  [/^aspect-/, 'aspect'],
  [/^(?:visible|invisible|collapse)$/, 'visibility'],
  [/^(?:sr-only|not-sr-only)$/, 'sr'],
  [/^(?:isolate|isolation-auto)$/, 'isolation'],
  [/^(?:antialiased|subpixel-antialiased)$/, 'font-smoothing'],
  [/^ordinal$/, 'fvn-ordinal'],
  [/^slashed-zero$/, 'fvn-slashed-zero'],
  [/^(?:lining|oldstyle)-nums$/, 'fvn-figure'],
  [/^(?:proportional|tabular)-nums$/, 'fvn-spacing'],
  [/^(?:diagonal|stacked)-fractions$/, 'fvn-fraction'],
  [/^normal-nums$/, 'fvn-normal'],
  // `.container` (the max-width wrapper) and the `@container*` query units are different
  // groups in Tailwind and never conflict with each other; the NAMED query unit does remove
  // the unnamed one. See REMOVES.
  [/^container$/, 'container'],
  // `container/[name]` is the same max-width wrapper family as `container` (measured off
  // the oracle: `container/[foo] container` -> `container`), so it keys with it rather than
  // with the `@container` query units.
  [/^container\//, 'container'],
  [/^@container-(?:normal|size)$/, 'container-type'],
  [/^@container$/, 'container-type'],
  [/^@container\//, 'container-named'],
  [/^will-change-/, 'will-change'],
  // `touch-pan-x` / `touch-pan-y` / `touch-pinch-zoom` are three separate groups in Tailwind;
  // one `touch` key would make them delete each other.
  [/^touch-(?:auto|none|manipulation)$/, 'touch'],
  [/^touch-pan-(?:x|left|right)$/, 'touch-x'],
  [/^touch-pan-(?:y|up|down)$/, 'touch-y'],
  [/^touch-pinch-zoom$/, 'touch-pinch'],
  // A bracketed arbitrary is NOT a `touch-*` value to tailwind-merge; claiming it
  // collapsed `touch-[pan-x]` with `touch-pan-x` where the oracle keeps both.
  [/^touch-(?!\[)/, 'touch'],
  // `overscroll-x-*` / `overscroll-y-*` are their own groups and are removed BY `overscroll-*`,
  // never the other way round — lumping them made `overscroll-auto overscroll-x-auto` drop the
  // first class, which the oracle keeps.
  [/^overscroll-([xy])-/, (m) => `overscroll-${m[1]}`],
  [/^overscroll-(?!\[)/, 'overscroll'],
  [/^accent-/, 'accent-color'],
  [/^caret-/, 'caret-color'],
  // `snap-start|end|center|align-none` (alignment), `snap-mandatory|proximity` (strictness),
  // `snap-normal|always` (stop), `snap-none|x|y|both` (type) are four groups, not one.
  [/^snap-(?:start|end|center|align-none)$/, 'snap-align'],
  [/^snap-(?:mandatory|proximity)$/, 'snap-strictness'],
  [/^snap-(?:normal|always)$/, 'snap-stop'],
  [/^snap-(?:none|x|y|both)$/, 'snap-type'],
  [/^columns-/, 'columns'],
  [/^indent-/, 'indent'],
];

/**
 * key -> keys it removes from the classes that came BEFORE it. A class always
 * removes an earlier class with the same key (`p-2 p-4` -> `p-4`); only the
 * asymmetric half needs a table.
 */
export const REMOVES: ClassRemoves = {
  inset: ['inset-x', 'inset-y', 'inset-bs', 'inset-be', 'top', 'right', 'bottom', 'left', 'start', 'end'],
  'inset-x': ['left', 'right'],
  'inset-y': ['top', 'bottom'],
  m: ['mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me', 'mbs', 'mbe'],
  // `mx` removes only the PHYSICAL left/right. `ms`/`me` (the logical halves) are removed only
  // by `m` itself — the split twMerge makes, and what keeps `ms-auto mx-auto` both alive.
  mx: ['mr', 'ml'],
  my: ['mt', 'mb'],
  p: ['px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe', 'pbs', 'pbe'],
  px: ['pr', 'pl'],
  py: ['pt', 'pb'],
  size: ['w', 'h'],
  gap: ['gap-x', 'gap-y'],
  space: ['space-x', 'space-y'],
  borderw: BORDER_WIDTH_KEYS,
  borderc: BORDER_COLOR_KEYS,
  radius: RADIUS_KEYS,
  'font-size': ['leading'],
  // tailwind-merge's `conflictingClassGroups` carries these edges BOTH ways between
  // `fvn-normal` and each of the five variants; a one-way edge leaves `normal-nums ordinal`
  // and `ordinal normal-nums` disagreeing with it in opposite directions.
  'fvn-normal': FVN_VARIANTS,
  'fvn-ordinal': ['fvn-normal'],
  'fvn-slashed-zero': ['fvn-normal'],
  'fvn-figure': ['fvn-normal'],
  'fvn-spacing': ['fvn-normal'],
  'fvn-fraction': ['fvn-normal'],
  'container-named': ['container-type'],
  // Per-corner radius: `rounded-s` removes only the two start corners, `rounded-t` only the
  // two top ones — the generic `radius` entry above covers `rounded` itself.
  'radius-s': ['radius-ss', 'radius-es'],
  'radius-e': ['radius-se', 'radius-ee'],
  'radius-t': ['radius-tl', 'radius-tr'],
  'radius-b': ['radius-bl', 'radius-br'],
  'radius-r': ['radius-tr', 'radius-br'],
  'radius-l': ['radius-tl', 'radius-bl'],
  // Axis border width/color remove only their own two sides, not `border-s`/`border-e`.
  'borderw-x': ['borderw-r', 'borderw-l'],
  'borderw-y': ['borderw-t', 'borderw-b'],
  'borderc-x': ['borderc-r', 'borderc-l'],
  'borderc-y': ['borderc-t', 'borderc-b'],
  touch: ['touch-x', 'touch-y', 'touch-pinch'],
  'touch-x': ['touch'],
  'touch-y': ['touch'],
  'touch-pinch': ['touch'],
  translate: ['translate-x', 'translate-y', 'translate-none'],
  'translate-none': ['translate', 'translate-x', 'translate-y', 'translate-z'],
  'line-clamp': ['display', 'overflow'],
  // The scrolling offset families split like margin/padding: a bare side removes only
  // its own axis halves, and the shorthand removes them all.
  'scroll-m': [
    'scroll-mx',
    'scroll-my',
    'scroll-mt',
    'scroll-mr',
    'scroll-mb',
    'scroll-ml',
    'scroll-ms',
    'scroll-me',
    'scroll-mbs',
    'scroll-mbe',
  ],
  'scroll-mx': ['scroll-ml', 'scroll-mr'],
  'scroll-my': ['scroll-mt', 'scroll-mb'],
  'scroll-p': [
    'scroll-px',
    'scroll-py',
    'scroll-pt',
    'scroll-pr',
    'scroll-pb',
    'scroll-pl',
    'scroll-ps',
    'scroll-pe',
    'scroll-pbs',
    'scroll-pbe',
  ],
  'scroll-px': ['scroll-pl', 'scroll-pr'],
  'scroll-py': ['scroll-pt', 'scroll-pb'],
  'flex-shorthand': ['shrink-factor', 'grow-factor', 'flex-basis'],
  overflow: ['overflow-x', 'overflow-y'],
  'border-spacing': ['border-spacing-x', 'border-spacing-y'],
  overscroll: ['overscroll-x', 'overscroll-y'],
};

/**
 * Split the trailing modifier stack off a class name at the LAST `:` that is not
 * inside a bracket or paren, so `text-[color:var(--border)]` is one utility,
 * `[&>svg]:size-4` is a modifier plus `size-4`, and
 * `motion-safe:group-hover:opacity-100` keeps both modifiers in its key, which
 * is what stops `hover:p-2` from colliding with `p-2`.
 *
 * Returns `[modifier, base]`; the modifier is `''` for a bare utility.
 */
export function splitModifier(cls: string): [modifier: string, base: string] {
  let depth = 0;
  let cut = -1;
  // A leading `!` (important) belongs to the base, not to the modifier stack.
  const start = cls.charCodeAt(0) === 33 ? 1 : 0;
  for (let i = start; i < cls.length; i++) {
    const c = cls[i];
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth--;
    else if (c === ':' && depth === 0) cut = i;
  }
  return cut === -1 ? [cls.slice(0, start), cls.slice(start)] : [cls.slice(0, cut + 1), cls.slice(cut + 1)];
}

/**
 * The conflict key of a base name, or `null` when the table does not know it.
 *
 * Exported (as `classKeyOf`, bound to the shipped table) for the drift guard,
 * which derives its cross-corpus from it: the pairs that matter for a consumer's
 * `class` prop are the ones this merger lumps into ONE key.
 */
export function keyOf(table: ClassMergeTable, base: string): string | null {
  for (const entry of table) {
    const match = base.match(entry[0]);
    if (match) {
      const key = typeof entry[1] === 'function' ? entry[1](match, base) : entry[1];
      // An entry may return `''` to say "this shape is NOT mine" — `shadow-[3px]` is not a
      // box shadow to tailwind-merge, and filing it under a key would delete a real `shadow`
      // beside it. Returning the empty key is how a pattern opts back out.
      return key === '' ? null : key;
    }
  }
  return null;
}

/** A token split once, plus the key it resolves to (`null` for a class the table does not know). */
interface ParsedToken {
  readonly modifier: string;
  readonly base: string;
  readonly key: string | null;
}

/**
 * A cap, not an eviction policy: the keys are class names, so the only way any of these maps
 * grows without bound is a consumer passing unique strings forever, and clearing wholesale costs
 * one re-scan of the table while keeping the map from becoming a leak.
 */
const CACHE_CAP = 4096;

/**
 * Build a merger over an explicit table.
 *
 * The table is a parameter so `cn-merge.drift.test.ts` can drive a deliberately broken one and
 * prove the oracle harness reports the divergence it creates: a parity test that cannot fail is
 * the one thing worse than no parity test. The shipped merger is the one bound below.
 *
 * THE CACHES ARE LOAD-BEARING, not a micro-optimisation. This function runs on every render of
 * every component that composes classes, and the table is ~220 regexes scanned per token: the
 * direct implementation measured 93.6µs per call against `tailwind-merge`'s 6.8µs on the same
 * input, and 88.6µs against 0.3µs when the SAME class list is merged again, which is what a
 * re-render does, and `tailwind-merge` memoises the whole call for exactly that reason. Both
 * halves are cached here: the parse (so a token costs one regex scan ever) and the call (so an
 * unchanged component costs one string comparison). Both cache a pure function of arguments that
 * are constant for the life of the module, so neither can change an output.
 */
export function createClassMerger(table: ClassMergeTable, removes: ClassRemoves): ClassMerger {
  const parsedTokens = new Map<string, ParsedToken>();
  const droppedKeys = new Map<string, ReadonlySet<string>>();
  const mergedLists = new Map<string, string>();

  const parse = (token: string): ParsedToken => {
    const cached = parsedTokens.get(token);
    if (cached !== undefined) return cached;
    const [modifier, base] = splitModifier(token);
    const info: ParsedToken = { modifier, base, key: keyOf(table, base) };
    if (parsedTokens.size >= CACHE_CAP) parsedTokens.clear();
    parsedTokens.set(token, info);
    return info;
  };

  /** The key itself, plus every key it removes from the classes before it. */
  const droppedBy = (key: string): ReadonlySet<string> => {
    const cached = droppedKeys.get(key);
    if (cached !== undefined) return cached;
    const set = new Set<string>([key]);
    const extra = removes[key];
    if (extra) for (const other of extra) set.add(other);
    if (droppedKeys.size >= CACHE_CAP) droppedKeys.clear();
    droppedKeys.set(key, set);
    return set;
  };

  return (classList: string): string => {
    const cached = mergedLists.get(classList);
    if (cached !== undefined) return cached;

    const out: string[] = [];
    for (const cls of classList.split(' ')) {
      if (!cls) continue;
      const token = parse(cls);
      if (token.key === null) {
        // Unknown to the table: kept verbatim, and its key is itself, so it can never
        // conflict with anything.
        out.push(cls);
        continue;
      }
      const dropped = droppedBy(token.key);
      for (let i = out.length - 1; i >= 0; i--) {
        const earlier = parse(out[i]);
        if (earlier.modifier !== token.modifier) continue;
        if (earlier.key !== null && dropped.has(earlier.key)) out.splice(i, 1);
      }
      out.push(cls);
    }

    const merged = out.join(' ');
    if (mergedLists.size >= CACHE_CAP) mergedLists.clear();
    mergedLists.set(classList, merged);
    return merged;
  };
}

/** The merger `cn()` uses: the table above, diffed against `tailwind-merge` on every test run. */
export const mergeClassList: ClassMerger = createClassMerger(CLASS_TABLE, REMOVES);

/** `keyOf` bound to the shipped table, for the drift guard's corpus derivation. */
export const classKeyOf = (base: string): string | null => keyOf(CLASS_TABLE, base);
