#!/usr/bin/env node
/**
 * Guard: a web-component facade may render only PUBLIC parts.
 *
 * THE RULE: every VALUE a facade under `src/web-components` takes from the rest
 * of `src/` must be publicly reachable, i.e. exported by one of the package's
 * source entry points, so a consumer can compose exactly what the facade
 * composes. A facade built from private parts cannot be reproduced.
 *
 * THE FACADE LIST IS DERIVED, not kept: every file under `src/web-components`
 * that CALLS `defineWebComponent` is a facade. A hand-kept list was a copy of a
 * fact the tree already knows, and a facade missing from it was never checked.
 * The discovered tags must equal the tags in `web-component-manifest.json`, so
 * the scan cannot quietly cover less than the registered set.
 *
 * WHAT "PUBLIC" MEANS: the entry files are derived from the `types` fields of
 * `package.json` `exports` (`./dist/x.d.ts` -> `src/x.ts`, `./dist/x/index.d.ts`
 * -> `src/x/index.ts`). A symbol is public when an entry exports it, compared by
 * the DECLARATION the checker resolves to.
 *
 * RE-EXPORT CHAINS ARE FOLLOWED. A facade importing through a local barrel
 * (`./local_re` that says `export { X } from '../../components/..'`) is
 * classified by where `X` is finally declared, via `getAliasedSymbol`. Checking
 * the specifier only would let one extra hop hide any private import.
 *
 * LAYER-INTERNAL: a symbol declared under `src/web-components` itself is the
 * facade layer, not a part, and is exempt. Everything else under `src/` is not.
 * Type-only imports and types (no value meaning) are allowed. Dynamic `import()`
 * of a kit module, a namespace import of a non-entry module, and a side-effect
 * import of one are findings too.
 *
 * WAIVER, a parsed directive at the import site (above the statement or inside
 * it), same discipline as lint-silent-drops. It names ONLY the symbols it covers
 * (`*` for a namespace, dynamic or side-effect import) and needs a reason:
 *
 *   // lint-preset-parts: private <name>[,<name>] -- <reason, >= 20 chars>
 *
 * A waiver naming a symbol that is no longer a finding fails the run, so the
 * table cannot rot open.
 *
 * An import that does not resolve is classified by its path, so a misspelled or
 * missing private module is still a finding. `--self-test` runs the fixtures
 * under `scripts/fixtures/preset-parts`, including the barrel-chain evasion.
 *
 * Needs no build. `node scripts/lint-preset-parts.mjs [--self-test]`.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const UI = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(UI, 'src') + sep;
const WC = resolve(UI, 'src/web-components') + sep;
const WAIVER = /lint-preset-parts:\s*private\s+([^\s]+)\s*--\s*(.*?)\s*(?:\*\/)?$/;
const MIN_REASON = 20;

const opts = (() => {
  const cfg = ts.readConfigFile(resolve(UI, 'tsconfig.json'), ts.sys.readFile);
  return ts.parseJsonConfigFileContent(cfg.config, ts.sys, UI).options;
})();

/** Source entry files, derived from package.json exports `types`. */
function entryFiles() {
  const exp = JSON.parse(readFileSync(resolve(UI, 'package.json'), 'utf8')).exports ?? {};
  const out = new Set();
  for (const v of Object.values(exp)) {
    const t = typeof v === 'object' && v ? v.types : null;
    if (typeof t !== 'string' || !t.startsWith('./dist/') || !t.endsWith('.d.ts') || t.includes('*')) continue;
    const base = t.slice('./dist/'.length, -'.d.ts'.length);
    for (const c of [`src/${base}.ts`, `src/${base}.tsx`]) if (existsSync(resolve(UI, c))) out.add(resolve(UI, c));
  }
  return [...out];
}

function walk(dir, acc = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(n) && !/\.d\.ts$/.test(n) && !/\.(test|stories)\.tsx?$/.test(n)) acc.push(p);
  }
  return acc;
}

