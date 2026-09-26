/**
 * The `add` subcommand: `create-kai add <block> [<block>...]`.
 *
 * The wizard is the from-scratch door; this is the into-an-existing-project
 * door. The flow is the spec's simplified shadcn flow and nothing more:
 * resolve the items and their registryDependencies (blocks recurse, routes come
 * from the scaffolder catalog, and a dependency two items compose is written
 * ONCE), merge npm deps, write files to targets, print the manifest's `docs`.
 * Detection reads the host project instead of asking what it can see; the one
 * question it may ask is the ambiguous case, and it goes through the same
 * `AxisIo` seam as every other create-kai question so the menu-honesty tests
 * can drive it with spies.
 *
 * THE DATA AXIS IS THE FLAG SURFACE (spec 4, "three modes, one axis"): the
 * default is the block's scripted mock, `--no-mock` is the composition alone,
 * and `--gateway <integration>` is the block without a mock plus the backend
 * route that integration needs and the env file it reads. All three are
 * resolved from what the block's manifest declares, and a mode the selection
 * cannot satisfy is refused whole, naming what is missing - never silently
 * swapped for another mode.
 *
 * Importable by tests on purpose (`index.ts` is not): everything effectful is
 * injected through `AddEnv`, and `index.ts` passes the real terminal, the real
 * bundle constants and the bundled `dist/blocks` directory.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { BLOCK_FORMS, README_FILE } from '@kitn.ai/blocks/forms';

import type { AxisIo } from './axes';
import { normalizeGateway } from './args';
import {
  MOCK_MODE,
  blockFormAxis,
  blockFromItemJson,
  detectForm,
  loadBlocks,
  planAdd,
  resolveAdd,
} from './blocks';
import type { AddMode, AddPlan, Block, BlockForm } from './blocks';
import { WIRED_GATEWAYS } from './catalog';

export interface AddEnv {
  cwd: string;
  /** the bundled blocks directory (dist/blocks for the real CLI) */
  blocksRoot: string;
  /** the @kitn.ai/ui range the CLI pins (__KIT_RANGE__ for the real CLI) */
  kitRange: string;
  /** the exact kit version the CLI was built against (__KIT_VERSION__) */
  kitVersion: string;
  /** false under --yes or with no TTY: the ambiguous ask REFUSES instead */
  interactive: boolean;
  io: AxisIo;
  out(line: string): void;
  error(line: string): void;
  /** fetch a per-block item JSON URL; injectable so tests never hit a network */
  fetchJson?(url: string): Promise<unknown>;
}

interface AddArgs {
  /** every positional item, in the order given: `add a b c` is one install */
  items: string[];
  list: boolean;
  json: boolean;
  yes: boolean;
  dir?: string;
  form?: string;
  /** `--gateway <integration>`: the real-backend spelling of the data axis */
  gateway?: string;
  /** `--no-mock`: the composition-only spelling of the data axis */
  noMock: boolean;
  errors: string[];
}

// THE form axis, read from `@kitn.ai/blocks/forms` and not restated: a fourth
// delivery form joins `BLOCK_FORMS` and this flag accepts it, help text and
// refusal message included, with nothing here to update.
const FORM_IDS: readonly string[] = BLOCK_FORMS.map((form) => form.id);

/**
 * The ids `--gateway` accepts as a REAL backend: the gateways this release can
 * wire end to end, minus the local mock, which is the DEFAULT mode rather than
 * a gateway anybody asks for. Derived from `WIRED_GATEWAYS` for the reason
 * `--form` is derived from `BLOCK_FORMS`: a hand-typed list is how the flag
 * comes to accept a gateway the CLI cannot wire, or refuse one it gained.
 */
const REAL_GATEWAY_IDS: readonly string[] = [...WIRED_GATEWAYS].filter((id) => id !== 'mock');

/** `a, b or c` -- one prose list for every refusal and help line that needs one. */
function proseList(ids: readonly string[]): string {
  return ids.length > 1 ? `${ids.slice(0, -1).join(', ')} or ${ids[ids.length - 1]}` : (ids[0] ?? 'none');
}

