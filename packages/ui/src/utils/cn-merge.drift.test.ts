/**
 * THE DRIFT GUARD for `./cn-merge` — the condition for that module existing at all.
 *
 * `cn-merge` is a hand-rolled class table standing in for `tailwind-merge`, which is ~27 KB
 * raw of every consumer's bundle for a vocabulary this kit uses 533 classes of. The trade is
 * only worth making while the two AGREE, and the failure mode of a hand-rolled table is
 * silent: a class whose family the table models wrongly is dropped (or kept) with no error
 * anywhere, on inputs nobody wrote down. So `tailwind-merge` stays a devDependency as the
 * ORACLE, and this file diffs the merger against it on every run — naming the input and BOTH
 * outputs on any divergence.
 *
 * THE CORPORA, and why each one is here. They are derived where the derivation adds coverage
 * and prunes where it only adds runtime:
 *
 *  1. KIT CLASSES (AST, never a line-grep — the kit imports `cn` under BOTH quote styles, and a
 *     quote-sensitive scan miscounted call sites in a prior lane). Every `cn` call site is
 *     resolved through its IMPORT, so a mention of `cn(` in prose is not a call site, and every
 *     string literal anywhere in the arguments is taken — an OVER-approximation, which can only
 *     invent an input, never hide one. Then every ordered pair of the tokens is tested.
 *  2. REAL CALL SITES: the arguments of each site joined the way `clsx` would join them.
 *  3. TAILWIND-MERGE'S OWN CLASSES: `getDefaultConfig()` composed into class names (`{ rounded:
 *     ['t'] }` -> `rounded-t`), grouped per group. Pairs inside one group and pairs joined by a
 *     `conflictingClassGroups` edge are the only inputs where `tailwind-merge` has an opinion,
 *     so those are enumerated — plus every `T T` dedupe.
 *  4. SAME-KEY PAIRS: every pair of classes the merger itself puts in ONE conflict key. This is
 *     the corpus that catches the merger INVENTING a conflict `tailwind-merge` does not have
 *     (`object-cover` vs `object-top`, `blur-sm` vs `brightness-50`) — a pair no config-derived
 *     corpus can reach, because there is no edge of `tailwind-merge`'s to derive it from.
 *  5. NEIGHBOURS: pairs with a KIT class on one side and a `tailwind-merge` class in the same
 *     group, or on either end of one of its edges. Corpus 4 covers the pairs where the merger
 *     has an opinion about a CONSUMER class; this one covers the pairs where it has one about a
 *     kit class.
 *  6. RANDOM 3-5 TUPLES over the union of (1) and (3), and MODIFIER CROSSES (`hover:p-2`,
 *     `sm:hover:p-2`, `[&>svg]:size-4`, …) — ordered sequences are where a chain of `removes`
 *     edges shows up in a way pairs cannot.
 *  7. VALIDATOR/ARBITRARY FORMS: one representative per `tailwind-merge` group taken from THAT
 *     GROUP'S OWN validators (read off the shipped config, so a new validator or group moves
 *     the corpus on its own), paired inside each group and across every
 *     `conflictingClassGroups` edge, plus the arbitrary forms a consumer actually writes. This
 *     is the corpus that closes this guard's original blind spot: a family named by a VALIDATOR
 *     (`stroke-w`, `ring-w`, `shadow`, `inset-ring-w`, `text-shadow`, …) holds no literal class
 *     name, so corpora 1-6 could not contain it and the kit never emits it. A wrong value split
 *     there — `stroke-[3px]` filed as a colour, `shadow-[3px]` claimed as a shadow — is now a
 *     failing input instead of a silent drop. See `validatorCorpus()`.
 *
 * WHAT IS NOT IN HERE, said out loud because a guard that overstates itself is worse than a
 * narrow one. A pair of two classes in a family the merger does not model AT ALL
 * (`break-after-auto break-after-avoid`, `mask-top mask-top`, `float-none float-right`) is out
 * of scope: the merger keeps both and `tailwind-merge` picks the later one. That is the
 * pass-through default the module documents, it can only be reached by a class from a family the
 * kit never emits, and closing it would mean re-implementing `tailwind-merge`'s entire
 * vocabulary — the thing this module exists not to do. Corpus 7 covers the other direction: every
 * family the table DOES claim is exercised in its arbitrary/validator form, so a misclassification
 * inside a claimed family fails loudly rather than dropping a class in silence.
 *
 * THE ORACLE IS A FROZEN COPY, deliberately. It is the exact `extendTailwindMerge` call that
 * stood in `src/utils/cn.ts` before this module replaced it, spelled out here rather than
 * derived from `CLASS_TABLE`: a derived oracle would move WITH the table and this file would
 * prove nothing. The six font sizes are the kit's `@theme` tokens in `packages/ui/theme.css`.
 *
 * THE GUARD CAN FAIL. The last test drives a deliberately wrong table and asserts the harness
 * reports the divergence it creates, so a parity suite that had stopped comparing anything
 * cannot pass quietly.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { extendTailwindMerge, getDefaultConfig } from 'tailwind-merge';
import { CLASS_TABLE, REMOVES, classKeyOf, createClassMerger, mergeClassList, type ClassMerger, type ClassMergeTable } from './cn-merge';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ─── the oracle ─────────────────────────────────────────────────────────────────────────────
const oracle = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['micro', 'caption', 'meta', 'compact', 'body', 'title'] }],
      // Kit-added rungs must be taught to the oracle: tailwind-merge does not know
      // `pill`, so it reports no conflict with `rounded-lg` while the kit's merger
      // keys both into `radius` — otherwise this reads as a merger bug.
      rounded: [{ rounded: ['pill'] }],
    },
  },
});

// ─── corpus 1 + 2: the kit's own class surface, by AST ──────────────────────────────────────
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(path);
  }
  return out;
}

/**
 * Every string literal inside the arguments of a `cn(...)` call, as class tokens, plus each
 * call's arguments joined the way `clsx` joins them.
 *
 * Call sites are found by the IMPORT, not by the identifier spelling alone: a file may only
 * contribute if it imports something named `cn` from a module ending in `/cn`, which is what
 * keeps a prose mention (`cn.ts`'s own comment block, a doc string) out of the corpus.
 */