/** Facades = files under src/web-components that call defineWebComponent; returns {file, tag}. */
function discoverFacades() {
  const found = [];
  const defineDir = resolve(WC, 'define') + sep;
  for (const file of walk(resolve(WC))) {
    if (file.startsWith(defineDir)) continue;
    const text = readFileSync(file, 'utf8');
    if (!text.includes('defineWebComponent')) continue;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
    const visit = (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'defineWebComponent') {
        const a = n.arguments[0];
        found.push({ file, tag: a && ts.isStringLiteralLike(a) ? a.text : null });
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return found;
}

function waiversFor(sf, node) {
  // Directives above the statement, or anywhere inside it.
  let stmt = node;
  while (stmt.parent && !ts.isSourceFile(stmt.parent) && !ts.isBlock(stmt.parent)) stmt = stmt.parent;
  const text = sf.text;
  const chunks = [];
  for (const r of ts.getLeadingCommentRanges(text, stmt.getFullStart()) ?? []) chunks.push(text.slice(r.pos, r.end));
  chunks.push(stmt.getText(sf));
  const out = [];
  for (const chunk of chunks) {
    for (const line of chunk.split('\n')) {
      const m = line.match(WAIVER);
      if (m && line.includes('//') || m && line.includes('/*')) out.push({ names: m[1].split(','), reason: m[2] });
    }
  }
  return out;
}

function analyse(facades) {
  const entries = entryFiles();
  const program = ts.createProgram({ rootNames: [...new Set([...entries, ...facades])], options: opts });
  const checker = program.getTypeChecker();
  const resolveAlias = (s) => (s && s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s);
  const publicSyms = new Set();
  const publicFiles = new Set(entries);
  for (const e of entries) {
    const sf = program.getSourceFile(e);
    const ms = sf && checker.getSymbolAtLocation(sf);
    if (!ms) throw new Error(`cannot read exports of ${e}`);
    for (const s of checker.getExportsOfModule(ms)) publicSyms.add(resolveAlias(s));
  }
  if (publicSyms.size === 0) throw new Error('no public exports found; the checker is broken, not the tree clean');

  const findings = [];
  let checked = 0;
  const rel = (f) => relative(UI, f);
  const kitPath = (p) => p.startsWith(SRC) && !p.startsWith(WC);

  for (const facade of facades) {
    const sf = program.getSourceFile(facade);
    if (!sf) throw new Error(`facade not in program: ${facade}`);
    const used = new Map(); // waiver name -> {covered:false}
    const decide = (node, name, spec, why) => {
      checked++;
      const ws = waiversFor(sf, node);
      let waived = false;
      for (const w of ws) {
        if (!w.names.includes(name)) continue;
        if (w.reason.length < MIN_REASON) {
          findings.push(`${rel(facade)}: waiver for ${name} needs a reason of at least ${MIN_REASON} characters`);
          waived = true;
        } else waived = true;
        used.set(`${name}@${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line}`, true);
      }
      if (!waived) findings.push(`${rel(facade)}: ${name} from ${spec} ${why}`);
    };
    const notPublic = 'is not public; re-export it from a package entry (src/solid.ts or src/index.ts), or waive it with `// lint-preset-parts: private <name> -- <reason>`';
    const pathOf = (spec) => {
      const r = ts.resolveModuleName(spec, facade, opts, ts.sys).resolvedModule?.resolvedFileName;
      return resolve(r ?? (spec.startsWith('.') ? resolve(dirname(facade), spec) : '/nonexistent'));
    };
    const declared = [];

    const visit = (n) => {
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) || ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
        const spec = n.moduleSpecifier.text;
        const clause = ts.isImportDeclaration(n) ? n.importClause : n.exportClause;
        const typeOnly = ts.isImportDeclaration(n) ? clause?.isTypeOnly : n.isTypeOnly;
        if (typeOnly) return;
        const path = pathOf(spec);
        if (!ts.isImportDeclaration(n) && !kitPath(path)) return;
        if (ts.isImportDeclaration(n) && !clause) {
          if (kitPath(path) && !publicFiles.has(path)) decide(n, '*', spec, 'is a side-effect import of a non-public module');
          return;
        }
        const items = [];
        if (ts.isImportDeclaration(n)) {
          if (clause.name) items.push({ name: 'default', node: clause.name });
          const nb = clause.namedBindings;
          if (nb && ts.isNamespaceImport(nb)) items.push({ name: '*', node: nb.name, ns: true });
          if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) if (!el.isTypeOnly) items.push({ name: (el.propertyName ?? el.name).text, node: el.name });
        } else if (n.exportClause && ts.isNamedExports(n.exportClause)) {
          for (const el of n.exportClause.elements) if (!el.isTypeOnly) items.push({ name: (el.propertyName ?? el.name).text, node: el.name });
        } else if (!n.exportClause) items.push({ name: '*', node: n, ns: true });
        for (const it of items) {
          if (it.ns) {
            if (kitPath(path) && !publicFiles.has(path)) decide(n, '*', spec, 'is a namespace import of a non-public module');
            continue;
          }
          const sym = checker.getSymbolAtLocation(it.node);
          const target = sym ? resolveAlias(sym) : undefined;
          const decl = target?.declarations?.[0];
          if (!target || !decl || target.flags === ts.SymbolFlags.None || (sym.flags & ts.SymbolFlags.Alias) && target === sym && !decl) {
            // Unresolved: classify by path.
            if (kitPath(path)) decide(n, it.name, spec, notPublic);
            continue;
          }
          const dfile = resolve(decl.getSourceFile().fileName);
          if (!kitPath(dfile)) continue; // layer-internal or outside the kit
          if (!(target.flags & ts.SymbolFlags.Value)) continue; // type only
          if (publicSyms.has(target)) { checked++; continue; }
          decide(n, it.name, spec, notPublic);
        }
        return;
      }
      if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const a = n.arguments[0];
        if (a && ts.isStringLiteralLike(a)) {
          if (kitPath(pathOf(a.text))) decide(n, '*', a.text, 'is a dynamic import() of a kit module; import it statically from a public entry or waive it');
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);

    // Stale waivers: a named symbol that produced no finding.
    const text = sf.text;
    text.split('\n').forEach((line, i) => {
      const m = line.match(WAIVER);
      if (!m || !(line.includes('//') || line.includes('/*'))) return;
      for (const name of m[1].split(',')) {
        const hit = [...used.keys()].some((k) => k.startsWith(`${name}@`) && Math.abs(Number(k.split('@')[1]) - i) <= 12);
        if (!hit) findings.push(`${rel(facade)}:${i + 1}: stale waiver, ${name} is not a private import here; delete it`);
      }
    });
  }
  return { findings, checked };
}