/** `html, react or cdn` -- the refusal message's list, in the axis's order. */
const FORM_PROSE = proseList(FORM_IDS);

/** `openrouter or anthropic` -- the gateways a `--gateway` run can name today. */
const GATEWAY_PROSE = proseList(REAL_GATEWAY_IDS);

export const ADD_HELP = `
create-kai add <block> [<block>...]  write blocks from the registry into this project
create-kai add <url> [<url>...]      resolve per-block item JSON URLs the same way

  --list [--json]            print the blocks this release ships and exit
  --form <${FORM_IDS.join('|')}>    override framework detection
  --gateway <id>             ship no scripted mock: emit that integration's backend
                             route and the env file it reads (${REAL_GATEWAY_IDS.join(', ')})
  --no-mock                  ship the composition only: no scripted mock, no route
  --dir <path>               target project directory (default: cwd)
  -y, --yes                  non-interactive; an ambiguous detection fails instead of asking
`;

export function parseAddArgs(argv: readonly string[]): AddArgs {
  const out: AddArgs = { items: [], list: false, json: false, yes: false, noMock: false, errors: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--list': out.list = true; break;
      case '--json': out.json = true; break;
      case '-y': case '--yes': out.yes = true; break;
      case '--no-mock': out.noMock = true; break;
      case '--dir':
      case '--form':
      case '--gateway': {
        const value = argv[++i];
        if (value === undefined) out.errors.push(`${arg} needs a value`);
        else if (arg === '--dir') out.dir = value;
        else if (arg === '--form') out.form = value;
        else out.gateway = value;
        break;
      }
      case '-h': case '--help': break; // the caller prints ADD_HELP on no item
      default:
        if (arg.startsWith('-')) out.errors.push(`unknown flag ${arg}`);
        else out.items.push(arg);
    }
  }
  if (out.form !== undefined && !FORM_IDS.includes(out.form)) {
    out.errors.push(`--form must be ${FORM_PROSE}, got '${out.form}'`);
  }
  // THE MODE IS AN AXIS WITH THREE SPELLINGS, so two of them at once is a
  // contradiction rather than a precedence rule: which one won would be
  // invisible in the output either way.
  if (out.gateway !== undefined && out.noMock) {
    out.errors.push(
      '--gateway and --no-mock are two data modes: pass one (--gateway ships a real backend route, --no-mock ships the composition alone)',
    );
  }
  if (out.gateway !== undefined) {
    // `mock` is the DEFAULT mode, so it is accepted here rather than refused as
    // a gateway nobody can ask for; `none` is the prompt's word for it.
    const gateway = normalizeGateway(out.gateway);
    if (gateway !== 'mock' && !REAL_GATEWAY_IDS.includes(gateway as string)) {
      out.errors.push(`--gateway must be ${GATEWAY_PROSE}, or mock for the default scripted mock; got '${out.gateway}'`);
    }
  }
  return out;
}

/**
 * The data mode the flags asked for. `--gateway mock` (and `none`, the wizard
 * prompt's word for the same integration) IS the default mode, which is why it
 * resolves to it instead of to a route called mock.
 */
function addMode(args: Pick<AddArgs, 'gateway' | 'noMock'>): AddMode {
  if (args.noMock) return { mode: 'none' };
  const gateway = normalizeGateway(args.gateway);
  if (gateway !== undefined && gateway !== 'mock') return { mode: 'real', gateway };
  return MOCK_MODE;
}

