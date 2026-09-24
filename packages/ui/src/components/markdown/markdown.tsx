import { splitProps, createMemo, createUniqueId, For, Switch, Match } from 'solid-js';
import type { JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { Marked, type MarkedToken, type Token, type Tokens } from 'marked';
import { CodeBlock, CodeBlockCode } from '../code-block/code-block';
import { useChatConfig, textClass } from '../../primitives/chat-config';
import { isSafeUrl } from '../../primitives/card-routing';

// --- Markdown, rendered from the parser's TOKEN STREAM -----------------------
//
// This used to be the kit's one raw-`innerHTML` write, so a string the model produced
// became live DOM in the host page's origin. It is not any more: `marked` tokenizes and
// the tokens render to Solid JSX below, so no model-produced string reaches the HTML
// parser and the sink does not exist rather than being guarded.
//
// ESCAPE, not SANITIZE, and no DOMPurify: a sanitizer needs a DOM, and in Node this
// package's ESM build has no `sanitize` at all, so the SSR path would throw or be
// "guarded" into returning the payload UNCHANGED, a silent passthrough of the exact string
// we meant to neutralise. Rendering tokens performs no string-to-markup step, costs no
// dependency, and it is the better rendering too: raw HTML in model output is either the
// model quoting markup, which the reader should SEE as text, or an injection. There is
// deliberately NO opt-in to restore raw HTML.
//
// WHERE IT HAPPENS: an `html` token returns its raw text as a TEXT node, so the DOM
// escapes at the boundary and the reader sees `<img src=x onerror=...>` as text. That is
// why no `escapeText`/`escapeAttr` helper survives: every string now goes through
// `createTextNode` / `setAttribute`, and escaping INTO a text node would double-escape it.

// A PRIVATE instance, not the shared `marked` singleton: this file reads the instance's
// TOKEN STREAM, so configuring the singleton would let a consumer's own
// `marked.use({ tokenizer })` elsewhere in the app silently rewrite what renders here,
// and it keeps the kit from mutating global `marked` options out from under a consumer.
const md = new Marked({
  gfm: true,
  breaks: true,
});

// --- Character references (`&amp;` and friends) -------------------------------
//
// Going token-stream-direct deleted the HTML parser from the path, and with it the
// free entity decoding it did: the old string sink turned `AT&amp;T` into `AT&T`,
// while a text node shows the reader the SOURCE `AT&amp;T`. This restores the decode
// by hand, for the markdown spec's character references only. `marked` is no help:
// `md.lexer('AT&amp;T')` yields the raw text, and its one mapping table runs the
// OTHER way (`escape()` -> `&amp;` for HTML output).
//
// Node-safe by construction: the DOM's entity table lives on a DOM and the SSR path
// has none, so the named table is bounded and written out below rather than looked up.
//
// NEVER APPLIED TO A URL: `href` and `src` go to `isSafeUrl` and the DOM exactly as
// the model wrote them, because decoding one would open the `javascript:` hole
// rather than close it (see the `link` case). Fenced `code` and `codespan` are not
// decoded either: inside a code sample a character reference is literal.

/** Named character references this renderer decodes. Bounded on purpose: the few
 *  dozen a chat's model actually emits, not the ~2200 the spec defines. An unknown
 *  name is left literal rather than guessed at, so an unrecognised reference stays
 *  VISIBLE (see its use in `decodeCharacterReferences`). */
const NAMED_CHARACTER_REFERENCES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  iexcl: '\u00A1',
  cent: '\u00A2',
  pound: '\u00A3',
  curren: '\u00A4',
  yen: '\u00A5',
  sect: '\u00A7',
  copy: '\u00A9',
  laquo: '\u00AB',
  reg: '\u00AE',
  deg: '\u00B0',
  plusmn: '\u00B1',
  sup2: '\u00B2',
  sup3: '\u00B3',
  micro: '\u00B5',
  para: '\u00B6',
  middot: '\u00B7',
  frac14: '\u00BC',
  frac12: '\u00BD',
  frac34: '\u00BE',
  times: '\u00D7',
  divide: '\u00F7',
  iquest: '\u00BF',
  ndash: '\u2013',
  // lint-prop-docs: em-dash-copy -- this table maps HTML entities to the character they name
  mdash: '\u2014',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201C',
  rdquo: '\u201D',
  bull: '\u2022',
  hellip: '\u2026',
  permil: '\u2030',
  prime: '\u2032',
  Prime: '\u2033',
  trade: '\u2122',
  euro: '\u20AC',
};

