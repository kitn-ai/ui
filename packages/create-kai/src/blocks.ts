/**
 * `create-kai add <block>` - resolution, detection and write planning.
 *
 * THE REGISTRY IS THE KIT'S, NOT A COPY. Block logic (manifest validation,
 * discovery, the CDN-form generator) is imported from
 * `@kitn.ai/blocks` and bundled at build time,
 * exactly the way `catalog.ts` imports the scaffolder registry - one source,
 * a build failure as the drift failure mode. That module is a deliberate leaf
 * (pure, no zod, nothing under `mcp/`), so `bundleGraphProblem` stays green.
 * The block FILES ride the published CLI the way templates do:
 * `scripts/build.mjs` copies the resolved `@kitn.ai/blocks` package's
 * `blocks/` directory into `dist/blocks/`, and
 * the loader here walks whatever directory it is handed.
 *
 * THE PER-BLOCK JSON URL IS THE SAME PATH. `add https://host/r/name.json`
 * fetches the registry-item JSON (files carrying `content`) and feeds it
 * through the same validation and the same write planner the bundled registry
 * uses - the public integration surface from the spec's registry mechanics,
 * so a third-party static registry works from day one.
 *
 * WHAT RESOLUTION IS, IN FULL (spec Part 3, "what our resolution DELETES"):
 * item -> `registryDependencies` (blocks recurse; `route:<integration>` deps
 * resolve against the scaffolder catalog and emit the backend route the way
 * the scaffolder does) -> npm deps -> write files to targets -> print `docs`.
 * No components.json, no alias map, no import rewriting for the html targets;
 * the react form imports the published `@kitn.ai/ui/react` entry.
 *
 * RESOLUTION TAKES A LIST (spec 4, "select one or more"). One command may name
 * several items, and the registryDependencies are deduped ACROSS the selection
 * rather than per item, so a block two of them compose is written once.
 *
 * THE DATA AXIS RIDES ON TOP OF IT (spec 4): `mock`, `none` and `real`, one
 * axis with three spellings. It is resolved from what a manifest DECLARES (the
 * seam its `wiring.modeFiles`/`wiring.modeTarget` describe, its `mockFiles` and
 * its `gateways`), never guessed from a file name, and a mode the selection
 * cannot satisfy THROWS naming what is missing. Each mode's file is chosen by
 * the RENDERER (`@kitn.ai/blocks/forms` resolves the seam, which is what makes
 * the same choice in the CLI, in the /blocks trees and in the compile cells).
 * There is no fallback between modes: a mode that quietly became another mode is
 * the one outcome the consumer cannot see and cannot repair.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { discoverBlocks, unsafeFilePathReason, unsafeNameReason } from '@kitn.ai/blocks';
import type {
  Block,
  BlockManifest,
  RawBlockSource,
} from '@kitn.ai/blocks';
// The FORM RENDERING is the kit's shared pure module too (same bundle-import
// precedent as the registry line above): one renderer serves this planner AND
// the per-framework code view on the docs site's /blocks section, so what
// /blocks shows is byte-for-byte what `add` writes.
import {
  BLOCK_FORMS,
  FRAMEWORK_BLOCK_FORMS,
  adaptRegistrationForBundler,
  componentName,
  renderBlockForm,
  type BlockFormId,
  type FormFile,
} from '@kitn.ai/blocks/forms';
import { INSTALL_ROOTS, fileTarget, installRoot, isTargetFramework, type TargetFramework } from '@kitn.ai/blocks/targets';

import { getIntegration, listIntegrations } from './catalog';
import type { Integration } from './catalog';
import type { Axis } from './axes';
import { getFramework } from './frameworks';
// The env file a keyed route needs is the GENERATOR's, not a second writer of
// one: the wizard writes the same file through the same function, so a route
// and its variables cannot disagree about their names.
import { renderEnvFile } from './generate';
import { emitRoute } from './routes';
import type { EmittedFile } from './routes';

export type { Block, BlockManifest };
export { adaptRegistrationForBundler };

// ---------------------------------------------------------------- discovery

/**
 * Load the bundled block registry from a directory of `blocks/<id>/` dirs.
 * Throws on validation errors rather than half-loading: a CLI that lists a
 * block its own registry rejects would fail later and less legibly.
 */