function kitCorpus() {
  const tokens = new Set<string>();
  const callSites: string[] = [];
  let filesWithCalls = 0;
  let calls = 0;

  for (const file of sourceFiles(SRC)) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const cnNames = new Set<string>();
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      const specifier = statement.moduleSpecifier;
      if (!ts.isStringLiteral(specifier) || !/(^|\/)cn$/.test(specifier.text)) continue;
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) cnNames.add(element.name.text);
    }
    if (cnNames.size === 0) continue;

    let fileCalls = 0;
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && cnNames.has(node.expression.text)) {
        calls++;
        fileCalls++;
        const literals: string[] = [];
        const collect = (child: ts.Node) => {
          if (ts.isStringLiteralLike(child)) literals.push(child.text);
          child.forEachChild(collect);
        };
        for (const argument of node.arguments) collect(argument);
        const callTokens = literals.flatMap((literal) => literal.split(/\s+/)).filter(Boolean);
        for (const token of callTokens) tokens.add(token);
        if (callTokens.length > 0) callSites.push(callTokens.join(' '));
      }
      node.forEachChild(visit);
    };
    visit(source);
    if (fileCalls > 0) filesWithCalls++;
  }

  return { tokens: [...tokens].sort(), callSites, filesWithCalls, calls };
}

// ─── corpus 3: tailwind-merge's own vocabulary ──────────────────────────────────────────────
/**
 * `getDefaultConfig()` as class names plus the graph over them.
 *
 * A group like `{ rounded: ['t', 'tl'] }` names `rounded-t` / `rounded-tl`, so literals are
 * COMPOSED down the nesting (`''` means the prefix itself, which is how `ring` and `resize`
 * are spelled). Validators are functions and name nothing, so they are skipped — which is
 * exactly why 354 of the 379 groups contribute no class here.
 */