/** The trailing semicolon is REQUIRED, and that is what keeps `AT&T`, `&amp` and a
 *  bare `&` untouched: none of them matches. A malformed numeric body (`&#xZZ;`)
 *  does not match either, so it can never reach `fromCodePoint` to throw. */
const CHARACTER_REFERENCE = /&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;

/** Decode character references in MODEL TEXT. Never call this on a URL, and never
 *  on code. Literal output stays byte-for-byte literal for an unknown name, a
 *  missing semicolon, a bare `&`, and any numeric outside the Unicode range. */
function decodeCharacterReferences(text: string): string {
  if (!text.includes('&')) return text;
  return text.replace(CHARACTER_REFERENCE, (match, body: string) => {
    if (body.charCodeAt(0) !== 35 /* # */) {
      return NAMED_CHARACTER_REFERENCES[body] ?? match;
    }
    const hexadecimal = body[1] === 'x' || body[1] === 'X';
    const codePoint = Number.parseInt(body.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    // A surrogate is not a Unicode scalar value, and `fromCodePoint` would happily
    // put a lone half into the text node, so the range check excludes it along with
    // the genuinely out-of-range numerics (`&#999999999;`), which stay literal.
    if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return match;
    return String.fromCodePoint(codePoint);
  });
}

// --- Token stream -> JSX -----------------------------------------------------
//
// ONE walk serves block and inline streams. marked's own renderer splits them
// across `parse` / `parseInline` only because each of its switches is partial;
// `renderToken` below covers the whole `MarkedToken` union in one place, so the
// stream a caller has in hand is rendered without asking which kind it is.
//
// HOW "NO VARIANT IS MISSED" IS KEPT TRUE: the switch is exhaustive over
// `MarkedToken` as declared by the INSTALLED `marked`, so a variant added by a
// marked upgrade fails `tsc` here instead of silently rendering nothing. Read that
// union in `node_modules/marked/lib/marked.d.ts`; do not trust a copy in a comment.

/** Render a token stream to JSX. */
function renderTokens(tokens: readonly Token[]): JSX.Element {
  return tokens.map(renderTokenFrom);
}

/** The one cast site. The private `Marked` instance above registers no
 *  extensions, so its lexer can only emit `MarkedToken`s -- `Tokens.Generic`, the
 *  index-signature escape hatch an extension tokenizes into, is unreachable here.
 *  Were one to appear anyway, `renderToken` throws on it rather than dropping it. */
function renderTokenFrom(token: Token): JSX.Element {
  return renderToken(token as MarkedToken);
}

/** `h1`-`h6`. marked only ever emits `#{1,6}` depths, so `h6` is the floor. */
function heading(depth: number, children: JSX.Element): JSX.Element {
  switch (depth) {
    case 1:
      return <h1>{children}</h1>;
    case 2:
      return <h2>{children}</h2>;
    case 3:
      return <h3>{children}</h3>;
    case 4:
      return <h4>{children}</h4>;
    case 5:
      return <h5>{children}</h5>;
    default:
      return <h6>{children}</h6>;
  }
}

/** One GFM table cell. marked writes the alignment as an `align` attribute rather
 *  than a style, and that is kept as-is so the DOM shape stays the parser's. */
function tableCell(cell: Tokens.TableCell): JSX.Element {
  const children = renderTokens(cell.tokens);
  const align = cell.align ?? undefined;
  return cell.header ? <th align={align}>{children}</th> : <td align={align}>{children}</td>;
}

/**
 * One token, rendered. Every branch mirrors marked's own default renderer for the
 * same token, except that what it returns is JSX instead of an HTML string:
 *
 *   - `html` is the security-critical one. Both raw-HTML token kinds land here
 *     (block `Tokens.HTML` and inline `Tokens.Tag` share `type: 'html'`) and both
 *     become a TEXT node, so the markup is VISIBLE to the reader and inert.
 *   - `link` and `image` are the two the `html` escaping does NOT cover: marked
 *     builds those from markdown syntax, so each judges its RAW `href` with the
 *     kit's one URL-scheme policy. A blocked link keeps its LABEL and a blocked
 *     image falls back to its alt text -- refusing to link is not licence to make
 *     the model's words vanish.
 *   - `code` is reached only for a NESTED fence (inside a blockquote or list item);
 *     a top-level fence is split out by `parseMarkdownIntoBlocks` and rendered by
 *     the Solid `CodeBlock` instead.
 */
function renderToken(token: MarkedToken): JSX.Element {
  switch (token.type) {
    // Whitespace between blocks, and link definitions (which render nothing at
    // all -- marked's `def` renderer returns the empty string).
    case 'space':
    case 'def':
      return null;

    case 'hr':
      return <hr />;

    case 'br':
      return <br />;

    case 'heading':
      return heading(token.depth, renderTokens(token.tokens));

    case 'paragraph':
      return <p>{renderTokens(token.tokens)}</p>;

    case 'blockquote':
      return <blockquote>{renderTokens(token.tokens)}</blockquote>;

    case 'list':
      return token.ordered ? (
        <ol start={token.start === '' || token.start === 1 ? undefined : token.start}>
          {token.items.map(renderTokenFrom)}
        </ol>
      ) : (
        <ul>{token.items.map(renderTokenFrom)}</ul>
      );

    case 'list_item':
      return <li>{renderTokens(token.tokens)}</li>;

    // GFM task list. marked's own renderer emits a disabled checkbox inline in the
    // item; this is that same element. `checked` is bound the way the kit's own
    // `Checkbox` binds it (a REAL `<input type="checkbox">` behind `appearance:
    // none`), which sets the input's property -- so the box paints ticked, while
    // the client-rendered `outerHTML` carries no `checked` attribute the way an
    // HTML string would have (`setAttribute` is what the SSR renderer emits, and
    // what the browser then honours).
    case 'checkbox':
      return (
        <>
          <input disabled checked={token.checked} type="checkbox" />{' '}
        </>
      );

    case 'table':
      return (
        <table>
          <thead>
            <tr>{token.header.map(tableCell)}</tr>
          </thead>
          {token.rows.length ? (
            <tbody>
              {token.rows.map((row) => (
                <tr>{row.map(tableCell)}</tr>
              ))}
            </tbody>
          ) : null}
        </table>
      );

    case 'code': {
      // `lang` on a fence can carry more than the language (`js title=…`), and
      // marked keeps only the first word, same as its own renderer.
      const lang = token.lang?.match(/^\S*/)?.[0];
      return (
        <pre>
          <code class={lang ? `language-${lang}` : undefined}>
            {token.text.replace(/\n$/, '') + '\n'}
          </code>
        </pre>
      );
    }

    case 'html':
      // Raw HTML -- the model quoting markup, or an injection. Either way the
      // reader gets the SOURCE as text: this is the whole fix, not a defence
      // bolted onto a string. Source, so NOT decoded either -- an `&amp;` here is
      // part of the markup being quoted and stays as written.
      return token.text;

    case 'text':
      // The model's PROSE: character references decode here (`AT&amp;T` reads
      // `AT&T`), because that is what the old HTML-parser sink did and what the
      // reader expects. Anything that is not a reference passes through
      // byte-for-byte -- see `decodeCharacterReferences`.
      return token.tokens ? renderTokens(token.tokens) : decodeCharacterReferences(token.text);

    // A backslash escape (`\*`): the character, unescaped.
    case 'escape':
      return token.text;

    case 'strong':
      return <strong>{renderTokens(token.tokens)}</strong>;

    case 'em':
      return <em>{renderTokens(token.tokens)}</em>;

    case 'del':
      return <del>{renderTokens(token.tokens)}</del>;

    case 'codespan':
      // NOT decoded: in markdown a character reference inside code is literal, so a
      // sample showing `&amp;` must keep showing `&amp;`.
      return <code>{token.text}</code>;

    case 'link': {
      const label = renderTokens(token.tokens);
      // The URL is judged and rendered EXACTLY as the model wrote it -- never
      // decoded, and that is load-bearing rather than tidiness. `javascript&#58;alert(1)`
      // is harmless PRECISELY because nothing decodes it: `isSafeUrl` sees an `&`
      // where a scheme needs its `:`, so the WHATWG parser reads it as a relative
      // path, resolves it against the base and returns `http:` -- the guard passes
      // it, and the browser resolves it the same way, so no script runs. Decode the
      // string first and it becomes a live `javascript:` URL that PASSES the
      // allowlist. So the policy keeps seeing the undecoded string.
      if (!isSafeUrl(token.href)) return label;
      return (
        <a
          href={token.href}
          title={token.title == null ? undefined : decodeCharacterReferences(token.title)}
        >
          {label}
        </a>
      );
    }

    case 'image':
      // Alt text is the fallback for a blocked image, and JSX text is escaped by
      // the DOM, so nothing about the model's string survives as markup. Alt and
      // title are DISPLAY-only attributes (audiences read them, nothing navigates
      // on them), so they decode; `src` above does not, for the reason spelled out
      // at the `link` case.
      if (!isSafeUrl(token.href)) return decodeCharacterReferences(token.text);
      return (
        <img
          src={token.href}
          alt={decodeCharacterReferences(token.text)}
          title={token.title == null ? undefined : decodeCharacterReferences(token.title)}
        />
      );

    default: {
      // Unreachable: the switch above is exhaustive over `MarkedToken` -- `token`
      // is `never` here, which IS the compile-time check that no variant was left
      // out. Loud rather than silent, because a dropped token is content the
      // reader never sees.
      throw new Error(`markdown: unhandled token type "${(token as { type: string }).type}"`);
    }
  }
}

export interface MarkdownProps {
  content: string;
  id?: string;
  class?: string;
  codeTheme?: string;
  /** Optional `::part` name(s) to expose on the rendered root. Lets callers
   *  (e.g. the message bubble) surface a styleable part through the shadow. */
  part?: string;
}

interface ParsedBlock {
  type: 'markdown' | 'code';
  content: string;
  language?: string;
}

function parseMarkdownIntoBlocks(markdown: string): ParsedBlock[] {
  const tokens = md.lexer(markdown);
  return tokens.map((token) => {
    if (token.type === 'code') {
      return {
        type: 'code' as const,
        content: token.text,
        language: token.lang || undefined,
      };
    }
    return {
      type: 'markdown' as const,
      content: token.raw,
    };
  });
}

function MarkdownBlock(props: { content: string }) {
  const body = createMemo(() => {
    try {
      // Same source, same parser, same tokenizer as before -- the block's RAW is
      // re-lexed alone, which is what keeps every rendering detail of the old
      // `md.parse(props.content)` (definitions living in another block stay
      // unresolved) and is why this is the token stream of THAT string rather
      // than the parent's token.
      return renderTokens(md.lexer(props.content));
    } catch {
      // The parse failed, so nothing has been rendered: the raw source must still
      // reach the reader, as text.
      return props.content;
    }
  });

  return <div>{body()}</div>;
}

function Markdown(props: MarkdownProps) {
  const [local] = splitProps(props, ['content', 'id', 'class', 'codeTheme', 'part']);
  const config = useChatConfig();
  const blockId = () => local.id ?? createUniqueId();
  const blocks = createMemo(() => parseMarkdownIntoBlocks(local.content));

  return (
    <div part={local.part} class={cn('chat-markdown max-w-none break-words whitespace-normal [&>div:first-child>p:first-child]:mt-0 [&>div:last-child>p:last-child]:mb-0', textClass(config.proseSize()), local.class)}>
      <For each={blocks()}>
        {(block) => (
          <Switch>
            <Match when={block.type === 'code'}>
              <CodeBlock class="my-4">
                <CodeBlockCode
                  code={block.content}
                  language={block.language}
                  theme={local.codeTheme ?? config.codeTheme()}
                />
              </CodeBlock>
            </Match>
            <Match when={block.type === 'markdown'}>
              <MarkdownBlock content={block.content} />
            </Match>
          </Switch>
        )}
      </For>
    </div>
  );
}

export { Markdown };