export async function loadBlocks(blocksRoot: string): Promise<Block[]> {
  const sources: RawBlockSource[] = [];
  const entries = await readdir(blocksRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(blocksRoot, entry.name);
    const names = (await readdir(dir, { withFileTypes: true }))
      .filter((f) => f.isFile())
      .map((f) => f.name);
    if (!names.includes('registry-item.json')) continue;
    const files = await Promise.all(
      names
        .filter((name) => name !== 'registry-item.json')
        .map(async (name) => ({ name, content: await readFile(path.join(dir, name), 'utf8') })),
    );
    sources.push({
      dirName: entry.name,
      manifestJson: await readFile(path.join(dir, 'registry-item.json'), 'utf8'),
      files,
    });
  }
  const { blocks, errors } = discoverBlocks(sources, listIntegrations().map((i) => i.id));
  if (errors.length) {
    throw new Error(`the bundled block registry does not validate:\n  ${errors.join('\n  ')}`);
  }
  return blocks;
}

/** A fetched registry-item JSON (files carrying content) as a `Block`. */
export function blockFromItemJson(raw: unknown, sourceUrl: string): { block?: Block; errors: string[] } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { errors: [`${sourceUrl}: the item JSON is not an object`] };
  }
  const item = raw as BlockManifest & { files?: { path?: unknown; content?: unknown }[] };
  if (typeof item.name !== 'string' || item.name.length === 0) {
    return { errors: [`${sourceUrl}: the item JSON has no "name"`] };
  }
  const errors: string[] = [];
  // PATH TRAVERSAL. A fetched item's "name" and files[].path never pass
  // through `validateBlockManifest`'s dirName check (there is no directory
  // scan for a URL), so this is the one place they meet the shared rule in
  // `@kitn.ai/blocks` before `fileTarget`/`runAdd` join them onto the
  // install root with a raw string concatenation.
  const nameProblem = unsafeNameReason(item.name);
  if (nameProblem) {
    errors.push(`${sourceUrl}: name "${item.name}" ${nameProblem}`);
  }
  const files = new Map<string, string>();
  for (const entry of item.files ?? []) {
    if (typeof entry.path !== 'string' || typeof entry.content !== 'string') {
      errors.push(`${sourceUrl}: files["${String(entry.path)}"] carries no inline "content"; a per-block item JSON is self-contained`);
      continue;
    }
    const pathProblem = unsafeFilePathReason(entry.path);
    if (pathProblem) {
      errors.push(`${sourceUrl}: files["${entry.path}"] ${pathProblem}`);
      continue;
    }
    files.set(entry.path, entry.content);
  }
  if (!Array.isArray(item.files) || item.files.length === 0) {
    errors.push(`${sourceUrl}: the item JSON lists no files`);
  }
  if (!(item.files ?? []).some((f) => (f as { type?: unknown }).type === 'registry:page')) {
    errors.push(`${sourceUrl}: no files[] entry is type "registry:page"`);
  }
  if (errors.length) return { errors };
  const manifest = { ...(item as BlockManifest) };
  manifest.files = (item.files as BlockManifest['files']).map(({ ...entry }) => {
    delete (entry as { content?: unknown }).content;
    return entry;
  });
  return { block: { name: item.name, manifest, files }, errors: [] };
}

// --------------------------------------------------------------- resolution

export interface ResolvedAdd {
  /** dependency order: a block's registryDependencies land before it */
  blocks: Block[];
  /** the backend routes the composition streams through */
  routes: Integration[];
}

export interface BlockResolvers {
  /** the bundled registry, by name */
  local(name: string): Block | undefined;
  /** fetch + parse a per-block item JSON URL */
  fetchItem(url: string): Promise<Block>;
}

const isUrl = (spec: string) => /^https?:\/\//.test(spec);

/**
 * Resolve every requested item (one command may name several) and their
 * `registryDependencies`, recursively. Bare names inside a URL-sourced item
 * resolve as sibling `<name>.json` URLs (the shadcn registry grammar); bare
 * names inside a bundled block resolve against the bundled registry.
 * `route:<integration>` resolves against the scaffolder catalog. Failures
 * THROW with every known alternative named.
 *
 * THE FIRST ITEM IS NOT SPECIAL and neither is the last: the `done` and
 * `routes` maps are shared by the whole selection, which is what dedupes a
 * dependency two items compose (its files are planned once, its route emitted
 * once). Resolving each item in its own call would plan that dependency twice,
 * and the second write is the collision refusal the consumer cannot get past.
 *
 * THE MODE IS A PARAMETER because one of the three modes has a dependency of
 * its own. `real` mode builds `route:<gateway>` HERE, from the gateway the
 * consumer asked for, and resolves it against the scaffolder catalog exactly
 * the way a declared `route:` dep resolves - the manifest cannot declare it
 * for `add` (see `BlockManifest.wiring`: a route dependency resolves on every
 * install, which is the backend nobody asked for) and the CLI can, because the
 * CLI knows which mode is being installed. The other two modes add nothing.
 */
