/**
 * The `init` verb: make an EXISTING project kai-aware. `create` writes a whole project, `add`
 * writes a block into one it detects, and a hand-built Vite / Next / Svelte app had no door at all;
 * `doctor` reports what is missing and this writes what can be written.
 *
 * WHAT IT DOES: detects the project's framework from its dependencies (the same `detectForm` the
 * block registry uses), merges `@kitn.ai/ui` at the range this CLI was built to pin, and prints the
 * wiring that framework needs, naming the file each line goes in from the framework's own
 * `paths.entry` -- derived from the same defs the scaffolder emits from, never a table typed here.
 *
 * WHAT IT DELIBERATELY DOES NOT DO, each said out loud rather than left as a surprise:
 *
 *   - IT DOES NOT WRITE `kai.json`. That file records what the SCAFFOLDER emitted -- which template
 *     generation the files came from, which layout, which gateway, where the route lives -- and
 *     `init` emits no files, so every field it could write there would be an invented answer. This
 *     is also why `doctor` treats a missing `kai.json` as INFORMATION rather than a problem.
 *   - IT DOES NOT RUN AN INSTALL. It merges the dependency and prints the command your package
 *     manager needs. A verb that spends minutes installing into a project somebody is halfway
 *     through editing is how a tool teaches people to avoid it.
 *   - IT DOES NOT PATCH YOUR ENTRY FILE. The lines it prints are one each, and a project may already
 *     have its own way of doing both; a tool that guesses creates a diff its user did not ask for.
 *     `doctor` is what verifies the result afterwards.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { AxisIo } from './axes';
// FRAMEWORK_SIGNALS is the ONE mapping from a dependency to a framework, and init reads it rather
// than restating it. The block registry's `detectForm` answers a DIFFERENT question -- which tree a
// block lands in -- and today it maps a Solid project onto the framework-neutral `html` form, which
// is right for a block and wrong for wiring advice. init emits no block, so the framework is what
// it needs.
import { FRAMEWORK_SIGNALS } from './blocks';
// `mergeDependencies` lives beside `add` because that is where writing into an EXISTING
// package.json first had to happen; importing it rather than copying is the point.
import { mergeDependencies } from './add';
import { FRAMEWORKS } from './frameworks';
import { detectPackageManager } from './pm';

/** The block/delivery forms a project can be initialised for. */
export type InitForm = string;

export interface InitEnv {
  cwd: string;
  /** the `@kitn.ai/ui` range this CLI pins (`__KIT_RANGE__` for the real CLI) */
  kitRange: string;
  /** false under `--yes` or with no TTY: an ambiguous detection REFUSES instead of asking */
  interactive: boolean;
  io: AxisIo;
  out(line: string): void;
  error(line: string): void;
}

interface InitArgs {
  form?: string;
  yes: boolean;
  errors: string[];
}

export const INIT_HELP = `
create-kai init — make an existing project @kitn.ai/ui-aware

  npx -y @kitn.ai/cli init [--form <id>]

It reads your package.json, works out which framework you are on, adds @kitn.ai/ui
at the range this CLI was built to pin, and prints the two lines of wiring that
framework needs with the file each one goes in.

It does NOT write kai.json (that records what the SCAFFOLDER emitted, and init
emits no files), does NOT run an install, and does NOT patch your entry file.

Options
  --form <id>   skip detection; one of ${FRAMEWORKS.map((f) => f.id).join(', ')}
  -y, --yes     non-interactive; an ambiguous detection fails instead of asking
  -h, --help    this
`;

export function parseInitArgs(argv: readonly string[]): InitArgs {
  const args: InitArgs = { yes: false, errors: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--form') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('-')) args.errors.push('--form needs a value');
      else {
        args.form = value;
        i += 1;
      }
    } else if (arg === '-y' || arg === '--yes') {
      args.yes = true;
    } else {
      args.errors.push(`unknown argument ${arg}`);
    }
  }
  return args;
}

/**
 * Which framework to wire for: `--form` wins, then the project's own dependency signals, and when
 * those point at more than one framework the question goes through the same `AxisIo` seam every
 * other create-kai question does.
 *
 * The signals come from `FRAMEWORK_SIGNALS`, so a framework added there is offered here the same
 * day. Two signals that are the SAME framework (`react` and `react-dom`) are not a question.
 */
