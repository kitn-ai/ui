// The SHIPPED API surface, read at run time.
//
// Nothing in this file is a hard-coded list of exports, elements, props or
// events. Every name comes from either the built `.d.ts` reached through the
// package's own `exports` map, or from `src/web-components/web-component-meta.json`. That is
// deliberate: the surface moves under this harness (a sibling change added ~330
// root exports mid-flight), and a baked-in list would have turned every new
// export into a phantom "docs are wrong" finding.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

/** Subpaths whose types we can enumerate. `./web-components/*` is a wildcard and is
 *  handled separately; the css/json ones have no types. */
const isTypedEntry = (target) =>
  target && typeof target === 'object' && typeof target.types === 'string' && target.types.endsWith('.d.ts');

const entrySpecifier = (sub) => (sub === '.' ? '@kitn.ai/ui' : `@kitn.ai/ui${sub.slice(1)}`);

/** Where the kai-* element catalog lives, read through the package's own exports map. */
const metaFile = (uiRoot, pkg) =>
  resolve(uiRoot, pkg.exports?.['./web-component-meta.json'] ?? './src/web-components/web-component-meta.json');

/**
 * Every typed entry point the package's `exports` map DECLARES, and where its built
 * types must be.
 *
 * THIS LIST IS THE EXPECTATION, and it is the reason this function exists rather than a
 * count. `exports` is the contract a consumer resolves against, so an entry declared
 * there whose `.d.ts` is absent means the BUILD has not finished writing — not that the
 * package got smaller. Reading the leftover files and reporting a count against them is
 * what produced three different advisory totals for one tree in four minutes.
 */
export function declaredTypedEntries(uiRoot, pkg) {
  const out = [];
  for (const [sub, target] of Object.entries(pkg.exports ?? {})) {
    if (sub.includes('*')) continue;
    if (!isTypedEntry(target)) continue;
    out.push({ subpath: sub, specifier: entrySpecifier(sub), types: target.types, dts: resolve(uiRoot, target.types) });
  }
  return out;
}

/** Typed WILDCARD entries — `./web-components/*` — as `<dir> -> pattern`,
 *  since a pattern has no single file to check. */
function declaredTypedWildcards(uiRoot, pkg) {
  const out = [];
  for (const [sub, target] of Object.entries(pkg.exports ?? {})) {
    if (!sub.includes('*') || !isTypedEntry(target)) continue;
    out.push({ subpath: sub, pattern: target.types, dir: resolve(uiRoot, dirname(target.types)) });
  }
  return out;
}

/**
 * What a COMPLETE build must provide, and every way this one falls short of it.
 *
 * Returns `[]` on a complete surface. Each expectation is derived from a source of
 * truth the package already owns — never a hand-typed number:
 *
 *   · the `exports` map declares which typed entry points exist, so each must have a
 *     `.d.ts` on disk and that file must export at least one name;
 *   · a typed WILDCARD entry must match at least one file, or every per-element
 *     import resolves to nothing and the harness reports those imports as stale;
 *   · `web-component-meta.json` and the shipped `dist/web-components.d.ts` describe the
 *     same elements, generated from one source, so each tag meta declares needs its
 *     `Kai<Name>Props` interface in the built types.
 *
 * @param {string} uiRoot absolute path to packages/ui
 * @param {object} pkg    its parsed package.json
 * @param {Map<string, Map<string, object>>} entries specifier -> exported names, as
 *        built from the files that DO exist (missing and empty ones cannot be in it)
 */