export async function resolveAdd(
  specs: readonly string[],
  resolvers: BlockResolvers,
  wiring: AddMode = MOCK_MODE,
): Promise<ResolvedAdd> {
  if (specs.length === 0) throw new Error('no block was named');
  const blocks: Block[] = [];
  const routes = new Map<string, Integration>();
  const visiting = new Set<string>();
  const done = new Set<string>();

  async function visit(item: string, fromUrl: string | null): Promise<void> {
    if (item.startsWith('route:')) {
      const id = item.slice('route:'.length);
      const integration = getIntegration(id);
      if (!integration) {
        throw new Error(
          `"${item}" names no scaffolder integration. Known: ${listIntegrations().map((i) => i.id).join(', ')}`,
        );
      }
      routes.set(id, integration);
      return;
    }
    if (item.startsWith('@')) {
      throw new Error(`"${item}": namespaced registry items are not resolvable by this release; use the block's item JSON URL`);
    }

    const url = isUrl(item) ? item : fromUrl ? new URL(`./${item}.json`, fromUrl).href : null;
    const key = url ?? item;
    if (done.has(key)) return;
    if (visiting.has(key)) {
      throw new Error(`registryDependencies cycle through "${item}"`);
    }
    visiting.add(key);

    let block: Block;
    if (url) {
      block = await resolvers.fetchItem(url);
    } else {
      const found = resolvers.local(item);
      if (!found) {
        throw new Error(`no block named "${item}". Run \`create-kai add --list\` for what this release ships.`);
      }
      block = found;
    }

    for (const dep of block.manifest.registryDependencies ?? []) {
      await visit(dep, url);
    }
    visiting.delete(key);
    done.add(key);
    blocks.push(block);
  }

  for (const spec of specs) await visit(spec, null);
  // The one dependency a MODE contributes: the backend route `--gateway`
  // asked for. Added after the selection so it is resolved once, however many
  // items the selection holds.
  if (wiring.mode === 'real') await visit(`route:${wiring.gateway}`, null);
  return { blocks, routes: [...routes.values()] };
}

// ---------------------------------------------------------- framework detection

/**
 * The signals table (spec Part 3, detection ruling). DATA, so a new framework
 * variant is a row, not a branch.
 *
 * A row names the dependency and the FRAMEWORK it means. Where that framework
 * LANDS is not in the table: it is derived from the renderer list below, so
 * the day a renderer for it exists the row starts pointing at its own tree
 * with nothing here to edit. The previous version carried the landing form per
 * row, which made this file a second copy of "which renderers exist" living in
 * a package the renderer work has no reason to open.
 *
 * `preact` carries `null`: it is a real signal (a preact project is a project)
 * and it will never have an install root of its own, because a preact host
 * renders the custom elements like any other. `null` says that; `'html'` would
 * have read as "preact's own tree is the html one", which is a different and
 * false claim.
 */
export const FRAMEWORK_SIGNALS: readonly { dep: string; framework: TargetFramework | null }[] = [
  { dep: 'react', framework: 'react' },
  { dep: 'preact', framework: null },
  { dep: 'vue', framework: 'vue' },
  { dep: 'svelte', framework: 'svelte' },
  { dep: '@angular/core', framework: 'angular' },
  { dep: 'solid-js', framework: 'solid' },
];

export type BlockForm = BlockFormId;
/** Every form that is a project tree: the delivery forms minus the paste form. */
export type ProjectForm = Exclude<BlockForm, 'cdn'>;

/**
 * Does this release generate a tree for this framework?
 *
 * The narrowing is the coupling, spelled in the type system: a form id that is
 * also a target framework. Today that is `html` and `react`; PR B2 adds four
 * rows to `BLOCK_FORMS` and this predicate widens with them.
 */
