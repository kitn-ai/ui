/**
 * `kai doctor`: diagnose ONE project's @kitn.ai/ui wiring. Read-only, offline, no network.
 *
 * WHAT IT IS FOR. The MCP's `debug` tool answers a DIFFERENT question for an AGENT -- it matches a
 * pasted snippet against a rule set -- and the two are complementary rather than the same check
 * phrased twice (measured: `debug` takes a snippet string, this reads a project off disk). What
 * they share is the RULE SET, imported from `mcp/mcp/tools/debug-rules.ts` and run here over the
 * project's own sources. And this adds the one fact an agent cannot see:
 * whether the `kai` in your PATH was built against an older kit than the app has. That is the
 * useful half of the "CLI vs kit skew" question -- a self-update verb would be a global-install
 * footgun, while REPORTING the skew is a fact somebody can act on.
 *
 * IT DECIDES LOUDLY, WHICH IS WHY IT HAS SEVERITIES AND AN EXIT CODE. `error` means something is
 * broken and the process exits 1; `warn` means the wiring is probably not what the user wants;
 * `info` records a normal state that a reader might mistake for a problem. A doctor that printed
 * everything at one level would make the user decide what matters, which is the job it exists to
 * do for them.
 *
 * EVERYTHING COMES FROM THE FILESYSTEM, never from the network: the project's package.json, its
 * `node_modules`, its `kai.json`, and its own source tree. A doctor that phoned home would be
 * useless in the one place people run it (CI, a fresh clone) and would make the "is the registry
 * reachable" question the user's problem.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
// The MCP `debug` tool's rule set, imported from the kit's sources: the rules encode the classic
// kai-* mistakes (sourced from for-ai-agents.mdx and context7.json), and until now ONLY the agent
// could reach them. The module imports nothing -- no zod, no SDK -- so bundling it here costs the
// rules and nothing else. See its own docblock.
import { matchRules } from '../../ui/mcp/mcp/tools/debug-rules';

const KIT = '@kitn.ai/ui';
const MCP = '@kitn.ai/mcp';
const KAI_JSON = 'kai.json';

export type Severity = 'ok' | 'info' | 'warn' | 'error';

export interface Finding {
  severity: Severity;
  title: string;
  detail?: string;
}

export interface DoctorInput {
  /** the project to diagnose */
  cwd: string;
  /** this CLI's own version, read from its manifest */
  cliVersion: string;
  /** the kit this CLI was BUILT against (`__KIT_VERSION__`) */
  builtAgainstKit: string;
}

function readJson(file: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/**
 * `-1` when `a` is older than `b`, `0` equal, `1` newer. VERSION-TO-VERSION only.
 *
 * Deliberately not a range parser: the other question ("what is the lower bound of this range,
 * and does the workspace still match it") belongs to the workspace-range guard in scripts/, and a
 * half-implemented semver shared by both would be worse than two small functions that each do
 * one thing. A prerelease tag sorts below the release it precedes.
 */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) => v.split(/[.+-]/).map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const left = parts(a);
  const right = parts(b);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l === r) continue;
    if (typeof l !== typeof r) return typeof l === 'number' ? 1 : -1;
    return l < r ? -1 : 1;
  }
  return 0;
}

/**
 * Source files under `dir`, capped and skipping build output and dependencies. The cap is a
 * guard against being pointed at a monorepo root by accident: this walk exists to answer "does
 * anything import the kit", and a full recursive scan of an unrelated tree would take seconds to
 * answer a question nobody asked.
 */
function sourceFiles(dir: string, limit = 400): string[] {
  const out: string[] = [];
  const skip = new Set(['node_modules', 'dist', 'build', '.git', '.next', '.svelte-kit', 'coverage', '.astro', '.output']);
  const walk = (current: string) => {
    if (out.length >= limit) return;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= limit) return;
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) walk(join(current, entry.name));
      } else if (/\.(?:[cm]?[jt]sx?|mdx?|astro|svelte|vue|html|css)$/.test(entry.name)) {
        out.push(join(current, entry.name));
      }
    }
  };
  if (statSync(dir, { throwIfNoEntry: false })?.isDirectory()) walk(dir);
  return out;
}

/**
 * The drift `kai.json`'s BASELINE records, read without rendering anything.
 *
 * `kai upgrade` re-renders the project with the current templates and can therefore say what the
 * template would change; this says the cheaper half at the same time -- which of the files the
 * scaffolder wrote are no longer what it wrote -- because a hash comparison needs no template at
 * all. That is the difference between the two verbs: this is the fact, `upgrade` is the diff. Both
 * read the SAME recorded hashes, so they cannot disagree about what counts as untouched.
 */
