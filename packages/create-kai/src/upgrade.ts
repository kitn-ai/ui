/**
 * The `upgrade` verb: bring a SCAFFOLDED project's template files up to the shape this CLI emits
 * today, without ever overwriting something its user wrote.
 *
 * WHAT IT IS FOR. A project scaffolded by `npm create kai` holds a copy of a template that the
 * templates have since moved past, and those copied files are the ones a user edits. The two facts
 * it must separate are "the template changed" (safe to replace) and "you changed this" (never
 * touched), and they are indistinguishable from the files alone.
 *
 * SO IT USES A BASELINE. `kai.json` records, for every file the scaffolder wrote, the sha256 of the
 * bytes it wrote (`files`, added for exactly this). A file that still hashes to its baseline is
 * untouched, so replacing it with today's template loses nothing; a file that does not is the
 * user's, and this reports it and moves on. That baseline is what makes the tool safe rather than
 * merely convenient, and it is why a project scaffolded before it has none: for those this reports
 * the drift and REFUSES to write, rather than guessing whose change it is.
 *
 * IT RENDERS ONCE, INTO A TEMP DIRECTORY, with the SAME `generate()` the wizard calls. A second
 * render path that only `upgrade` uses is how an upgrade tool starts emitting something the
 * scaffolder would not, and a second render for the write phase is how the plan and the write start
 * disagreeing.
 *
 * WHAT IT DOES NOT DO: it deletes nothing. A file the template no longer emits is reported as
 * dropped-from-the-template, because a file we wrote once is not ours to remove later: it may be
 * imported by something the user wrote.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { defaultTemplateRoot, generate } from './generate';
import type { Layout, WidgetStyle } from './types';

export interface UpgradeEnv {
  cwd: string;
  /** the `@kitn.ai/ui` range this CLI would pin today (`__KIT_RANGE__` for the real CLI) */
  kitRange: string;
  /** overridden by tests; defaults to the templates bundled beside the CLI */
  templateRoot?: string;
  out(line: string): void;
  error(line: string): void;
}

/** How one emitted file stands against the project on disk. */
export type FileVerdict = 'same' | 'outdated' | 'edited' | 'missing' | 'unknown';

export interface FileReport {
  file: string;
  verdict: FileVerdict;
  /** the one line the report prints beside it */
  why: string;
}

export interface UpgradeReport {
  /** false when `kai.json` carries no baseline, which is what makes `--write` refuse */
  baseline: boolean;
  files: FileReport[];
  /** files the baseline recorded that today's template does not emit */
  dropped: string[];
  /** the kit range the project was written with, versus the range this CLI pins now */
  kit: { recorded: string; current: string };
}

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

interface KaiJsonLike extends Record<string, unknown> {
  framework?: unknown;
  layout?: unknown;
  widgetStyle?: unknown;
  features?: unknown;
  gateway?: unknown;
  kit?: unknown;
  kitBuiltAgainst?: unknown;
  files?: unknown;
}