function emitsOwnTree(framework: TargetFramework | null): framework is TargetFramework & ProjectForm {
  return framework !== null && FRAMEWORK_BLOCK_FORMS.some((form) => form.id === framework);
}

/** Where a signal's framework lands TODAY: its own tree when the generator
 *  emits one, the framework-neutral html form until then. */
export function landingForm(framework: TargetFramework | null): ProjectForm {
  return emitsOwnTree(framework) ? framework : 'html';
}

export type Detection =
  | { kind: 'none' }
  | {
      kind: 'detected';
      form: ProjectForm;
      found: string[];
      /** frameworks this project uses whose OWN tree this release does not
       *  generate yet, so the caller can say so instead of deciding quietly */
      fallback: TargetFramework[];
    }
  | { kind: 'ambiguous'; found: string[]; forms: ProjectForm[] };

/** Read the detection off a parsed package.json, or its absence. */
export function detectForm(packageJson: unknown | null): Detection {
  if (packageJson === null || typeof packageJson !== 'object') return { kind: 'none' };
  const pkg = packageJson as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const found = FRAMEWORK_SIGNALS.filter((signal) => signal.dep in deps);
  const forms = [...new Set(found.map((signal) => landingForm(signal.framework)))];

  // AMBIGUITY IS ABOUT THE ANSWER, NOT THE SIGNAL COUNT. Two signals landing
  // on the same tree is not a question: today vue and svelte both land on the
  // html form and asking which of two identical outcomes the user wants is
  // noise, not loudness. When PR B2 emits both trees they start deciding
  // different forms and this begins asking on its own.
  if (forms.length > 1) return { kind: 'ambiguous', found: found.map((s) => s.dep), forms };

  return {
    kind: 'detected',
    // Any project with no framework signal at all - or one whose only signal
    // has no tree of its own - gets the base web-component form: elements work
    // everywhere.
    form: forms[0] ?? 'html',
    found: found.map((s) => s.dep),
    fallback: found
      .map((s) => s.framework)
      .filter((f): f is TargetFramework => f !== null && !emitsOwnTree(f)),
  };
}

/**
 * The ambiguous case as an axis, so the ask goes through the same `AxisIo`
 * seam every other create-kai question does and the menu-honesty discipline
 * (spy-driven tests over what was CALLED) applies to it.
 *
 * The options are the forms actually IN CONTENTION, derived from the
 * detection, with labels read off `BLOCK_FORMS`. Hand-listing two of them here
 * was a menu with a hand list in it, inside the one function whose reason for
 * existing is the menu-honesty seam.
 */
export function blockFormAxis(found: readonly string[], forms: readonly (ProjectForm & TargetFramework)[]): Axis {
  const label = (id: string): string => BLOCK_FORMS.find((form) => form.id === id)?.label ?? id;
  return {
    id: 'block-form',
    label: 'Block form',
    question: `This project depends on ${found.join(' AND ')}; which form does the block land in?`,
    options: forms.map((id) => ({
      id,
      label: label(id),
      hint: `files under ${INSTALL_ROOTS[id]}/<block>/`,
    })),
    because: 'the frameworks this project uses land in different forms, so which one you want is a real choice',
  };
}

// --------------------------------------------------------------- data axis

/**
 * WHERE A BLOCK'S TRANSPORT COMES FROM - the one axis spec section 4 ("Wiring:
 * three modes, one axis") names, with the three spellings the CLI exposes:
 *
 *   mock (default)      the composition PLUS the block's scripted mock
 *   none (`--no-mock`)  the composition only: the consumer wires their own
 *                       store or transport, or the MCP composes it
 *   real (`--gateway`)  no scripted mock, plus the `route:<integration>` the
 *                       block declares, emitted the way the scaffolder emits
 *                       it, and the env file that route reads
 *
 * A mode is resolved from what the MANIFEST declares and never guessed from a
 * file name: `wiring.mockFiles` says which files exist only for the scripted
 * demo, and `wiring.gateways` says which backends the block can stream from. A
 * mode the selection cannot satisfy is a THROW naming what is missing (see
 * `wiringProblem` and `assertMockUnreferenced`) - never a quiet fallback,
 * because a fallback is a decision made while withholding that it happened.
 */
export type AddMode =
  | { mode: 'mock' }
  | { mode: 'none' }
  | { mode: 'real'; gateway: string };