function selfTest() {
  const fx = (n) => resolve(UI, 'scripts/fixtures/preset-parts', n, 'facade.tsx');
  const names = ['private-import', 'clean', 'chain-private', 'chain-clean', 'dynamic-import', 'waived'];
  // One program over every fixture: building it is the whole cost.
  const all = analyse(names.map(fx));
  const of = (n) => all.findings.filter((f) => f.startsWith(`scripts/fixtures/preset-parts/${n}/`));
  const expect = { 'private-import': true, clean: false, 'chain-private': true, 'chain-clean': false, 'dynamic-import': true, waived: false };
  let failed = false;
  for (const n of names) {
    const got = of(n).length > 0;
    if (got !== expect[n]) {
      console.error(`self-test FAILED: ${n} ${got ? 'produced findings:\n' + of(n).join('\n') : 'produced no finding'}`);
      failed = true;
    }
  }
  if (all.checked < names.length) { console.error('self-test FAILED: too few imports checked (vacuous)'); failed = true; }
  if (failed) process.exit(1);
  console.log(`lint-preset-parts self-test OK (${names.length} fixtures: private-import, chain-private, dynamic-import fire; clean, chain-clean, waived pass)`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const found = discoverFacades();
  const manifest = JSON.parse(readFileSync(resolve(WC, 'web-component-manifest.json'), 'utf8')).tags;
  const tags = new Set(found.map((f) => f.tag).filter(Boolean));
  const missing = Object.keys(manifest).filter((t) => !tags.has(t));
  if (found.length === 0 || missing.length) {
    console.error(`facade discovery is broken, not the tree clean: ${found.length} found, registered but not discovered: ${missing.join(', ') || 'none'}`);
    process.exit(1);
  }
  const files = [...new Set(found.map((f) => f.file))];
  const { findings, checked } = analyse(files);
  if (checked === 0) {
    console.error('no kit imports found in any facade: the scan is broken, not the tree clean');
    process.exit(1);
  }
  if (findings.length) {
    console.error(`lint-preset-parts: ${findings.length} finding(s)\n` + findings.join('\n'));
    process.exit(1);
  }
  console.log(`lint-preset-parts OK: ${files.length} facade files (${tags.size} tags), ${checked} kit imports checked`);
}

main();