function tailwindCorpus() {
  const classNames = new Set<string>();
  const compose = (node: unknown, prefix: string, sink: Set<string>) => {
    if (typeof node === 'string') {
      sink.add(node === '' ? prefix : prefix ? `${prefix}-${node}` : node);
      return;
    }
    if (Array.isArray(node)) {
      for (const entry of node) compose(entry, prefix, sink);
      return;
    }
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) compose(value, prefix ? `${prefix}-${key}` : key, sink);
    }
  };

  const config = getDefaultConfig();
  const all = new Set<string>();
  for (const group of Object.values(config.classGroups)) compose(group, '', all);
  const known = new Set(
    [...all].filter((name) => name && !/[[\](){}]/.test(name) && /^[@a-z]/.test(name)),
  );

  const groupMembers = new Map<string, string[]>();
  const groupsOf = new Map<string, string[]>();
  for (const [groupName, group] of Object.entries(config.classGroups)) {
    const members = new Set<string>();
    compose(group, '', members);
    const names = [...members].filter((name) => known.has(name));
    groupMembers.set(groupName, names);
    for (const name of names) groupsOf.set(name, [...(groupsOf.get(name) ?? []), groupName]);
  }

  // Widened to a string-keyed record on purpose: the config's own type is keyed by its literal
  // group names, so indexing it by a group read out of the config is an implicit `any`.
  const conflicts: Record<string, readonly string[]> = config.conflictingClassGroups ?? {};
  const names = [...known].sort();
  /** One side of the pair must be a class the merger claims, or neither merger has an opinion to compare. */
  const modelled = (name: string) => classKeyOf(name) !== null;

  const sameGroup: string[] = [];
  for (const members of groupMembers.values()) {
    for (const a of members) for (const b of members) if (modelled(a) || modelled(b)) sameGroup.push(`${a} ${b}`);
  }

  const edges: string[] = [];
  for (const [groupName, targets] of Object.entries(conflicts)) {
    for (const target of targets) {
      for (const a of groupMembers.get(groupName) ?? []) {
        for (const b of groupMembers.get(target) ?? []) {
          if (modelled(a) || modelled(b)) edges.push(`${a} ${b}`, `${b} ${a}`);
        }
      }
    }
  }

  const dedupe = names.filter(modelled).map((name) => `${name} ${name}`);

  return { names, groupsOf, groupMembers, conflicts, sameGroup, edges, dedupe };
}

// ─── corpora 4 + 5: derived from the merger's own key space ─────────────────────────────────
const kit = kitCorpus();
const tw = tailwindCorpus();
const union = [...new Set([...kit.tokens, ...tw.names.filter((name) => classKeyOf(name) !== null)])];

/** Every ordered pair inside one of the merger's conflict keys. */
function sameKeyPairs(): string[] {
  const byKey = new Map<string, string[]>();
  for (const name of union) {
    const key = classKeyOf(name);
    if (key === null) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), name]);
  }
  const pairs: string[] = [];
  for (const members of byKey.values()) for (const a of members) for (const b of members) pairs.push(`${a} ${b}`);
  return pairs;
}

/** Kit class x tailwind-merge class in the same group, or across one of its edges. */
function neighbourPairs(): string[] {
  const pairs: string[] = [];
  for (const kitClass of kit.tokens) {
    const groups = tw.groupsOf.get(kitClass);
    if (!groups) continue;
    for (const group of groups) {
      for (const other of tw.groupMembers.get(group) ?? []) pairs.push(`${kitClass} ${other}`, `${other} ${kitClass}`);
      for (const target of tw.conflicts[group] ?? []) {
        for (const other of tw.groupMembers.get(target) ?? []) pairs.push(`${kitClass} ${other}`, `${other} ${kitClass}`);
      }
      for (const [otherGroup, targets] of Object.entries(tw.conflicts)) {
        if (!targets.includes(group)) continue;
        for (const other of tw.groupMembers.get(otherGroup) ?? []) pairs.push(`${kitClass} ${other}`, `${other} ${kitClass}`);
      }
    }
  }
  return pairs;
}

/** Seeded, so a failure is reproducible from the seed alone. */
function randomTuples(count: number): string[] {
  let seed = 0x2f6e2b1;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const tuples: string[] = [];
  for (let i = 0; i < count; i++) {
    const length = 3 + Math.floor(random() * 3);
    const parts: string[] = [];
    for (let j = 0; j < length; j++) parts.push(union[Math.floor(random() * union.length)]);
    tuples.push(parts.join(' '));
  }
  return tuples;
}

const MODIFIERS = ['hover:', 'focus:', 'sm:', 'sm:hover:', 'dark:', '[&>svg]:', 'data-[closed]:'];