/** The mode a caller that does not say gets: the scripted mock, unchanged. */
export const MOCK_MODE: AddMode = { mode: 'mock' };

/** How a refusal names the mode the consumer asked for. */
function modeFlag(wiring: AddMode): string {
  return wiring.mode === 'real' ? `--gateway ${wiring.gateway}` : '--no-mock';
}

/**
 * The mock files a block DECLARES (`wiring.mockFiles` in its
 * `registry-item.json`).
 *
 * A block that ships a scripted demo declares it here; the file is also a
 * `files[]` entry, because the mock-mode composition still ships it, and this
 * list is what says WHICH of those files exist only for the mock. Nothing is
 * derived from a file name: `mock.ts` is a convention, not a rule, so a block
 * whose scripted data lives in `fixtures.ts` declares that instead, and a block
 * whose mock IS its seam names that seam file.
 *
 * THE MEMBERSHIP CHECK IS NOT REDUNDANT with `validateBlockManifest`'s. A
 * bundled block is validated on the way in, but a fetched per-block item JSON
 * (`create-kai add <url>`) is parsed by `blockFromItemJson`, which grades the
 * name and the paths and nothing else - so this is the one gate that item
 * passes, and dropping nothing while the consumer asked for a mock-free
 * install is exactly the silent outcome this axis exists to prevent.
 */
export function declaredMockFiles(block: Block): string[] {
  const declared = block.manifest.wiring?.mockFiles ?? [];
  for (const file of declared) {
    if (!block.manifest.files.some((entry) => entry.path === file)) {
      throw new Error(
        `${block.name}: wiring.mockFiles lists "${file}", which is not a files[] entry; a mock file is also a file the block ships`,
      );
    }
  }
  return declared;
}

/** The integrations a block declares it can stream through (`wiring.gateways`). */
function declaredGateways(block: Block): string[] {
  return block.manifest.wiring?.gateways ?? [];
}

/**
 * The PLANNED paths a mode that excludes the mock excludes.
 *
 * The declared path AND its stripped twin, because which of the two a form
 * ships depends on the form: the html form writes `<name>.js` (the twin the
 * bundled block carries) while the react form writes the `<name>.ts` source.
 * Dropping only the declared one would leave the html form's mock in place.
 */
function mockPaths(block: Block): string[] {
  const paths: string[] = [];
  for (const declared of declaredMockFiles(block)) {
    paths.push(declared, declared.replace(/\.ts$/, '.js'), declared.replace(/\.js$/, '.ts'));
  }
  return paths;
}

/**
 * Can this selection satisfy this mode at all?
 *
 * Asked BEFORE anything is planned or printed, so an unsatisfiable mode
 * refuses whole (the way a collision does) instead of writing the part of the
 * composition it could and calling that a result. Each refusal names the mode
 * and the way out; the gateway one names the gateways the selection DOES
 * declare, which is the only list a consumer can act on.
 */
function wiringProblem(resolved: ResolvedAdd, wiring: AddMode, form: BlockForm): string | null {
  if (wiring.mode === 'mock') return null;
  if (form === 'cdn') {
    return (
      `${modeFlag(wiring)}: the cdn paste form is ONE self-contained file - its scripts are inlined into the page - ` +
      `so there is no separate mock to leave out. Run \`create-kai add\` inside a project for a mock-free install.`
    );
  }
  if (wiring.mode === 'real') {
    const missing = resolved.blocks.filter((block) => !declaredGateways(block).includes(wiring.gateway));
    if (missing.length > 0) {
      const valid = [...new Set(resolved.blocks.flatMap(declaredGateways))];
      return (
        `--gateway ${wiring.gateway}: ${missing.map((block) => block.name).join(', ')} ` +
        `${missing.length === 1 ? 'declares' : 'declare'} no route for it. ` +
        `This selection declares ${valid.length > 0 ? valid.join(', ') : 'none'}; ` +
        `pass one of those, or --no-mock and wire the transport yourself.`
      );
    }
  }
  return null;
}

/**
 * A planned file that still imports a module the requested mode leaves out.
 *
 * THIS is what makes a mock-free mode honest rather than optimistic. A block's
 * controller imports its mock (`from './mock'`) and the renderers copy it
 * verbatim, so dropping the file alone emits a project that cannot resolve the
 * import - a failure the consumer meets at build time, long after `add` said
 * it succeeded. The scan is over the emitted files (page, binder, controller,
 * stylesheet) so a page's `<script src="./mock.js">` is caught too, and it
 * names the importer and the specifier so the block's fix is obvious.
 *
 * A BLOCK WITH A SEAM NEVER REACHES THIS. Its controller imports
 * `./<modeTarget>`, which the renderer wrote, so nothing in the tree names the
 * dropped files. The refusal is what stands in for a seam on a block that has
 * none (wave 1 of spec section 6 converted none of them).
 */