function baselineDrift(cwd: string, files: Record<string, string>): { changed: string[]; gone: string[]; same: number } {
  const changed: string[] = [];
  const gone: string[] = [];
  let same = 0;
  for (const [file, recorded] of Object.entries(files)) {
    let text: string;
    try {
      text = readFileSync(join(cwd, file), 'utf8');
    } catch {
      gone.push(file);
      continue;
    }
    if (createHash('sha256').update(text, 'utf8').digest('hex') === recorded) same += 1;
    else changed.push(file);
  }
  return { changed: changed.sort(), gone: gone.sort(), same };
}

const readAll = (files: string[]): { file: string; text: string }[] =>
  files.flatMap((file) => {
    try {
      return [{ file, text: readFileSync(file, 'utf8') }];
    } catch {
      return [];
    }
  });

/** Every finding about one project, in the order a reader wants them. */
export function diagnose(input: DoctorInput): Finding[] {
  const findings: Finding[] = [];
  const manifest = readJson(join(input.cwd, 'package.json'));
  if (!manifest) {
    return [
      {
        severity: 'error',
        title: `no package.json in ${input.cwd}`,
        detail: 'kai doctor diagnoses a project, so run it from the project root.',
      },
    ];
  }

  findings.push({
    severity: 'ok',
    title: `kai ${input.cliVersion}`,
    detail: `this CLI was built against @kitn.ai/ui ${input.builtAgainstKit}`,
  });

  const deps = (manifest.dependencies ?? {}) as Record<string, string>;
  const devDeps = (manifest.devDependencies ?? {}) as Record<string, string>;
  const declared = deps[KIT] ?? devDeps[KIT];
  if (declared === undefined) {
    findings.push({
      severity: 'warn',
      title: `this project does not depend on ${KIT}`,
      detail: 'nothing in package.json declares it, so the components cannot be imported yet.',
    });
  } else {
    findings.push({ severity: 'ok', title: `${KIT} is declared as ${declared}` });
  }

  const installed = readJson(join(input.cwd, 'node_modules', KIT, 'package.json'));
  const installedVersion = typeof installed?.version === 'string' ? installed.version : undefined;
  if (declared !== undefined && installedVersion === undefined) {
    findings.push({
      severity: 'error',
      title: `${KIT} is declared but not installed`,
      detail: "run your package manager's install (npm install / pnpm install / yarn).",
    });
  } else if (installedVersion !== undefined) {
    findings.push({ severity: 'ok', title: `${KIT} ${installedVersion} is installed` });
    const cmp = compareVersions(installedVersion, input.builtAgainstKit);
    if (cmp < 0) {
      findings.push({
        severity: 'warn',
        title: `this project's kit (${installedVersion}) is older than the kit this CLI was built against (${input.builtAgainstKit})`,
        detail: 'upgrade the kit, or install a CLI that matches it.',
      });
    } else if (cmp > 0) {
      findings.push({
        severity: 'info',
        title: `this project's kit (${installedVersion}) is newer than the one this CLI was built against (${input.builtAgainstKit})`,
        detail: "the CLI's own commands may lag the API it is describing; a newer CLI would match.",
      });
    }
  }

  const kaiJson = readJson(join(input.cwd, KAI_JSON));
  if (kaiJson) {
    const framework = kaiJson.framework ?? '?';
    const built = kaiJson.kitBuiltAgainst ?? '?';
    const features = Array.isArray(kaiJson.features) ? kaiJson.features.join(', ') : '?';
    findings.push({
      severity: 'ok',
      title: `${KAI_JSON}: framework ${framework}, features ${features}`,
      detail: `scaffolded against kit ${built}`,
    });

    // THE BASELINE, read the cheap way: the recorded hashes against the files on disk, no render.
    // Drift here is INFORMATION rather than a warning -- editing your own app is the normal case,
    // and `upgrade --strict` is where somebody decides it should fail a build.
    const baseline = kaiJson.files;
    if (baseline !== null && typeof baseline === 'object' && Object.keys(baseline).length > 0) {
      const files = baseline as Record<string, string>;
      const { changed, gone, same } = baselineDrift(input.cwd, files);
      if (changed.length === 0 && gone.length === 0) {
        findings.push({
          severity: 'ok',
          title: `${KAI_JSON}'s baseline: all ${same} scaffolded file(s) are exactly as written`,
        });
      } else {
        const names = [...changed, ...gone];
        const shown = names.slice(0, 3).join(', ');
        const more = names.length > 3 ? ` (and ${names.length - 3} more)` : '';
        findings.push({
          severity: 'info',
          title:
            `${KAI_JSON}'s baseline: ${same} of ${Object.keys(files).length} scaffolded file(s) are as written, ` +
            `${changed.length} changed, ${gone.length} gone`,
          detail:
            `${shown}${more}\nRun \`kai upgrade\` to see what the template this CLI emits would change ` +
            `(it replaces only the files you never touched), or \`kai upgrade --strict\` in CI.`,
        });
      }
    } else {
      findings.push({
        severity: 'info',
        title: `${KAI_JSON} has no baseline`,
        detail:
          'it predates the recorded hashes, so this cannot tell your edits from a template change. ' +
          '`kai upgrade` still diffs the project against the template this CLI emits, and will not write without a baseline.',
      });
    }
  } else {
    findings.push({
      severity: 'info',
      title: `no ${KAI_JSON}`,
      detail: 'this project was not scaffolded with `npm create kai`, which is fine for a hand-built app: nothing here depends on it.',
    });
  }

  if (declared !== undefined) {
    const files = sourceFiles(join(input.cwd, 'src'));
    const contents = readAll(files);
    const referencing = contents.filter((c) => c.text.includes(KIT)).length;
    if (files.length > 0 && referencing === 0) {
      findings.push({
        severity: 'warn',
        title: `nothing under src/ references ${KIT}`,
        detail: 'the dependency is declared but unused, so no chat surface is rendering.',
      });
    } else if (referencing > 0) {
      findings.push({ severity: 'ok', title: `${referencing} file(s) under src/ reference ${KIT}` });
    }
    // THE MCP debug TOOL'S RULES, over this project's own sources. The rules are the asset the
    // agent-facing tool was built around and the human-facing verb could not reach; `matchRules` is
    // one implementation both call, so a rule added for the agent shows up here the same day.
    //
    // A rule's `test` is a boolean over a whole text, so the report names FILES rather than lines:
    // the tool has never carried match offsets, and inventing them by re-running someone else's
    // regex would be a second implementation of the rule. Up to three files per rule, then a count.
    const hitByRule = new Map();
    for (const { file, text } of contents) {
      for (const rule of matchRules(text)) {
        if (!hitByRule.has(rule.id)) hitByRule.set(rule.id, { rule, files: [] });
        hitByRule.get(rule.id).files.push(relative(input.cwd, file));
      }
    }
    for (const { rule, files: hits } of hitByRule.values()) {
      const shown = hits.slice(0, 3).join(', ');
      const more = hits.length > 3 ? ` (and ${hits.length - 3} more file(s))` : '';
      findings.push({
        severity: 'warn',
        title: `${rule.title} — ${hits.length} file(s) under src/`,
        detail: `${shown}${more}\n${rule.fix}`,
      });
    }

    const styled = contents.some((c) => /theme\.tokens\.css|theme\.css|solid\.css/.test(c.text));
    if (files.length > 0 && !styled) {
      findings.push({
        severity: 'info',
        title: 'no kit stylesheet is referenced',
        detail: 'import @kitn.ai/ui/theme.tokens.css (or theme.css inside a Tailwind build), or the components render unstyled.',
      });
    }
  }

  const mcp = readJson(join(input.cwd, 'node_modules', MCP, 'package.json'));
  findings.push(
    mcp
      ? { severity: 'ok', title: `${MCP} ${String(mcp.version)} is installed locally` }
      : {
          severity: 'info',
          title: `${MCP} is not installed in this project`,
          detail: 'normal: an MCP client config runs it as `npx -y @kitn.ai/mcp`, so it needs no local install.',
        },
  );

  return findings;
}