export function surfaceIncompleteness(uiRoot, pkg, entries) {
  const problems = [];
  const declared = declaredTypedEntries(uiRoot, pkg);
  for (const e of declared) {
    if (!existsSync(e.dts)) {
      problems.push(
        `${e.specifier} — \`exports["${e.subpath}"].types\` names \`${e.types}\`, and ${e.dts} does not exist`,
      );
      continue;
    }
    if (!(entries?.get(e.specifier)?.size > 0)) {
      problems.push(`${e.specifier} — ${e.dts} exists but declares NO exports (an entry point nothing imports)`);
    }
  }

  for (const w of declaredTypedWildcards(uiRoot, pkg)) {
    const matched = existsSync(w.dir) ? readdirSync(w.dir).filter((f) => f.endsWith('.d.ts')).length : 0;
    if (!matched) {
      problems.push(`${entrySpecifier(w.subpath)} — \`exports["${w.subpath}"]\` declares the pattern \`${w.pattern}\` (via ${w.dir}), which matches no file`);
    }
  }

  // The element catalog against the built types. Both are generated from the kit's own
  // source, so a tag in one without an interface in the other is a build that has not
  // finished — not a package with fewer elements.
  const metaPath = metaFile(uiRoot, pkg);
  if (!existsSync(metaPath)) {
    problems.push(`the kai-* element catalog is missing: ${metaPath} does not exist`);
  } else {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    const wcTypes = declared.find((e) => e.subpath === './web-components');
    if (!wcTypes || !existsSync(wcTypes.dts)) {
      problems.push(`cannot cross-check the element catalog: ${wcTypes?.dts ?? './dist/web-components.d.ts'} does not exist`);
    } else {
      const text = readFileSync(wcTypes.dts, 'utf8');
      const interfaces = new Set([...text.matchAll(/interface\s+([A-Za-z0-9_$]+)/g)].map((m) => m[1]));
      const withoutProps = meta.filter((el) => !interfaces.has(`${el.className}Props`));
      if (withoutProps.length) {
        const first = withoutProps
          .slice(0, 5)
          .map((el) => `${el.tag} (expected \`${el.className}Props\`)`)
          .join(', ');
        problems.push(
          `${withoutProps.length} of ${meta.length} elements in ${metaPath} have no \`Kai<Name>Props\` interface in ${wcTypes.dts} — ${first}`,
        );
      }
    }
  }

  return problems;
}

/** The refusal, so the gate and the tests quote the same wording. */
export function incompleteSurfaceMessage(uiRoot, pkg, problems) {
  const declared = declaredTypedEntries(uiRoot, pkg);
  const present = declared.filter((e) => existsSync(e.dts)).length;
  return [
    `the shipped API surface looks INCOMPLETE — refusing to report findings against it.`,
    `A count taken against a half-written build is not evidence: one tree reported 70 and 85 advisories four minutes apart, and the only tell was \`9 entry points\` instead of \`14\` on line two.`,
    ``,
    `${declared.length} typed entry points are declared in ${join(uiRoot, 'package.json')}, ${present} of them are on disk.`,
    ...problems.map((p) => `  · ${p}`),
    ``,
    `Everything above is derived from the package's own \`exports\` map and \`web-component-meta.json\`, so none of it is a hand-typed number.`,
    `Finish the build (\`pnpm exec nx build ui\`) and run this again; a smaller count is not a smaller package.`,
  ].join('\n');
}

/**
 * @param {string} uiRoot absolute path to packages/ui
 */