function assertMockUnreferenced(block: Block, files: readonly FormFile[], dropped: readonly string[]): void {
  const names = new Set(dropped.map((path) => (path.split('/').pop() ?? path).replace(/\.(js|ts)$/, '')));
  for (const file of files) {
    const found: string[] = [];
    for (const match of file.content.matchAll(/['"(](\.{1,2}\/[^'")]+)['")]/g)) {
      const base = (match[1].split('/').pop() ?? match[1]).replace(/\.(js|jsx|ts|tsx|mjs)$/, '');
      if (names.has(base) && !found.includes(match[1])) found.push(match[1]);
    }
    if (found.length > 0) {
      throw new Error(
        `${block.name} cannot be installed without its scripted mock yet: ${file.path} still imports ` +
        `${found.map((spec) => `"${spec}"`).join(', ')}, and ${block.name} declares that module as a mock file ` +
        `(${declaredMockFiles(block).join(', ')}). The block's controller has to stop importing the mock before ` +
        `a mock-free install compiles - either declare a wiring.modeFiles seam (one source per data mode, written ` +
        `at wiring.modeTarget; see packages/blocks/src/registry.ts) or install it without the flag for the scripted mock.`,
      );
    }
  }
}

// ------------------------------------------------------------ write planning

export interface AddPlan {
  /** relative to the project root (or the cwd for the cdn form) */
  files: EmittedFile[];
  /** npm dependencies to merge into the project's package.json */
  dependencies: Record<string, string>;
  /** each resolved block's `docs` string, printed after the writes */
  docs: string[];
  /** decided-loudly lines: what was chosen or skipped, and why */
  notes: string[];
  /**
   * The env file a keyed route reads, created ONLY WHEN ABSENT.
   *
   * Deliberately not a `files[]` entry: a block file that already exists
   * refuses the whole install (add never overwrites), and `.env.local` is a
   * file consumers already have - refusing an install over the consumer's own
   * key file would be the collision rule eating the feature. So this one is
   * created when missing and REPORTED either way, which keeps the key names in
   * front of the consumer instead of the file silently not being written.
   */
  env?: { path: string; contents: string; vars: readonly string[] };
}

export interface PlanOptions {
  form: BlockForm;
  /** the @kitn.ai/ui range the CLI pins (`kit-pin.ts` owns the shape) */
  kitRange: string;
  /** the exact kit version, for the cdn form's pinned URLs */
  kitVersion: string;
  /**
   * The data mode the consumer asked for (spec 4). Optional, defaulting to the
   * scripted mock, because that is what every caller that says nothing means:
   * `add` with no flag, and the `/blocks` preview itself.
   */
  wiring?: AddMode;
}

/**
 * Plan every write for a resolved add. Pure: the caller owns collision
 * checking and the filesystem. Throws when a block cannot be rendered in the
 * requested form - a refusal that names the reason, never a partial block -
 * and when the requested DATA MODE cannot be satisfied (spec 4): a gateway no
 * block declares a route for, a file still importing the dropped mock, the
 * single-file paste form asked to leave a file out.
 */