// ─── corpus 7: the VALIDATOR/ARBITRARY form of every group tailwind-merge names ─────────────
/**
 * THE CORPUS THAT CLOSES THE BLIND SPOT THE FIRST VERSION HAD.
 *
 * Corpora 1-6 are made of class NAMES. tailwind-merge's 379 groups are mostly
 * validator- or prefix-driven (`{ stroke: [isNumber, isArbitraryLength, ...] }` names no
 * class at all), so a family modelled with the wrong value split — a `stroke-[3px]` filed
 * as a colour, a `shadow-[3px]` claimed as a shadow — was invisible: the names corpus
 * never contained it and the kit never emits it. This corpus walks the config, picks one
 * representative per group from THAT GROUP'S OWN validators, and pairs inside each group
 * and across every `conflictingClassGroups` edge, so a misclassified family is always
 * exercised in the arbitrary form a consumer actually writes.
 *
 * `VALUE_FOR_VALIDATOR` is a sample per validator, not a restatement of its semantics:
 * the validator list is read off the shipped config, so a group that gains a validator — or
 * a new group — moves this corpus on its own.
 */
const VALUE_FOR_VALIDATOR: Record<string, string> = {
  isArbitraryLength: '[3px]',
  isArbitrarySize: '[size:200px]',
  isArbitraryPosition: '[position:10px_20px]',
  isArbitraryImage: '[url(/a.png)]',
  isArbitraryWeight: '[550]',
  isArbitraryNumber: '[3]',
  isArbitraryFamilyName: '[family-name:var(--x)]',
  isArbitraryShadow: '[shadow:0_0_1px_red]',
  isNumber: '2',
  isInteger: '2',
  isFraction: '1/2',
  isPercent: '50%',
  isNamedContainerQuery: '@lg',
  isArbitraryVariable: '(var(--x))',
  isArbitraryValue: '[3px]',
};

/** The value to try when a group has no samplable validator but its name says what it holds. */
const valueByName = (group: string): string =>
  /color|fill|accent|caret|placeholder/.test(group)
    ? '[#f00]'
    : /shadow/.test(group)
      ? '[shadow:0_0_1px_red]'
      : /image|mask/.test(group)
        ? '[url(/a.png)]'
        : /position/.test(group)
          ? '[position:10px_20px]'
          : /family/.test(group)
            ? '[family-name:var(--x)]'
            : /weight/.test(group)
              ? '[550]'
              : '[3px]';

/**
 * One representative class per group from its own validators, plus its literal names.
 * Composed exactly like the config: object keys stack the prefix, a string value ends the
 * class, a validator supplies the value.
 */
function validatorReps() {
  const config = getDefaultConfig();
  const reps = new Map<string, string[]>();
  for (const [group, def] of Object.entries(config.classGroups)) {
    const literals = new Set<string>();
    const validators = new Set<string>();
    let prefix: string | null = null;
    const walk = (node: unknown, p: string) => {
      if (typeof node === 'string') {
        literals.add(node === '' ? p : p ? `${p}-${node}` : node);
        return;
      }
      if (typeof node === 'function') {
        validators.add(node.name);
        return;
      }
      if (Array.isArray(node)) {
        for (const entry of node) walk(entry, p);
        return;
      }
      if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
          prefix = p ? `${p}-${key}` : key;
          walk(value, prefix);
        }
      }
    };
    walk(def, '');
    const members = new Set([...literals].filter((c) => c && !c.endsWith('-') && !c.includes('--')));
    for (const name of validators) {
      const value = VALUE_FOR_VALIDATOR[name];
      if (value !== undefined && prefix) members.add(`${prefix}-${value}`);
    }
    if (members.size === 0 && prefix) members.add(`${prefix}-${valueByName(group)}`);
    reps.set(group, [...members]);
  }
  return { reps, config };
}

/**
 * Consumer-style forms for every family the table claims to model, in the arbitrary and
 * validator shapes a `class` prop actually carries. The group walk above mints a synthetic
 * sample per validator; this list is the other half — the shapes a caller writes.
 */
