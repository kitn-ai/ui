/**
 * GUARD — `verify-guide-fences` still DETECTS, and the required CI graph still runs it.
 *
 * The gate compiles the assistant block's seed-guide `ts` fences against the kit's
 * shipped declarations. It exists because those fences are STRING LITERALS inside
 * `assistant.transport.mock.ts`: no typecheck, lint or docs gate in this repo can
 * see a curated conversation that teaches a prop the kit removed, and a reader who
 * copies it gets a build failure in their own app.
 *
 * WHY A WIRING TEST AND NOT JUST THE GATE. Two ways this gate stops working while
 * looking like it works, and neither is visible from the gate's own green:
 *
 *   1. It runs nowhere automatic. A guard nobody invokes is coverage in a
 *      green run and nothing on a merge.
 *   2. It reports instead of failing, which is the tempting edit for anyone who
 *      meets a finding — and the reason the second case below runs a PLANTED
 *      defect through the real script rather than trusting it to be strict.
 *
 * THE PLANTED DEFECT is the one that matters: the kit export renamed inside a
 * single fence, through `--mock <path>` against a copy in the OS temp dir. The gate
 * must exit non-zero AND say which guide and which line, because a gate that cannot
 * name its subject sends the reader to four guides and a thousand lines. The
 * contract it is checked against is derived — the export is read out of the fence
 * it appears in — so a reworded guide fails here loudly rather than testing nothing.
 *
 * The run costs one consumer sandbox and two tsc programs (~2s), which is why the
 * gate is a script with its own CI step rather than a test in the jsdom project.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requiredGateBlock } from './lib/required-gate-block';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = resolve(pkgRoot, '../..');
const WORKFLOW = resolve(repoRoot, '.github/workflows/test.yml');
const SCRIPT = 'scripts/verify-guide-fences.mjs';
const NPM_SCRIPT = 'verify:guide-fences';
const MOCK = resolve(repoRoot, 'packages/blocks/blocks/assistant/assistant.transport.mock.ts');

const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf-8')) as {
  scripts: Record<string, string>;
};

function runGuard(args: string[] = []): { code: number; output: string } {
  try {
    const stdout = execFileSync('node', [resolve(pkgRoot, SCRIPT), ...args], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: pkgRoot,
    });
    return { code: 0, output: stdout };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? -1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

describe('the guide-fence gate detects, and the merge gate runs it', () => {
  it('ships the gate', () => {
    expect(existsSync(resolve(pkgRoot, SCRIPT)), `${SCRIPT} is missing`).toBe(true);
  });

  it(`\`${NPM_SCRIPT}\` runs it`, () => {
    const cmd = pkg.scripts[NPM_SCRIPT];
    expect(cmd, `no \`${NPM_SCRIPT}\` script in packages/ui/package.json`).toBeTruthy();
    expect(cmd, `\`${NPM_SCRIPT}\` no longer runs ${SCRIPT}`).toContain(SCRIPT);
  });

  it('is invoked by the REQUIRED `test` graph in CI', () => {
    const block = requiredGateBlock(readFileSync(WORKFLOW, 'utf-8'));
    // Two vacuity guards, answering different questions: the empty check catches a
    // renamed root job, and the canary catches a graph that stopped reaching the
    // job this gate needs the kit build from.
    expect(block, `no \`test:\` job found in ${WORKFLOW}`).not.toBe('');
    expect(block, 'the required graph no longer runs the guide-fence gate').toContain(NPM_SCRIPT);
    expect(
      block,
      'the required graph no longer runs the scaffolder compile gate either — this gate reuses that ' +
        "harness and the same job's artifact, so read this guard before moving it",
    ).toContain('verify:scaffold');
  });

  it('passes on the guides as they stand, so the failures below mean something', () => {
    const { code, output } = runGuard();
    expect(code, `the gate failed a tree it should pass: ${output}`).toBe(0);
    expect(output, 'the gate printed no inventory of what it compiled').toContain('guides ·');
  });

  it('fails NAMING the guide and the line when a fence names an export the kit does not have', () => {
    // The mutation is a rename inside one fence, taken from the fence itself rather
    // than typed here: a guide that stops importing this name must fail this test
    // rather than passing over a rename that no longer applies.
    const source = readFileSync(MOCK, 'utf-8');
    const carrier = 'readOpenAIStream, readAnthropicStream,';
    expect(
      source.includes(carrier),
      `${MOCK} no longer carries the import fence this plant mutates ("${carrier}") — re-point the plant at ` +
        'whatever the guides name now instead of deleting this case',
    ).toBe(true);

    const dir = mkdtempSync(join(tmpdir(), 'guide-fences-plant-'));
    const planted = join(dir, 'assistant.transport.mock.ts');
    writeFileSync(planted, source.replace('readAnthropicStream,', 'readAnthropicStreamRenamed,'));

    const { code, output } = runGuard(['--mock', planted]);
    expect(code, 'the gate exited 0 over a fence naming an export the kit does not export').not.toBe(0);
    expect(output, 'the failure does not name the guide that carries the renamed export').toContain(
      'which provider does this use? i want to point it at openrouter.',
    );
    expect(output, 'the failure does not name the fence').toContain('fence 1');
    expect(output, 'the failure does not name the line inside the fence').toMatch(/fence 1 line \d+/);
    expect(output, 'the failure does not quote the compiler').toContain('readAnthropicStreamRenamed');
  });

  it('treats a guide set with no fences as a hard failure, not a pass', () => {
    const dir = mkdtempSync(join(tmpdir(), 'guide-fences-empty-'));
    const empty = join(dir, 'assistant.transport.mock.ts');
    writeFileSync(empty, readFileSync(MOCK, 'utf-8').replaceAll('```ts', '```text'));

    const { code, output } = runGuard(['--mock', empty]);
    expect(code, 'a tree with zero compilable fences exited 0, which reads as "the guides are fine"').not.toBe(0);
    expect(output).toContain('ZERO `ts` fences');
  });
});