export function planAdd(resolved: ResolvedAdd, opts: PlanOptions): AddPlan {
  const wiring = opts.wiring ?? MOCK_MODE;
  const plan: AddPlan = { files: [], dependencies: {}, docs: [], notes: [] };

  // The mode is decided before a file is planned or a note is printed.
  const unsatisfiable = wiringProblem(resolved, wiring, opts.form);
  if (unsatisfiable) throw new Error(unsatisfiable);

  for (const block of resolved.blocks) {
    planFormBlock(block, opts, plan, wiring);
    for (const dep of block.manifest.dependencies ?? []) {
      // The kit rides the CLI's own pin; anything else a block declares is
      // installed at latest, and the note says so out loud.
      if (dep === '@kitn.ai/ui') plan.dependencies[dep] = opts.kitRange;
      else if (!(dep in plan.dependencies)) {
        plan.dependencies[dep] = 'latest';
        plan.notes.push(`${block.name} depends on ${dep}, added at "latest" (the block manifest names no version)`);
      }
    }
    if (block.manifest.docs) plan.docs.push(`${block.name}: ${block.manifest.docs}`);
    const envVars = Object.entries(block.manifest.envVars ?? {});
    for (const [name, note] of envVars) plan.notes.push(`${block.name} needs ${name}: ${note}`);
  }

  // A mock-free mode that removed nothing says so. "It did something" is not a
  // safe assumption for a consumer to make; "there was nothing to leave out" is
  // a fact they can act on.
  if (wiring.mode !== 'mock' && resolved.blocks.every((block) => declaredMockFiles(block).length === 0)) {
    plan.notes.push(
      `${modeFlag(wiring)}: no block in this selection declares a scripted mock (wiring.mockFiles in its registry-item.json), so there was nothing to leave out.`,
    );
  }

  planRoutes(resolved, opts, plan, wiring);
  return plan;
}

// The rendered files come from the ONE shared dispatch, `renderBlockForm`
// (`@kitn.ai/blocks/forms`, which is what /blocks shows too) - never a
// specific renderer called by hand. What stays here is what only the CLI
// knows: where the files land (through `target`, already computed) and the
// note printed about them.

/**
 * The ONE place a rendered file becomes a planned write.
 *
 * `target` is the project-relative path the renderer already derived from
 * `@kitn.ai/blocks/targets`, and it is the same string the /blocks page
 * displays and the compile cells check. Joining a directory on here again is
 * what `blockDir()` did, and the two joins disagreed about react for a whole
 * release cycle: the table said `src/components/<id>/`, the CLI wrote
 * `src/blocks/<id>/`, and only a test asserting the mismatch knew.
 */
function planFiles(files: readonly FormFile[], plan: AddPlan): void {
  for (const file of files) plan.files.push({ path: file.target, contents: file.content });
}

/**
 * Render one block into `opts.form` and plan its files and its note.
 *
 * THE FILES ROUTE THROUGH `renderBlockForm`, NEVER A SPECIFIC RENDERER
 * (ruling R13). `@kitn.ai/blocks` keeps that dispatch's `switch` exhaustive
 * over every id in `BLOCK_FORMS` on its own side (no `default`, so a form
 * added there with no case fails ITS OWN `tsc --noEmit`); at runtime under a
 * partially-patched tree it returns `undefined`, and `planFiles`'s `for`
 * throws immediately - before a note is printed, before a file is written.
 * That is what stands between "a --form value BLOCK_FORMS accepts" and "add
 * silently writes the html tree for it", the failure a form id with no
 * renderer produces if the caller decides by hand instead of asking
 * `@kitn.ai/blocks`.
 */
function planFormBlock(block: Block, opts: PlanOptions, plan: AddPlan, wiring: AddMode): void {
  // THE MODE RIDES WITH THE RENDER CALL. The renderer resolves the block's seam
  // for it (`wiring.modeFiles` -> one file at `wiring.modeTarget`) and drops the
  // files the mode does not ship, so a mock-free tree is never rendered at all -
  // a block still importing `./mock` refuses below rather than shipping broken.
  const rendered = renderBlockForm(block, opts.form, { cdn: { version: opts.kitVersion }, mode: wiring.mode });
  // The mock files are dropped BEFORE the plan sees them, so the write list and
  // the refusal below are about the same set of files. `mock` mode passes the
  // renderer's list through untouched. Kept BESIDE the renderer's own drop
  // rather than replaced by it: a block with no seam (mockFiles and nothing else)
  // is still resolved here, and this is the list the refusal names.
  const dropped = wiring.mode === 'mock' ? [] : mockPaths(block);
  const files = dropped.length > 0 ? rendered.filter((file) => !dropped.includes(file.path)) : rendered;
  if (dropped.length > 0) assertMockUnreferenced(block, files, dropped);
  planFiles(files, plan);

  if (opts.form === 'cdn') {
    plan.notes.push(
      `${block.name}: no project here, so this is the self-contained CDN paste form - open ${block.name}.html directly, or paste it into any page. To scaffold a project around it, run \`npm create kai@latest\`.`,
    );
    return;
  }
  if (opts.form === 'react') {
    const dir = installRoot('react', block.name);
    plan.notes.push(
      `${block.name}: react form under ${dir}/ (render <${componentName(block.name)} /> from ${fileTarget('react', block.name, `${componentName(block.name)}.tsx`)})`,
    );
    return;
  }
  // Every other project-shaped form, html included: the html-shaped note,
  // naming its own install root. `isTargetFramework` gates the cast the same
  // way it does everywhere else in this file; for 'html' this reproduces the
  // note byte for byte, and for a future framework with no bespoke note of
  // its own (PR B2's business, not this one) it is still a true sentence
  // rather than a missing one.
  const framework = isTargetFramework(opts.form) ? opts.form : 'html';
  const dir = installRoot(framework, block.name);
  const page = block.manifest.files.find((f) => f.type === 'registry:page');
  // `.pop()` is `string | undefined` to tsc even on a non-empty split, so the
  // fallback is spelled out rather than asserted away.
  const pageFile = page ? (page.target ?? page.path.split('/').pop() ?? page.path) : '';
  plan.notes.push(
    `${block.name}: web-component form under ${dir}/ (open ${fileTarget(framework, block.name, pageFile)} through your dev server)`,
  );
}

