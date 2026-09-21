/**
 * `kai doctor`: diagnose ONE project's @kitn.ai/ui wiring. Read-only, offline, no network.
 *
 * WHAT IT IS FOR. The MCP's `debug` tool answers the same question for an AGENT, through the
 * kit's own manifest. This is the CLI face of it, plus the one fact an agent cannot see:
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
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

const readAll = (files: string[]): string[] =>
  files.flatMap((f) => {
    try {
      return [readFileSync(f, 'utf8')];
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
    findings.push({ severity: 'ok', title: `${KAI_JSON}: framework ${framework}, features ${features}`, detail: `scaffolded against kit ${built}` });
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
    const referencing = contents.filter((text) => text.includes(KIT)).length;
    if (files.length > 0 && referencing === 0) {
      findings.push({
        severity: 'warn',
        title: `nothing under src/ references ${KIT}`,
        detail: 'the dependency is declared but unused, so no chat surface is rendering.',
      });
    } else if (referencing > 0) {
      findings.push({ severity: 'ok', title: `${referencing} file(s) under src/ reference ${KIT}` });
    }
    const styled = contents.some((text) => /theme\.tokens\.css|theme\.css|solid\.css/.test(text));
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

/** The exit code a doctor run implies: 1 when something is broken, 0 otherwise. */
export function exitCodeFor(findings: Finding[]): number {
  return findings.some((f) => f.severity === 'error') ? 1 : 0;
}

const MARK: Record<Severity, string> = { ok: '✓', info: '·', warn: '!', error: '✗' };

/** Print the findings, then a summary that says what the exit code means. */
export function render(findings: Finding[], out: (line: string) => void = console.log): number {
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
      : `✓ kai doctor: no problems${warns > 0 ? `, ${warns} warning(s)` : ''}.`,
  );
  return exitCodeFor(findings);
}