const CONSUMER_FORMS = [
  'stroke-2', 'stroke-[3]', 'stroke-[3px]', 'stroke-[var(--x)]', 'stroke-red-500', 'stroke-[#f00]', 'stroke-none',
  'outline-2', 'outline-[3px]', 'outline-[var(--x)]', 'outline-red-500', 'outline-[#f00]', 'outline',
  'ring-2', 'ring-[3px]', 'ring-[var(--x)]', 'ring-red-500', 'ring-[#f00]', 'ring',
  'ring-offset-2', 'ring-offset-[3px]', 'ring-offset-[var(--x)]', 'ring-offset-red-500', 'ring-offset-[#f00]',
  'inset-ring-2', 'inset-ring-[3px]', 'inset-ring-[var(--x)]', 'inset-ring-red-500', 'inset-ring',
  'shadow', 'shadow-lg', 'shadow-inner', 'shadow-red-500', 'shadow-[#f00]', 'shadow-[var(--x)]', 'shadow-[3px]',
  'shadow-[0_0_1px_red]', 'shadow-[shadow:0_0_1px_red]', 'shadow-none',
  'inset-shadow-none', 'inset-shadow-red-500', 'inset-shadow-[shadow:0_0_1px_red]', 'inset-shadow-[3px]',
  'text-shadow-none', 'text-shadow-[shadow:0_0_1px_red]', 'text-shadow-[3px]', 'text-shadow-red-500',
  'drop-shadow', 'drop-shadow-none', 'drop-shadow-[shadow:0_0_1px_red]', 'drop-shadow-[3px]',
  'border-2', 'border-[3px]', 'border-[calc(1px+2px)]', 'border-[0]', 'border-[#f00]', 'border-[var(--x)]',
  'border-red-500', 'border-bs-2', 'border-be-2', 'border-t-2', 'border-t-red-500', 'border-t-[#f00]',
  'border-spacing-[3px]', 'border-spacing-x-[3px]',
  'text-base', 'text-[11px]', 'text-[length:12px]', 'text-[550]', 'text-[#fff]', 'text-[var(--x)]',
  'text-transparent', 'text-body', 'leading-none', 'leading-[3px]', 'font-bold', 'font-[550]',
  'font-[family-name:var(--x)]', 'font-sans',
  'line-clamp-2', 'line-clamp-[3]', 'line-clamp-[3px]', 'line-clamp-none', 'block',
  'decoration-2', 'decoration-[3px]', 'decoration-[#f00]', 'decoration-[550]',
  'scroll-mt-4', 'scroll-m-[3px]', 'scroll-mx-3', 'scroll-ml-4', 'scroll-pt-4', 'scroll-p-[3px]', 'scroll-px-3',
  'touch-pan-x', 'touch-[pan-x]', 'overscroll-auto', 'overscroll-x-auto', 'overscroll-[contain]',
  'p-2', 'p-[13px]', 'pt-3', 'size-4', 'h-2', 'object-cover', 'object-top', 'blur-sm', 'brightness-50',
  'scale-95', 'scale-3d', 'container', '@container',
];

/**
 * The corpus: every representative the merger has an opinion on, then every pair inside a
 * group and across each `conflictingClassGroups` edge both orders, then every ordered pair
 * of the consumer forms. `bg-position-*` is excluded — that is this walk composing a group
 * KEY as a prefix, not a Tailwind class — and so is anything the oracle does not model, so a
 * harness artifact can never be read as a finding.
 */
function validatorCorpus() {
  const { reps, config } = validatorReps();
  const usable = (c: string) => classKeyOf(c) !== null && !c.startsWith('bg-position-') && oracle(`${c} ${c}`) === c;
  const inputs: string[] = [];
  const conflicts: Record<string, readonly string[]> = config.conflictingClassGroups ?? {};
  for (const [group, members] of reps) {
    const a = members.filter(usable);
    for (const x of a) for (const y of a) inputs.push(`${x} ${y}`);
    for (const target of conflicts[group] ?? []) {
      const b = (reps.get(target) ?? []).filter(usable);
      for (const x of a) for (const y of b) inputs.push(`${x} ${y}`, `${y} ${x}`);
    }
  }
  const forms = CONSUMER_FORMS.filter((c) => classKeyOf(c) !== null);
  for (const x of forms) for (const y of forms) inputs.push(`${x} ${y}`);
  return { inputs, groups: reps.size };
}

// ─── the harness ────────────────────────────────────────────────────────────────────────────
interface Divergence {
  input: string;
  mine: string;
  theirs: string;
}

function diff(merge: ClassMerger, inputs: readonly string[]): Divergence[] {
  const divergences: Divergence[] = [];
  for (const input of inputs) {
    const mine = merge(input);
    const theirs = oracle(input);
    if (mine !== theirs) divergences.push({ input, mine, theirs });
  }
  return divergences;
}