/**
 * The exit code a doctor run implies: 1 when something is broken, 0 otherwise.
 *
 * `strict` makes WARNINGS fail too, which is the caller's decision rather than ours -- the kit
 * decides how a finding is classified, the app decides whether it blocks a build. A `warn` is
 * deliberately not an error by default: the rule set matches PATTERNS, and a project's source may
 * legitimately contain a snippet (a doc example, a fixture) that looks like the mistake. `--strict`
 * is the flag for a CI job that would rather be wrong loudly than quiet.
 */
export function exitCodeFor(findings: Finding[], { strict = false } = {}): number {
  if (findings.some((f) => f.severity === 'error')) return 1;
  if (strict && findings.some((f) => f.severity === 'warn')) return 1;
  return 0;
}

const MARK: Record<Severity, string> = { ok: '✓', info: '·', warn: '!', error: '✗' };

/** Print the findings, then a summary that says what the exit code means. */
export function render(
  findings: Finding[],
  out: (line: string) => void = console.log,
  { strict = false } = {},
): number {
  for (const finding of findings) {
    out(`${MARK[finding.severity]} ${finding.title}`);
    if (finding.detail) out(`    ${finding.detail}`);
  }
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warns = findings.filter((f) => f.severity === 'warn').length;
  out('');
  out(
    errors > 0
      ? `✗ kai doctor: ${errors} problem(s)${warns > 0 ? `, ${warns} warning(s)` : ''}.`
      : strict && warns > 0
        ? `✗ kai doctor --strict: no problems, but ${warns} warning(s) fail this run.`
        : `✓ kai doctor: no problems${warns > 0 ? `, ${warns} warning(s)` : ''}.`,
  );
  return exitCodeFor(findings, { strict });
}
