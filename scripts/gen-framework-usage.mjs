// Emits src/elements/framework-usage.json — per-element copy-paste snippets for
// HTML/React/Vue/Angular/Svelte/Solid, rendered one-at-a-time in the API tab's "Usage"
// block. Generated from element-meta (no drift). The Solid snippet is an
// approximation from the element's props/events (not the Solid component's exact
// signature) and only appears when a same-named Solid export exists.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// CDN URL for the self-contained element bundle (registers all kai-* custom elements).
// Source of truth: Installation.mdx § "Via CDN" and README.md § "Or load from a CDN".
const CDN_ELEMENTS = 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kai.es.js';

// Some elements have a displayName that doesn't match the Solid export name.
// Map element displayName → actual Solid export name for those cases.
// Only add entries where a real Solid export exists (verified against src/index.ts).
const SOLID_NAME_ALIASES = {
  Conversations: 'ConversationList',
  ScopePicker: 'ChatScopePicker',
  Skills: 'MessageSkills',
  Sources: 'SourceList',
  // 'Suggestions' intentionally omitted — the kai-suggestions element composes
  // individual PromptSuggestion chips; there is no single Solid wrapper component
  // that mirrors the element's array-of-suggestions API.
};

// Event names are lower-kebab, kai-prefixed (e.g. `kai-message-action`). React/Solid handler
// props strip the `kai-` prefix and PascalCase on hyphens → `onMessageAction`.
const onName = (ev) => 'on' + ev.replace(/^kai-/, '').split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
const required = (el) => el.props.filter((p) => !p.optional);

/** Wraps binding lines into a multi-line tag block.
 *  open  — e.g. '<Artifact'
 *  lines — array of binding strings (without leading spaces)
 *  close — e.g. '/>' or '></kai-artifact>'
 */
function wrapTag(open, lines, close) {
  if (lines.length === 0) return null; // caller handles compact form
  return `${open}\n${lines.map((l) => `  ${l}`).join('\n')}\n${close}`;
}

function htmlSnippet(el) {
  const req = required(el);
  const body = [
    ...req.filter((p) => !p.scalar).map((p) => `  el.${p.name} = /* … */;`),
    ...el.events.map((e) => `  el.addEventListener('${e.name}', (e) => console.log(e.detail));`),
  ];
  const attrs = req.filter((p) => p.scalar).map((p) => ` ${p.name}="…"`).join('');
  const tag = `<${el.tag}${attrs}></${el.tag}>`;
  const cdnLine = `<script type="module" src="${CDN_ELEMENTS}"></script>`;
  if (!body.length) return `${cdnLine}\n\n${tag}`;
  return [
    cdnLine,
    ``,
    tag,
    `<script type="module">`,
    `  const el = document.querySelector('${el.tag}');`,
    ...body,
    `</script>`,
  ].join('\n');
}

function svelteSnippet(el) {
  const lines = [
    ...required(el).map((p) => `{${p.name}}`),
    ...el.events.map((e) => `on:${e.name}={${onName(e.name)}}`),
  ];
  const scriptBlock = `<script>\n  import '@kitn.ai/ui/elements';\n</script>`;
  const tag = wrapTag(`<${el.tag}`, lines, `></${el.tag}>`) ?? `<${el.tag}></${el.tag}>`;
  return `${scriptBlock}\n\n${tag}`;
}
function vueSnippet(el) {
  const lines = [
    ...required(el).map((p) => (p.scalar ? `:${p.name}="${p.name}"` : `:${p.name}.prop="${p.name}"`)),
    ...el.events.map((e) => `@${e.name}="${onName(e.name)}"`),
  ];
  return wrapTag(`<${el.tag}`, lines, '/>') ?? `<${el.tag} />`;
}
function angularSnippet(el) {
  const lines = [
    ...required(el).map((p) => `[${p.name}]="${p.name}"`),
    ...el.events.map((e) => `(${e.name})="${onName(e.name)}($event)"`),
  ];
  return wrapTag(`<${el.tag}`, lines, `></${el.tag}>`) ?? `<${el.tag}></${el.tag}>`;
}
function jsxSnippet(el, pkg, componentName) {
  const name = componentName ?? el.displayName;
  const lines = [
    ...required(el).map((p) => `${p.name}={${p.name}}`),
    ...el.events.map((e) => `${onName(e.name)}={(e) => console.log(e.detail)}`),
  ];
  const tag = wrapTag(`<${name}`, lines, '/>') ?? `<${name} />`;
  return `import { ${name} } from '${pkg}';\n\n${tag}`;
}

export function buildSnippets(el, hasSolid, solidName) {
  const snippets = {
    html: htmlSnippet(el),
    react: jsxSnippet(el, '@kitn.ai/ui/react'),
    vue: vueSnippet(el),
    svelte: svelteSnippet(el),
    angular: angularSnippet(el),
  };
  if (hasSolid) snippets.solid = jsxSnippet(el, '@kitn.ai/ui', solidName);
  return snippets;
}

export function writeFrameworkUsage(root, elements) {
  let solidNames = new Set();
  try {
    const comps = JSON.parse(readFileSync(resolve(root, 'src/components/component-meta.json'), 'utf8'));
    solidNames = new Set(comps.map((c) => c.name));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    // component-meta not generated yet — no Solid tabs
  }
  const out = elements.map((el) => {
    // First try exact match; fall back to the alias map for elements whose
    // displayName doesn't match the Solid export name.
    const aliasedName = SOLID_NAME_ALIASES[el.displayName];
    const solidName = solidNames.has(el.displayName)
      ? el.displayName
      : aliasedName && solidNames.has(aliasedName)
        ? aliasedName
        : undefined;
    const hasSolid = solidName !== undefined;
    return { tag: el.tag, displayName: el.displayName, hasSolid, snippets: buildSnippets(el, hasSolid, solidName) };
  });
  writeFileSync(resolve(root, 'src/elements/framework-usage.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ src/elements/framework-usage.json — ${out.length} elements`);
}