/** Assert exact agreement, naming the input and BOTH outputs — never just a count. */
function expectParity(inputs: readonly string[], label: string) {
  const unique = [...new Set(inputs)];
  const divergences = diff(mergeClassList, unique);
  if (divergences.length > 0) {
    const shown = divergences
      .slice(0, 10)
      .map(
        (d) =>
          `    input:          ${JSON.stringify(d.input)}\n` +
          `      cn-merge:      ${JSON.stringify(d.mine)}\n` +
          `      tailwind-merge ${JSON.stringify(d.theirs)}`,
      )
      .join('\n');
    throw new Error(
      `${label}: ${divergences.length} of ${unique.length} inputs disagree with the tailwind-merge oracle.\n${shown}\n` +
        `  Either the table in src/utils/cn-merge.ts is wrong for that class, or the change is one this\n` +
        `  merger cannot express — do not edit this test to match the merger.`,
    );
  }
  return unique.length;
}

describe('cn-merge vs tailwind-merge', () => {
  it('derives the corpora it compares, and they are not empty', () => {
    // Floors, not exact counts: the tree moves. A collapsed extraction (an import style the
    // AST walk stopped resolving, a config walk that stopped composing) would otherwise turn
    // every assertion below into a comparison of nothing.
    expect(kit.calls, 'cn() call sites found by AST').toBeGreaterThan(250);
    expect(kit.filesWithCalls, 'files importing cn and calling it').toBeGreaterThan(80);
    expect(kit.tokens.length, 'distinct class tokens the kit emits').toBeGreaterThan(400);
    expect(kit.callSites.length, 'call sites with at least one static class').toBeGreaterThan(250);
    expect(tw.names.length, "tailwind-merge's named classes").toBeGreaterThan(500);
    expect(tw.sameGroup.length, 'same-group pairs').toBeGreaterThan(2_000);
    expect(tw.edges.length, 'conflictingClassGroups pairs').toBeGreaterThan(500);
    expect(union.length, 'union corpus').toBeGreaterThan(800);
    // Named anchors, so an extraction that silently produced a plausible-looking corpus fails
    // here rather than passing quietly: one kit-only font token, one arbitrary value, one
    // doubled-quote import site (`src/elements/*` uses `"../utils/cn"`).
    for (const anchor of ['text-body', 'text-transparent', 'p-2']) {
      expect(kit.tokens, `kit corpus is missing ${anchor}`).toContain(anchor);
    }
    expect(tw.names, 'tailwind-merge corpus is missing table-caption').toContain('table-caption');
    console.info(
      `cn-merge drift corpora: ${kit.tokens.length} kit tokens from ${kit.calls} call sites in ` +
        `${kit.filesWithCalls} files; ${tw.names.length} tailwind-merge classes in ` +
        `${tw.groupMembers.size} groups; union ${union.length}.`,
    );
  });

  it('agrees on every ordered pair of the classes the kit emits', () => {
    const cases = expectParity(
      kit.tokens.flatMap((a) => kit.tokens.map((b) => `${a} ${b}`)),
      'kit classes, all ordered pairs',
    );
    expect(cases).toBeGreaterThan(200_000);
  });

  it('agrees on the kit’s real call sites, and under every modifier stack', () => {
    expect(expectParity(kit.callSites, 'real cn() call sites')).toBeGreaterThan(250);
    expect(
      expectParity(
        MODIFIERS.flatMap((modifier) => kit.tokens.map((token) => `${modifier}${token} ${token}`)),
        'modifier stacks',
      ),
    ).toBeGreaterThan(1_000);
  });

  it("agrees on tailwind-merge's own named classes", () => {
    expect(expectParity([...tw.sameGroup, ...tw.edges], 'tailwind-merge same-group and edge pairs')).toBeGreaterThan(
      2_500,
    );
    expect(expectParity(tw.dedupe, 'tailwind-merge duplicate classes')).toBeGreaterThan(500);
  });

  it('agrees everywhere the merger puts two classes in one conflict key', () => {
    // The only corpus that can catch a conflict the merger INVENTS: such a pair has no
    // tailwind-merge edge to derive it from, so it exists nowhere in the config to enumerate.
    expect(expectParity(sameKeyPairs(), 'pairs sharing one conflict key')).toBeGreaterThan(5_000);
    expect(expectParity(neighbourPairs(), 'kit classes beside their tailwind-merge neighbours')).toBeGreaterThan(500);
  });

  it('agrees on random 3-5 tuples (seeded)', () => {
    expect(expectParity(randomTuples(100_000), 'random 3-5 tuples')).toBeGreaterThan(99_000);
  });

  it('agrees on the validator/arbitrary form of every group tailwind-merge names', () => {
    // The corpus corpora 1-6 could not build: a group whose members are named by a
    // VALIDATOR rather than a literal (`stroke-w`, `outline-w`, `ring-w`, `shadow`,
    // `inset-ring-w`, `text-shadow`, …). See validatorCorpus() for why this is the
    // corpus that makes a wrong value split in a modelled family fail loudly.
    const { inputs, groups } = validatorCorpus();
    expect(groups, 'tailwind-merge groups walked').toBeGreaterThan(300);
    expect(inputs.length, 'validator/arbitrary pairs').toBeGreaterThan(1_000);
    expect(expectParity(inputs, 'validator and arbitrary forms of every modelled family')).toBeGreaterThan(1_000);
  });

  it('CAUGHT A WRONG TABLE: a deliberately broken merger fails the harness', () => {
    // Without this the suite could stop comparing anything (a wrong `oracle`, a corpus that
    // derived empty) and stay green, which is the one failure a parity guard must not have.
    //
    // The key has to be a PLAIN STRING in CLASS_TABLE for this filter to drop it: the entries
    // whose key comes from a function (`radius`, `radius-tl`, `font-size` from `text-[11px]`, …)
    // are filtered by identity, not by the key they compute. `radius` is therefore asserted
    // through the oracle comparison below instead of through a dropped matcher.
    const withoutKey = (key: string) => createClassMerger(CLASS_TABLE.filter(([, k]) => k !== key), REMOVES);
    const probes: Array<[key: string, input: string]> = [
      ['p', 'p-2 p-4'],
      ['leading', 'leading-tight leading-none'],
      ['display', 'block table-caption'],
      ['size', 'h-2 size-4'],
      ['flex-shorthand', 'shrink-0 flex-1'],
      ['font-size', 'leading-none text-xs'],
    ];

    for (const [key, input] of probes) {
      const found = diff(withoutKey(key), [input]);
      expect(found, `dropping the '${key}' matcher must be caught for ${JSON.stringify(input)}`).toHaveLength(1);
      expect(found[0].input).toBe(input);
      expect(found[0].mine).not.toBe(found[0].theirs);
    }

    // …and the corpora catch it too, without anyone writing the failing pair down: the classes
    // the dropped key owns are paired with the whole kit surface, both orders.
    for (const [key] of probes) {
      const owned = kit.tokens.filter((token) => classKeyOf(token) === key).slice(0, 40);
      const pairs = owned.flatMap((a) => kit.tokens.flatMap((b) => [`${a} ${b}`, `${b} ${a}`]));
      expect(
        diff(withoutKey(key), pairs).length,
        `the kit corpus must catch a table missing the '${key}' group`,
      ).toBeGreaterThan(0);
    }

    // An oracle that lost the kit's font-size aliasing must fail too, since that aliasing is the
    // whole reason this merger carries a class table instead of leaning on the cascade. In the
    // compiled sheet `.text-body` sits BEFORE `.text-sm`, so CSS alone would always pick
    // `text-sm`; `cn('text-sm', 'text-body')` must yield `text-body`, because the semantic name
    // is the one the caller wrote last.
    const plainOracle = extendTailwindMerge({});
    expect(plainOracle('text-sm text-body')).not.toBe(oracle('text-sm text-body'));
    expect(mergeClassList('text-sm text-body')).toBe(oracle('text-sm text-body'));
    expect(mergeClassList('text-sm text-body')).toBe('text-body');
    expect(mergeClassList('text-transparent text-body')).toBe('text-transparent text-body');
    expect(mergeClassList('leading-none text-body')).toBe('text-body');

    // THE VALIDATOR CORPUS CAUGHT THIS ONE. Collapsing a width/colour family back onto one
    // key — the defect that shipped in this table's first version, where `stroke-2` beside a
    // `stroke-red-500` deleted the width — must fail on the validator corpus, on the arbitrary
    // form a consumer writes and the named-class corpora never contained. Without this the
    // extended corpus could be present and still not be doing anything.
    const conflated: ClassMergeTable = [[/^stroke-/, 'stroke'], ...CLASS_TABLE];
    const brokenStroke = createClassMerger(conflated, REMOVES);
    const caught = diff(brokenStroke, validatorCorpus().inputs);
    expect(caught.length, 'the validator corpus must catch a conflated width/colour family').toBeGreaterThan(0);
    expect(caught.map((d) => d.input)).toContain('stroke-2 stroke-red-500');
    expect(diff(mergeClassList, validatorCorpus().inputs)).toHaveLength(0);
  });
});