async function resolveForm(
  args: InitArgs,
  packageJson: unknown,
  env: InitEnv,
): Promise<{ form: InitForm } | { error: string }> {
  const known = FRAMEWORKS.map((f) => f.id);
  if (args.form !== undefined) {
    if (!known.includes(args.form)) {
      return { error: `--form ${args.form} is not one of ${known.join(', ')}` };
    }
    return { form: args.form };
  }

  const pkg = (packageJson ?? {}) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const found = FRAMEWORK_SIGNALS.filter((signal) => signal.dep in deps);
  const frameworks = [...new Set(found.map((s) => s.framework).filter((f): f is NonNullable<typeof f> => f !== null))];

  if (frameworks.length === 0) return { form: 'html' }; // framework-free: elements work everywhere
  if (frameworks.length === 1) return { form: frameworks[0] };

  if (!env.interactive || args.yes) {
    return {
      error:
        `this project depends on ${found.map((s) => s.dep).join(' AND ')}, so which framework to wire for is a ` +
        `real question. Pass ${frameworks.map((f) => `--form ${f}`).join(' or ')}.`,
    };
  }
  const axis = {
    id: 'init-framework',
    label: 'Framework',
    question: `This project depends on ${found.map((s) => s.dep).join(' AND ')}; which one should the wiring target?`,
    options: frameworks.map((id) => {
      const def = FRAMEWORKS.find((f) => f.id === id);
      // The hint is the file the wiring would land in, which is what actually differs.
      return { id, label: def?.label ?? id, hint: `wire ${def?.paths.entry ?? 'your entry file'}` };
    }),
    because: 'the frameworks in this project need different wiring, so which one you want is a real choice',
  };
  return { form: (await env.io.ask(axis, axis.options[0].id)) as InitForm };
}

/** The wiring to print, per registration mode, as the emitted starters write it. */
function wiringFor(form: InitForm): { theme: string; registration?: string } {
  const def = FRAMEWORKS.find((f) => f.id === form);
  if (def?.registration === 'solid') {
    // The Solid path imports the components themselves; the kit's sheet is imported by the
    // project's own CSS entry (this is what examples/starters/solid does).
    return {
      theme: `@import "@kitn.ai/ui/solid.css";`,
      registration: `import { Chat } from '@kitn.ai/ui/solid';`,
    };
  }
  return {
    theme: `import '@kitn.ai/ui/theme.tokens.css';`,
    registration: `import '@kitn.ai/ui/web-components'; // registers the kai-* custom elements`,
  };
}

export async function runInit(argv: readonly string[], env: InitEnv): Promise<number> {
  const args = parseInitArgs(argv);
  if (args.errors.length > 0) {
    for (const error of args.errors) env.error(`create-kai init: ${error}`);
    env.error(INIT_HELP);
    return 1;
  }

  const manifest = path.join(env.cwd, 'package.json');
  let manifestText: string;
  let packageJson: unknown;
  try {
    manifestText = readFileSync(manifest, 'utf8');
    packageJson = JSON.parse(manifestText);
  } catch {
    env.error(`create-kai init: no readable package.json in ${env.cwd}.`);
    env.error(`  init makes an EXISTING project kai-aware; to start one from nothing, run \`npm create kai\`.`);
    return 1;
  }

  const resolved = await resolveForm(args, packageJson, env);
  if ('error' in resolved) {
    env.error(`create-kai init: ${resolved.error}`);
    return 1;
  }
  const { form } = resolved;
  const def = FRAMEWORKS.find((f) => f.id === form);
  const registration = def?.registration ?? 'web-components';

  env.out(`create-kai init — detected ${def?.label ?? form}${def === undefined ? '' : ` (${form})`}`);
  if (def === undefined) {
    env.out(`  note  ${form} has no emitted tree of its own; the wiring below is the framework-neutral one.`);
  }

  // 1. the dependency, merged without disturbing anything else in the file.
  const { text, added, kept } = mergeDependencies(manifestText, { '@kitn.ai/ui': env.kitRange });
  if (added.length > 0) {
    writeFileSync(manifest, text);
    env.out(`  deps  @kitn.ai/ui@${env.kitRange} added to package.json`);
  } else {
    env.out(`  deps  @kitn.ai/ui is already declared (${kept.join(', ')}); left as it is`);
  }

  // 2. the wiring, with the file each line belongs in, from the framework's own paths.
  const entry = def?.paths.entry;
  const wiring = wiringFor(form);
  env.out('');
  env.out(`  Add to ${entry ?? 'your entry file'}:`);
  env.out(`    ${wiring.registration}`);
  env.out(`    ${wiring.theme}`);
  if (wiring.registration === undefined || registration !== 'web-components') {
    env.out(`    (import the components from the subpath that matches your stack: @kitn.ai/ui/react, /solid, or /web-components)`);
  }

  // 3. what to do next, including the one it does not do for you.
  env.out('');
  if (added.length > 0) {
    env.out(`  Then install it:  ${detectPackageManager().install.join(' ')}`);
  }
  env.out(`  Verify the result:  npx -y @kitn.ai/cli doctor`);
  env.out(`  Nothing was written except package.json: no kai.json (that records what the scaffolder emitted, and init emits no files) and no entry-file edit.`);
  return 0;
}
