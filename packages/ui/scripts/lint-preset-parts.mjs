#!/usr/bin/env node
/**
 * Guard: a preset facade may render only PUBLIC parts.
 *
 * THE RULE: a facade listed in `scripts/preset-facades.json` may import, by value,
 * only names that a consumer could import too: components re-exported from
 * `src/solid.ts`, primitives re-exported from `src/index.ts`. A preset built from
 * private parts cannot be reproduced by composing the public ones, which is the
 * whole point of a preset.
 *
 * WHY THE CHECKER, NOT A REGEX: `solid.ts` re-exports `index.ts` with `export *`,
 * so the export list has to come from `getExportsOfModule`.
 *
 * Type-only imports are allowed (`import type`, or every named specifier `type`):
 * they vanish at build and cannot make a preset unreproducible.
 *
 * An import whose specifier does not resolve is still classified by its path, so
 * a private/misspelled module under src/components or src/primitives is a finding,
 * never a silent skip.
 *
 * VACUITY: an empty facade list, a missing export list, or zero imports checked is
 * a hard failure. `--self-test` runs the analysis over two fixtures and requires
 * `private-import` to yield a finding and `clean` to yield none.
 *
 * Needs no build. `node scripts/lint-preset-parts.mjs [--self-test]`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const UI = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(UI, 'src');
const SOLID = resolve(SRC, 'solid.ts');
const INDEX = resolve(SRC, 'index.ts');
const COMPONENTS = resolve(SRC, 'components') + sep;
const PRIMITIVES = resolve(SRC, 'primitives') + sep;

function options() {
  const cfgPath = resolve(UI, 'tsconfig.json');
  const cfg = ts.readConfigFile(cfgPath, ts.sys.readFile);
  return ts.parseJsonConfigFileContent(cfg.config, ts.sys, UI).options;
}

function analyse(facades) {
  const opts = options();
  const program = ts.createProgram({ rootNames: [SOLID, INDEX, ...facades], options: opts });
  const checker = program.getTypeChecker();
  const exportsOf = (file) => {
    const sf = program.getSourceFile(file);
    const sym = sf && checker.getSymbolAtLocation(sf);
    if (!sym) throw new Error(`cannot read exports of ${file}`);
    return new Set(checker.getExportsOfModule(sym).map((s) => s.name));
  };
  const solidExports = exportsOf(SOLID);
  const indexExports = exportsOf(INDEX);
  if (solidExports.size === 0 || indexExports.size === 0) {
    throw new Error('export list of solid.ts or index.ts is empty; the checker is broken, not the tree clean');
  }
  const findings = [];
  let checked = 0;
  for (const facade of facades) {
    const sf = program.getSourceFile(facade);
    if (!sf) throw new Error(`facade not in program: ${facade}`);
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const spec = st.moduleSpecifier.text;
      const clause = st.importClause;
      if (!clause || clause.isTypeOnly) continue;
      const resolved = ts.resolveModuleName(spec, facade, opts, ts.sys).resolvedModule?.resolvedFileName;
      const target = resolved ?? (spec.startsWith('.') ? resolve(dirname(facade), spec) : null);
      if (!target) continue;
      const path = resolve(target);
      const inComponents = path.startsWith(COMPONENTS);
      const inPrimitives = path.startsWith(PRIMITIVES);
      if (!inComponents && !inPrimitives) continue;
      const allowed = inComponents ? solidExports : indexExports;
      const rerexport = inComponents ? 'src/solid.ts' : 'src/index.ts';
      const names = [];
      if (clause.name) names.push('default');
      const nb = clause.namedBindings;
      if (nb && ts.isNamespaceImport(nb)) names.push('*');
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) if (!el.isTypeOnly) names.push((el.propertyName ?? el.name).text);
      }
      for (const name of names) {
        checked++;
        if (!allowed.has(name)) {
          findings.push(
            `${relative(UI, facade)}: ${name} from ${spec} is not public; re-export it from ${rerexport}`,
          );
        }
      }
    }
  }
  return { findings, checked };
}

function selfTest() {
  const fx = (n) => resolve(UI, 'scripts/fixtures/preset-parts', n, 'facade.tsx');
  // One program over both fixtures: building it is the whole cost.
  const both = analyse([fx('private-import'), fx('clean')]);
  const bad = { findings: both.findings.filter((f) => f.includes('private-import')) };
  const good = { findings: both.findings.filter((f) => f.includes('/clean/')), checked: both.checked - bad.findings.length };
  let failed = false;
  if (bad.findings.length < 1) { console.error('self-test FAILED: private-import produced no finding'); failed = true; }
  if (good.findings.length !== 0) { console.error('self-test FAILED: clean produced findings:\n' + good.findings.join('\n')); failed = true; }
  if (good.checked < 1) { console.error('self-test FAILED: clean checked no imports (vacuous)'); failed = true; }
  if (failed) process.exit(1);
  console.log(`lint-preset-parts self-test OK (private-import: ${bad.findings.length} finding, clean: 0)`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const list = JSON.parse(readFileSync(resolve(UI, 'scripts/preset-facades.json'), 'utf8'));
  if (!Array.isArray(list) || list.length === 0) {
    console.error('preset-facades.json is empty: nothing would be checked');
    process.exit(1);
  }
  const facades = list.map((e) => resolve(UI, e.facade));
  const missing = facades.filter((f) => !existsSync(f));
  if (missing.length) {
    console.error('facade file missing:\n' + missing.map((m) => relative(UI, m)).join('\n'));
    process.exit(1);
  }
  const { findings, checked } = analyse(facades);
  if (checked === 0) {
    console.error('no component/primitive imports found in any facade: the scan is broken, not the tree clean');
    process.exit(1);
  }
  if (findings.length) {
    console.error(`lint-preset-parts: ${findings.length} finding(s)\n` + findings.join('\n'));
    process.exit(1);
  }
  console.log(`lint-preset-parts OK: ${facades.length} facades, ${checked} imports checked`);
}

main();
