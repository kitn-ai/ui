// Emits src/elements/framework-usage.json — per-element copy-paste snippets for
// HTML/React/Vue/Angular/Solid, rendered one-at-a-time in the API tab's "Usage"
// block. Generated from element-meta (no drift). The Solid snippet is an
// approximation from the element's props/events (not the Solid component's exact
// signature) and only appears when a same-named Solid export exists.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const onName = (ev) => 'on' + ev[0].toUpperCase() + ev.slice(1);
const required = (el) => el.props.filter((p) => !p.optional);

function htmlSnippet(el) {
  const req = required(el);
  const body = [
    ...req.filter((p) => !p.scalar).map((p) => `  el.${p.name} = /* … */;`),
    ...el.events.map((e) => `  el.addEventListener('${e.name}', (e) => console.log(e.detail));`),
  ];
  const attrs = req.filter((p) => p.scalar).map((p) => ` ${p.name}="…"`).join('');
  const tag = `<${el.tag}${attrs}></${el.tag}>`;
  if (!body.length) return tag;
  return [
    tag,
    `<script type="module">`,
    `  import '@kitn.ai/chat/elements';`,
    `  const el = document.querySelector('${el.tag}');`,
    ...body,
    `</script>`,
  ].join('\n');
}
function vueSnippet(el) {
  const binds = required(el).map((p) => (p.scalar ? ` :${p.name}="${p.name}"` : ` :${p.name}.prop="${p.name}"`)).join('');
  const evs = el.events.map((e) => ` @${e.name}="${onName(e.name)}"`).join('');
  return `<${el.tag}${binds}${evs} />`;
}
function angularSnippet(el) {
  const binds = required(el).map((p) => ` [${p.name}]="${p.name}"`).join('');
  const evs = el.events.map((e) => ` (${e.name})="${onName(e.name)}($event)"`).join('');
  return `<${el.tag}${binds}${evs}></${el.tag}>`;
}
function jsxSnippet(el, pkg) {
  const binds = required(el).map((p) => ` ${p.name}={${p.name}}`).join('');
  const evs = el.events.map((e) => ` ${onName(e.name)}={(e) => console.log(e.detail)}`).join('');
  return `import { ${el.displayName} } from '${pkg}';\n\n<${el.displayName}${binds}${evs} />`;
}

export function buildSnippets(el, hasSolid) {
  const snippets = {
    html: htmlSnippet(el),
    react: jsxSnippet(el, '@kitn.ai/chat/react'),
    vue: vueSnippet(el),
    angular: angularSnippet(el),
  };
  if (hasSolid) snippets.solid = jsxSnippet(el, '@kitn.ai/chat');
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
    const hasSolid = solidNames.has(el.displayName);
    return { tag: el.tag, displayName: el.displayName, hasSolid, snippets: buildSnippets(el, hasSolid) };
  });
  writeFileSync(resolve(root, 'src/elements/framework-usage.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ src/elements/framework-usage.json — ${out.length} elements`);
}