const readJson = (file: string): Record<string, unknown> | undefined => {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

/** A `ProjectPlan` rebuilt from what `kai.json` + the project's own manifest say. */
function planFrom(kai: KaiJsonLike, dir: string, name: string) {
  return {
    dir,
    name,
    frameworkId: String(kai.framework),
    layout: kai.layout as Layout,
    widgetStyle: (kai.widgetStyle ?? null) as WidgetStyle | null,
    featureIds: Array.isArray(kai.features) ? (kai.features as string[]) : [],
    gatewayId: String(kai.gateway),
    kit: String(kai.kit),
    kitBuiltAgainst: String(kai.kitBuiltAgainst),
  };
}

export interface UpgradePlan {
  report: UpgradeReport;
  /** the rendered content of every emitted file, in memory, so the write phase cannot re-render */
  rendered: Record<string, string>;
}

/**
 * Compare a scaffolded project against what this CLI would emit for it today. Writes NOTHING into
 * `cwd`: the render goes to a temp directory that is removed before returning, so a plan is a read.
 */
export async function planUpgrade(env: UpgradeEnv): Promise<UpgradePlan | { error: string }> {
  const kaiPath = path.join(env.cwd, 'kai.json');
  if (!existsSync(kaiPath)) {
    return {
      error:
        `no kai.json in ${env.cwd}. \`upgrade\` re-diffs what the SCAFFOLDER wrote, so it needs that record; ` +
        `a hand-built project has nothing to re-diff (see \`kai init\` and \`kai doctor\`).`,
    };
  }
  const kai = readJson(kaiPath) as KaiJsonLike | undefined;
  if (kai === undefined) return { error: 'kai.json is not readable JSON.' };

  const name = (readJson(path.join(env.cwd, 'package.json'))?.name as string | undefined) ?? 'app';
  const sandbox = mkdtempSync(path.join(tmpdir(), 'kai-upgrade-'));
  const rendered: Record<string, string> = {};
  let emitted: string[];
  try {
    const result = await generate(planFrom(kai, sandbox, name), {
      templateRoot: env.templateRoot ?? defaultTemplateRoot(),
    });
    emitted = result.files;
    for (const file of emitted) rendered[file] = readFileSync(path.join(sandbox, file), 'utf8');
  } catch (error) {
    return {
      error:
        `this CLI cannot re-emit the project kai.json describes: ` +
        `${error instanceof Error ? error.message : String(error)}. That usually means the framework or gateway ` +
        `in kai.json is not one this CLI still carries.`,
    };
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }

  const baseline = kai.files !== null && typeof kai.files === 'object' ? (kai.files as Record<string, string>) : null;
  const files: FileReport[] = [];
  for (const file of emitted) {
    const templateText = rendered[file];
    const target = path.join(env.cwd, file);
    if (!existsSync(target)) {
      files.push({ file, verdict: 'missing', why: 'the template emits this and your project does not have it' });
      continue;
    }
    const projectText = readFileSync(target, 'utf8');
    if (projectText === templateText) {
      files.push({ file, verdict: 'same', why: 'already identical to what this CLI emits' });
      continue;
    }
    const recorded = baseline?.[file];
    if (baseline === null) {
      files.push({
        file,
        verdict: 'unknown',
        why: 'differs from the template, and this project has no baseline to tell your edit from a template change',
      });
      continue;
    }
    if (recorded === undefined) {
      files.push({ file, verdict: 'unknown', why: 'differs from the template and is not in the baseline' });
      continue;
    }
    files.push(
      recorded === sha256(projectText)
        ? { file, verdict: 'outdated', why: 'untouched since scaffolding, so the template moved' }
        : { file, verdict: 'edited', why: 'YOU edited this since scaffolding; left alone' },
    );
  }

  const emittedSet = new Set(emitted);
  return {
    report: {
      baseline: baseline !== null,
      files,
      dropped: baseline === null ? [] : Object.keys(baseline).filter((file) => !emittedSet.has(file)).sort(),
      kit: { recorded: String(kai.kit), current: env.kitRange },
    },
    rendered,
  };
}

/** The files `--write` is allowed to touch, and never any other. */
export const writableFiles = (report: UpgradeReport): string[] =>
  report.baseline
    ? report.files.filter((f) => f.verdict === 'outdated' || f.verdict === 'missing').map((f) => f.file)
    : [];

const MARK: Record<FileVerdict, string> = { same: '=', outdated: '^', edited: '!', missing: '+', unknown: '?' };

/** Print a report. Returns the files `--write` would replace. */
export function renderReport(report: UpgradeReport, out: (line: string) => void = console.log): string[] {
  for (const finding of report.files) {
    if (finding.verdict === 'same') continue;
    out(`${MARK[finding.verdict]} ${finding.file}  ${finding.why}`);
  }
  if (report.dropped.length > 0) {
    out('');
    out(`· the template no longer emits ${report.dropped.length} file(s) your project has, and nothing was deleted:`);
    for (const file of report.dropped) out(`    ${file}`);
  }
  if (report.kit.recorded !== report.kit.current) {
    out('');
    out(`· kit range: your project pins ${report.kit.recorded}, and this CLI pins ${report.kit.current}`);
  }

  const counts = report.files.reduce<Record<string, number>>((acc, f) => {
    acc[f.verdict] = (acc[f.verdict] ?? 0) + 1;
    return acc;
  }, {});
  const writable = writableFiles(report);
  out('');
  out(
    `  ${counts.outdated ?? 0} outdated, ${counts.missing ?? 0} missing, ${counts.edited ?? 0} edited by you, ` +
      `${counts.unknown ?? 0} undecidable, ${counts.same ?? 0} already current`,
  );
  if (!report.baseline) {
    out(`  No baseline in kai.json (it predates the field), so --write refuses. Only the recorded hashes`);
    out(`  can tell your edit from a template change; reconcile these by hand, or re-scaffold.`);
  } else if (writable.length > 0) {
    out(`  --write replaces ${writable.length} file(s): the outdated and the missing. Never one you edited.`);
  } else {
    out(`  nothing to do`);
  }
  return writable;
}

export const UPGRADE_HELP = `
create-kai upgrade — bring a scaffolded project up to the template this CLI emits

  npx -y @kitn.ai/cli upgrade [--write] [--strict] [--json]

It re-renders what the SCAFFOLDER wrote for this project's own recorded options, in a temp
directory, and compares that against your files:

  ^  outdated   untouched since scaffolding, so the template moved   (--write replaces it)
  +  missing    the template emits this and you do not have it       (--write adds it)
  !  edited     YOU edited this since scaffolding                    (never touched)
  ?  unknown    differs, and there is no baseline to say whose change it is
  =  same       already current

A kai.json from before the baseline existed has no recorded hashes, so it reports the drift
and refuses to write: nothing can tell your edit from a template change.

Options
  --write    replace the outdated and the missing files (never one you edited)
  --strict   exit non-zero when there is drift, for CI
  --json     the report as JSON, for a CI job or an agent
  -h, --help this
`;

export async function runUpgrade(argv: readonly string[], env: UpgradeEnv): Promise<number> {
  if (argv.includes('-h') || argv.includes('--help')) {
    env.out(UPGRADE_HELP);
    return 0;
  }
  const write = argv.includes('--write');
  const json = argv.includes('--json');
  const strict = argv.includes('--strict');
  for (const arg of argv) {
    if (!['--write', '--json', '--strict'].includes(arg)) {
      env.error(`create-kai upgrade: unknown argument ${arg}`);
      env.error(UPGRADE_HELP);
      return 1;
    }
  }

  const planned = await planUpgrade(env);
  if ('error' in planned) {
    env.error(`create-kai upgrade: ${planned.error}`);
    return 1;
  }
  const { report, rendered } = planned;
  const writable = writableFiles(report);

  const wrote: string[] = [];
  if (write && writable.length > 0) {
    for (const file of writable) {
      writeFileSync(path.join(env.cwd, file), rendered[file]);
      wrote.push(file);
    }
  }

  if (json) {
    env.out(JSON.stringify({ ...report, wrote }, null, 2));
    return strict && writable.length > 0 ? 1 : 0;
  }

  if (write && writable.length > 0 && report.baseline) {
    // The plan first, then what was done, so a reader can see what the write was based on.
    renderReport(report, env.out);
    env.out('');
    for (const file of wrote) env.out(`wrote ${file}`);
  } else {
    renderReport(report, env.out);
  }
  return strict && writable.length > 0 ? 1 : 0;
}