export function loadSurface(uiRoot) {
  const pkg = JSON.parse(readFileSync(join(uiRoot, 'package.json'), 'utf8'));

  // ── 1. Exported names per entry point, through the REAL exports map ────────
  // Declared vs present is tracked apart on purpose: a declared entry whose file is
  // missing is a half-written build, and the guard at the end of this function refuses
  // to hand such a surface to any checker. Skipping it silently is what let one tree
  // report three different advisory totals.
  const entryFiles = [];
  for (const e of declaredTypedEntries(uiRoot, pkg)) {
    if (!existsSync(e.dts)) continue;
    entryFiles.push({ specifier: e.specifier, dts: e.dts });
  }

  const program = ts.createProgram(
    entryFiles.map((e) => e.dts),
    {
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: false,
    },
  );
  const checker = program.getTypeChecker();

  /** specifier -> Map<name, {value:boolean, type:boolean}> */
  const entries = new Map();
  /** name -> specifier[] */
  const byName = new Map();

  for (const { specifier, dts } of entryFiles) {
    const sf = program.getSourceFile(dts);
    const moduleSymbol = sf && checker.getSymbolAtLocation(sf);
    const names = new Map();
    if (moduleSymbol) {
      for (const sym of checker.getExportsOfModule(moduleSymbol)) {
        let s = sym;
        if (s.flags & ts.SymbolFlags.Alias) {
          try {
            s = checker.getAliasedSymbol(s);
          } catch {
            /* keep the alias */
          }
        }
        names.set(sym.getName(), {
          value: Boolean(s.flags & ts.SymbolFlags.Value),
          type: Boolean(s.flags & ts.SymbolFlags.Type),
        });
      }
    }
    entries.set(specifier, names);
    for (const n of names.keys()) {
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n).push(specifier);
    }
  }

  // ── 1b. Refuse to hand out a surface that looks incomplete ───────────────
  // BEFORE anything is parsed off it and before any checker has seen it. Every number
  // this harness prints is computed from what is returned below, so a half-written
  // build here is a wrong answer that looks like evidence — the failure mode the MCP
  // manifest tests already answer by failing loudly and naming the artifact they wanted.
  const incomplete = surfaceIncompleteness(uiRoot, pkg, entries);
  if (incomplete.length) throw new Error(incompleteSurfaceMessage(uiRoot, pkg, incomplete));

  // ── 2. The kai-* element catalog ───────────────────────────────────────────
  const metaPath = metaFile(uiRoot, pkg);
  const elements = JSON.parse(readFileSync(metaPath, 'utf8'));

  // web-component-meta.json records the props each element DECLARES, but `define.tsx`
  // injects a universal `theme` onto every element that never reaches the JSON.
  // The shipped `Kai<Name>ElementProps` interfaces do include it, so the two are
  // unioned: names come from the .d.ts, the scalar/non-scalar flag (which only
  // web-component-meta carries) comes from the JSON. Deriving this rather than
  // hard-coding `theme` means the next universal prop is handled for free —
  // without it, every `theme="dark"` in the docs was a false positive.
  const webComponentsDts = entryFiles.find((e) => e.specifier === '@kitn.ai/ui/web-components');
  const dtsMembers = new Map(); // interface name -> Set<member>
  if (webComponentsDts) {
    const sf = program.getSourceFile(webComponentsDts.dts);
    if (sf) {
      for (const stmt of sf.statements) {
        if (!ts.isInterfaceDeclaration(stmt)) continue;
        dtsMembers.set(
          stmt.name.text,
          new Set(stmt.members.map((m) => m.name && ts.isIdentifier(m.name) ? m.name.text : m.name?.getText?.(sf)).filter(Boolean).map((n) => n.replace(/^['"]|['"]$/g, ''))),
        );
      }
    }
  }

  const byTag = new Map();
  const eventNames = new Set();
  for (const el of elements) {
    const props = new Map();
    for (const p of el.props ?? []) {
      props.set(p.name, p);
      props.set(camelToKebab(p.name), p);
    }
    // Props the shipped interface has that the JSON does not: universal ones.
    // `scalar: undefined` marks them as "exists, scalarity unknown", so the
    // attribute-stringification check skips them rather than guessing.
    for (const name of dtsMembers.get(`${el.className}Props`) ?? []) {
      if (props.has(name)) continue;
      const injected = { name, universal: true, scalar: undefined };
      props.set(name, injected);
      props.set(camelToKebab(name), injected);
    }
    byTag.set(el.tag, {
      ...el,
      propIndex: props,
      propNames: new Set([...props.keys()]),
      // Raw CustomEvent names (`kai-message-action`) — what addEventListener and
      // Solid's `on:` take.
      eventNames: new Set((el.events ?? []).map((e) => e.name)),
      // The React/Vue handler-prop spelling of the same events
      // (`onKaiMessageAction`), which the shipped `…Events` interface declares.
      // Kept apart so the event catalog is not double-counted.
      handlerNames: new Set(dtsMembers.get(`${el.className}Events`) ?? []),
      slotNames: new Set((el.slots ?? []).map((s) => s.name)),
      partNames: new Set((el.parts ?? []).map((s) => s.name)),
      methodNames: new Set((el.methods ?? []).map((m) => (typeof m === 'string' ? m : m.name))),
    });
    for (const e of el.events ?? []) eventNames.add(e.name);
  }

  // ── 2b. Declarative light-DOM children: markup a consumer WRITES that no
  //         `defineWebComponent` registers ─────────────────────────────────────
  // `<kai-step>` inside `<kai-chain-of-thought>`, `<kai-model>` inside
  // `<kai-model-switcher>`, `<kai-conversation>` inside `<kai-conversations>`.
  // The owning element reads them out of the light DOM; they have no
  // `Kai<Name>Element`, no `HTMLElementTagNameMap` row and nothing to upgrade, so
  // they stay ABSENT from the element catalog — which is what `loadSurface`
  // returns them under a marker for, not a registration.
  //
  // The declaration was never missing. `gen-web-component-api.mjs` reads each
  // owner's `querySelectorAll('kai-…')` parse callback and emits the attributes it
  // reads under that owner's `declarativeChildren` in web-component-meta.json, and
  // the docs site renders it (DeclarativeChildrenTable). What was missing is a
  // CONSUMER of it here, so `<kai-step whatever="x">` was checked against NOTHING
  // and every gate passed — and the tag was reported as a metadata hole instead.
  //
  // Merged into `byTag` (marked `dataCarrier`) rather than kept in a second map:
  // every reader in this harness already asks `byTag`, so this is what makes
  // `checkMarkup` validate their attribute names, what stops `checkProse`
  // advising on a tag the kit really declares, and what keeps them out of the
  // registered-element counts everywhere else (nothing else reads this map).
  const dataCarrierParents = new Map(); // tag -> { parents, attributes, description }
  for (const el of elements) {
    for (const child of el.declarativeChildren ?? []) {
      // A child that is ALSO a registered element — `<kai-source>` inside
      // `<kai-sources>` — is already in `byTag` with its real Props interface.
      // Never overwrite that with the attribute-name-only view.
      if (byTag.has(child.tag)) continue;
      const entry = dataCarrierParents.get(child.tag) ?? { parents: [], attributes: new Set(), description: '' };
      entry.parents.push(el.tag);
      for (const name of child.attributes ?? []) entry.attributes.add(name);
      if (!entry.description) entry.description = child.description ?? '';
      dataCarrierParents.set(child.tag, entry);
    }
  }
  for (const [tag, carrier] of dataCarrierParents) {
    const props = new Map();
    for (const name of carrier.attributes) {
      // `scalar: true`: each is read with `getAttribute`, so an attribute string is
      // the whole channel and the nonscalar-as-attribute check has nothing to say.
      const prop = { name, scalar: true };
      props.set(name, prop);
      props.set(camelToKebab(name), prop);
    }
    byTag.set(tag, {
      tag,
      className: null,
      displayName: null,
      dataCarrier: true,
      declarativeChildOf: carrier.parents,
      description: carrier.description,
      // Empty rather than absent: readers walk `byTag.values()` and touch `.props`
      // (the self-test picks its non-scalar probe that way), and an entry missing
      // the key crashes them. A data carrier declares no Props interface, so the
      // truthful value is the empty list.
      props: [],
      propIndex: props,
      propNames: new Set(props.keys()),
      eventNames: new Set(),
      handlerNames: new Set(),
      slotNames: new Set(),
      partNames: new Set(),
      methodNames: new Set(),
    });
  }
  // Not every kai-* event is declared on an element. The card protocol routes a
  // document-level `kai-card` event, published as `CARD_EVENT_NAME = "kai-card"`.
  // Any exported const whose type is a string literal starting with `kai-` is an
  // event name — derived from the literal types in the shipped .d.ts, so a new
  // one is picked up without editing this file.
  for (const { specifier, dts } of entryFiles) {
    const sf = program.getSourceFile(dts);
    const moduleSymbol = sf && checker.getSymbolAtLocation(sf);
    if (!moduleSymbol) continue;
    for (const sym of checker.getExportsOfModule(moduleSymbol)) {
      try {
        const t = checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration ?? sf);
        if (t.isStringLiteral && t.isStringLiteral() && t.value.startsWith('kai-')) eventNames.add(t.value);
      } catch {
        /* not a value export */
      }
    }
    void specifier;
  }

  // ── 3. Which root exports are renderable COMPONENTS ────────────────────────
  // Used only for reverse coverage. A component is a PascalCase value export
  // that also ships a `<Name>Props` type — that pairing is the convention the
  // kit follows, and it is derived here rather than listed.
  const root = entries.get('@kitn.ai/ui') ?? new Map();
  const components = new Set();
  for (const [name, kind] of root) {
    if (!/^[A-Z]/.test(name) || !kind.value) continue;
    if (root.has(`${name}Props`)) components.add(name);
  }

  // ── 4. kai-* tokens the kit KNOWS but web-component-meta does not declare ────────
  // Two real API surfaces are missing from web-component-meta.json:
  //   · declarative light-DOM children — `<kai-step>` inside
  //     <kai-chain-of-thought>, `<kai-model>` inside <kai-model-switcher>. Both
  //     are documented routes with their own tests; neither is a registered
  //     custom element, so neither appears in the catalog.
  //   · bubbling events dispatched with `composed: true` from inside an element,
  //     such as `kai-maximize-intent`, which no element DECLARES.
  // Scanning the kit's own source for quoted `kai-…` literals separates "the
  // docs invented this" from "the kit has it but the metadata omits it". The
  // second is a real finding, but about web-component-meta.json, not about the docs.
  const knownTokens = new Set();
  const srcDir = join(uiRoot, 'src');
  if (existsSync(srcDir)) {
    (function walk(dir) {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== 'node_modules') walk(p);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        if (/\.(stories|test|spec)\./.test(e.name)) continue;
        const text = readFileSync(p, 'utf8');
        for (const m of text.matchAll(/['"`](kai-[a-z0-9-]+)['"`]/g)) knownTokens.add(m[1]);
        for (const m of text.matchAll(/<(kai-[a-z0-9-]+)[\s/>]/g)) knownTokens.add(m[1]);
      }
    })(srcDir);
  }

  // ── 5. Standard-library globals, so prose naming a DOM/JS type is quiet ────
  // `MediaRecorder`, `SpeechSynthesisVoice`, `AbortController` are not kit API
  // and never will be. Reading them out of TypeScript's own lib files resolves
  // that mechanically instead of by an allowlist that rots.
  const globalNames = new Set();
  const libDir = join(dirname(require.resolve('typescript/package.json')), 'lib');
  if (existsSync(libDir)) {
    for (const f of readdirSync(libDir)) {
      if (!/^lib\..*\.d\.ts$/.test(f)) continue;
      const text = readFileSync(join(libDir, f), 'utf8');
      for (const m of text.matchAll(
        /^(?:interface|type|declare (?:var|let|const|function|namespace|class)|declare abstract class)\s+([A-Za-z_$][\w$]*)/gm,
      )) {
        globalNames.add(m[1]);
      }
    }
  }

  return {
    version: pkg.version,
    entries,
    byName,
    /** Every global TypeScript's standard libs declare. */
    globalNames,
    /** Every `kai-…` literal the kit's own source mentions. A superset of the
     *  registered tags and declared events. */
    knownTokens,
    specifiers: [...entries.keys()],
    elements,
    byTag,
    tags: new Set(byTag.keys()),
    eventNames,
    components,
    /** Does this bare specifier belong to the kit? */
    isKitSpecifier: (spec) => spec === '@kitn.ai/ui' || spec.startsWith('@kitn.ai/ui/'),
    /** Is `spec` an entry point the package actually declares? */
    resolvesEntry(spec) {
      if (entries.has(spec)) return true;
      // ./web-components/* wildcard — a per-element module.
      const m = /^@kitn\.ai\/ui\/web-components\/(.+)$/.exec(spec);
      if (m) return existsSync(join(uiRoot, 'dist/web-components', `${m[1]}.d.ts`));
      // Asset subpaths declared in the exports map (theme.css, web-component-meta.json…).
      const sub = spec === '@kitn.ai/ui' ? '.' : `.${spec.slice('@kitn.ai/ui'.length)}`;
      return Object.prototype.hasOwnProperty.call(pkg.exports ?? {}, sub);
    },
  };
}

export const camelToKebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
export const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