/** The nearest package.json walking up from `dir`, parsed, or null. */
export async function nearestPackageJson(dir: string): Promise<{ path: string; pkg: unknown } | null> {
  let current = path.resolve(dir);
  for (;;) {
    const candidate = path.join(current, 'package.json');
    if (existsSync(candidate)) {
      try {
        return { path: candidate, pkg: JSON.parse(await readFile(candidate, 'utf8')) };
      } catch {
        return { path: candidate, pkg: null };
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Decide the delivery form: flag > detection, with the ambiguous case asked
 * loudly (interactive) or refused with what was found named (non-interactive).
 * Returns the form, or an error string.
 */
export async function decideForm(
  override: string | undefined,
  packageJson: unknown | null,
  hasProject: boolean,
  interactive: boolean,
  io: AxisIo,
): Promise<{ form?: BlockForm; error?: string; note?: string }> {
  if (override !== undefined) return { form: override as BlockForm };
  if (!hasProject) return { form: 'cdn' };
  const detection = detectForm(packageJson);
  if (detection.kind === 'ambiguous') {
    if (!interactive) {
      return {
        error:
          `this project depends on ${detection.found.join(' AND ')}, so the block form is ambiguous. ` +
          `Pass ${detection.forms.map((form) => `--form ${form}`).join(' or ')}.`,
      };
    }
    const axis = blockFormAxis(detection.found, detection.forms);
    const answer = await io.ask(axis, axis.options[0].id);
    return { form: answer as BlockForm };
  }
  if (detection.kind === 'none') return { form: 'html' };
  return {
    form: detection.form,
    // DECIDED LOUDLY. Landing a vue project on the framework-neutral form is a
    // decision, and a decision made without saying so is the failure mode this
    // repo names most often. The sentence states the framework, the form and
    // the reason; the trees for the remaining frameworks arrive with the rest
    // of the renderers (spec 3.5).
    // COUPLED: scripts/verify-add.mjs's otherFrameworkLeg matches on the
    // literal fragment "generates no vue tree yet" below. Change that check
    // too if you reword this sentence.
    note:
      detection.fallback.length === 0
        ? undefined
        : `this project uses ${detection.fallback.join(' and ')}, and this release generates no ${detection.fallback.join('/')} tree yet, ` +
          `so the block lands in the framework-neutral html form (the kai- web components work in every framework). ` +
          `The generated ${detection.fallback.join(' and ')} trees arrive with the remaining renderers.`,
  };
}

/** Merge the plan's dependencies into package.json text; existing entries win. */
export function mergeDependencies(
  pkgText: string,
  dependencies: Record<string, string>,
): { text: string; added: string[]; kept: string[] } {
  const pkg = JSON.parse(pkgText) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const added: string[] = [];
  const kept: string[] = [];
  for (const [name, version] of Object.entries(dependencies)) {
    if (pkg.dependencies?.[name] !== undefined || pkg.devDependencies?.[name] !== undefined) {
      kept.push(name);
      continue;
    }
    pkg.dependencies = { ...pkg.dependencies, [name]: version };
    added.push(name);
  }
  // Preserve the file's own indentation style where detectable; two spaces is
  // what every template in this repo writes.
  return { text: `${JSON.stringify(pkg, null, 2)}\n`, added, kept };
}

/** The paths in `plan` that already exist under `root` - the refusal list. */
export function collisions(plan: AddPlan, root: string): string[] {
  return plan.files.filter((file) => existsSync(path.join(root, file.path))).map((file) => file.path);
}

export async function runAdd(argv: readonly string[], env: AddEnv): Promise<number> {
  const args = parseAddArgs(argv);
  if (args.errors.length) {
    for (const error of args.errors) env.error(`create-kai add: ${error}`);
    env.error(ADD_HELP);
    return 1;
  }

  let blocks: Block[];
  try {
    blocks = await loadBlocks(env.blocksRoot);
  } catch (error) {
    env.error(`create-kai add: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  if (args.list) {
    if (args.json) {
      env.out(JSON.stringify({ blocks: blocks.map((b) => b.manifest) }, null, 2));
    } else {
      for (const block of blocks) {
        env.out(`  ${block.name.padEnd(20)}${block.manifest.title} - ${block.manifest.description}`);
      }
      env.out(`${blocks.length} block${blocks.length === 1 ? '' : 's'} in this release`);
    }
    return 0;
  }

  if (!args.items.length) {
    env.error(ADD_HELP);
    return 1;
  }

  const wiring = addMode(args);

  const targetDir = path.resolve(env.cwd, args.dir ?? '.');
  const near = await nearestPackageJson(targetDir);
  const interactive = env.interactive && !args.yes;

  const decided = await decideForm(args.form, near?.pkg ?? null, near !== null, interactive, env.io);
  if (decided.error || !decided.form) {
    env.error(`create-kai add: ${decided.error ?? 'no delivery form decided'}`);
    return 1;
  }
  const form = decided.form;
  if (decided.note) env.out(`create-kai add: ${decided.note}`);
  // Where files land: the project root that owns the detected package.json,
  // so `add` from a subdirectory does not scatter blocks/ trees; the cdn form
  // lands where the command ran.
  const root = form === 'cdn' || !near ? targetDir : path.dirname(near.path);

  if (form === 'cdn' && !near) {
    env.out('No project here (no package.json up from this directory), so you get the self-contained CDN paste form.');
    env.out('For a scaffolded project, run `npm create kai@latest` (the wizard).');
  }

  let plan: AddPlan;
  try {
    const resolved = await resolveAdd(args.items, {
      local: (name) => blocks.find((b) => b.name === name),
      fetchItem: async (url) => {
        const json = env.fetchJson
          ? await env.fetchJson(url)
          : await (await fetch(url)).json();
        const parsed = blockFromItemJson(json, url);
        if (!parsed.block) throw new Error(parsed.errors.join('; '));
        return parsed.block;
      },
    }, wiring);
    plan = planAdd(resolved, { form, kitRange: env.kitRange, kitVersion: env.kitVersion, wiring });
  } catch (error) {
    env.error(`create-kai add: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  // COLLISION REFUSAL, whole-plan and loud: existing files are never
  // overwritten, and a partial block is worse than none, so one collision
  // refuses every write and lists them all.
  const existing = collisions(plan, root);
  if (existing.length) {
    env.error(
      `create-kai add: refusing to overwrite ${existing.length} existing file${existing.length === 1 ? '' : 's'}:`,
    );
    for (const file of existing) env.error(`  ${file}`);
    env.error('Move or delete them first; add never overwrites.');
    return 1;
  }

  for (const file of plan.files) {
    const absolute = path.join(root, file.path);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, file.contents, 'utf8');
    env.out(`  write ${file.path}`);
  }

  // THE ENV THE ROUTE READS, created only when absent - deliberately outside
  // `plan.files` and its whole-plan collision refusal. A block file that exists
  // is an edited block and refusing is right; `.env.local` is a file the
  // consumer very likely already has, and refusing the install over their own
  // key file would be the collision rule eating the feature. Either way the
  // variable names are printed, so "no env file was written" is never silent.
  if (plan.env) {
    const envPath = path.join(root, plan.env.path);
    if (existsSync(envPath)) {
      env.out(`  env   ${plan.env.path} already exists; add ${plan.env.vars.join(', ')} to it yourself`);
    } else {
      await writeFile(envPath, plan.env.contents, 'utf8');
      env.out(`  env   ${plan.env.path} written with ${plan.env.vars.join(', ')} (placeholder values)`);
    }
  }

  if (near && form !== 'cdn' && Object.keys(plan.dependencies).length) {
    const merged = mergeDependencies(await readFile(near.path, 'utf8'), plan.dependencies);
    if (merged.added.length) {
      await writeFile(near.path, merged.text, 'utf8');
      env.out(`  deps  ${merged.added.map((name) => `${name}@${plan.dependencies[name]}`).join(', ')} added to package.json; run your package manager's install`);
    }
    for (const name of merged.kept) {
      env.out(`  deps  ${name} already in package.json; kept as is`);
    }
  }

  for (const note of plan.notes) env.out(note);

  // THE README, VERBATIM. Every project-shaped form ships one (spec 3.5): what
  // the block needs, and the one framework-config line where there is one.
  // Writing it without printing it ends the command on a file list and leaves
  // the consumer to go find the thing that explains the files.
  //
  // Matched on the renderer's OWN constant rather than the string "README.md",
  // and on the basename because the path is the project-relative target.
  const readmes = plan.files.filter((file) => path.posix.basename(file.path) === README_FILE);
  for (const readme of readmes) {
    env.out('');
    for (const line of readme.contents.trimEnd().split('\n')) env.out(line);
  }

  // `docs` is the LAST line of every README, so printing it again under a form
  // that shipped one puts the same paragraph on the terminal twice. The cdn
  // paste form has no README, and this is the only way its docs are seen.
  if (readmes.length === 0) for (const docs of plan.docs) env.out(docs);
  return 0;
}