/**
 * The backend routes a mode writes, or the sentence saying why it wrote none.
 *
 * ONLY `real` WRITES A ROUTE, and the two other modes SAY SO rather than
 * omitting it quietly: a block that declares a backend route ships without one
 * under the mock or the composition-only mode, and a consumer who cannot see
 * that decision reads the missing route as a bug in the block.
 */
function planRoutes(resolved: ResolvedAdd, opts: PlanOptions, plan: AddPlan, wiring: AddMode): void {
  if (wiring.mode !== 'real') {
    // The declaration is the mock-free modes' way of saying what this block
    // COULD be installed against, so the note names the gateways to pass.
    for (const gateway of [...new Set(resolved.blocks.flatMap(declaredGateways))]) {
      // NO FLAG ON A DEFAULT INSTALL. `modeFlag` is the REFUSAL convention - it names the mode a
      // caller asked for - and the mock is what a caller who said nothing gets, so stamping
      // `--no-mock` here would explain a missing route by naming a flag the reader never passed.
      // The `none` mode did pass it, and its own sentence names it again anyway.
      const asked = wiring.mode === 'mock' ? '' : `${modeFlag(wiring)}: `;
      plan.notes.push(
        `${asked}no backend route was written; this block declares ${gateway}. ` +
          (wiring.mode === 'none'
            ? 'The composition-only form leaves the transport to you.'
            : `Pass \`--gateway ${gateway}\` for the route the scaffolder emits, or --no-mock to wire your own.`),
      );
    }
    return;
  }

  // `--gateway <id>` is validated in `wiringProblem` against every block's own
  // declarations, and `resolveAdd` resolved the ONE route the consumer asked
  // for, so what is left here is emitting it.
  for (const integration of resolved.routes) {
    if (opts.form === 'react') {
      // The same emission the scaffolder uses: the catalog's webRoute fragment
      // under the react framework's declared route host.
      const framework = getFramework('react');
      const files = framework ? emitRoute(integration, framework) : [];
      if (files.length === 0) {
        plan.notes.push(`route ${integration.id}: the react starter declares no route host in this build, so no route was written`);
        continue;
      }
      plan.files.push(...files);
      plan.notes.push(
        `route ${integration.id}: ${files.map((f) => f.path).join(', ')} written; wire the plugin from vite-chat-api.ts into vite.config.ts plugins, and see https://ui.kitn.ai/${integration.docsSlug}`,
      );
      // The env file the route reads, at the path the react framework declares
      // (`paths.env`), with the names the catalog declares. Only when there is
      // a key to set: a gateway with no env vars has no env file to write.
      if (framework && integration.envVars.length > 0) {
        plan.env = {
          path: framework.paths.env,
          contents: renderEnvFile(integration.envVars, integration.runNote),
          vars: integration.envVars,
        };
      }
    } else {
      plan.notes.push(
        `route ${integration.id}: this block streams through a ${integration.title} backend, and only the react form emits one today. ` +
          `Add a server route yourself (env: ${integration.envVars.join(', ') || 'none'}); see https://ui.kitn.ai/${integration.docsSlug}`,
      );
    }
    for (const envVar of integration.envVars) {
      plan.notes.push(`route ${integration.id} needs ${envVar} set where the route runs`);
    }
  }
}
