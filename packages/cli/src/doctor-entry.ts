/** Build entry for dist/doctor.es.js (the `doctor` target in config/vite/node.ts).
 *
 *  Unlike the construct CLI's entry, this one does NOT run itself on import: `kai doctor`
 *  reaches it through `bin/kai.js`, which passes the flags and takes the exit code. Keeping
 *  process handling in the bin is the same split mcp/stdio.ts and cli-entry.ts use, and here it
 *  also means the module is importable by the tests that drive `diagnose()` directly.
 */
import { readFileSync } from 'node:fs';
import { diagnose, exitCodeFor, render } from './doctor';

/** This CLI's own version, from the manifest that ships beside this bundle's dist/. */
function cliVersion(): string {
  try {
    return (
      (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version?: string })
        .version ?? 'unknown'
    );
  } catch {
    return 'unknown';
  }
}

/**
 * `kai doctor [--json] [--strict]`. Returns the exit code; the caller owns `process.exitCode`.
 *
 * `--strict` promotes warnings to failures, for a CI job that wants the rule matches to block it.
 *
 * `--json` exists for the same reason the other tools' flags do: a CI job or an agent may want
 * the findings without parsing the human rendering, and the JSON is the findings themselves
 * rather than a second, hand-maintained shape.
 */
export async function runDoctor(
  argv: string[] = [],
  io: { out?: (line: string) => void; cwd?: string } = {},
): Promise<number> {
  const findings = diagnose({
    cwd: io.cwd ?? process.cwd(),
    cliVersion: cliVersion(),
    builtAgainstKit: __KIT_VERSION__,
  });
  const strict = argv.includes('--strict');
  if (argv.includes('--json')) {
    (io.out ?? console.log)(JSON.stringify({ findings, strict }, null, 2));
    return exitCodeFor(findings, { strict });
  }
  return render(findings, io.out, { strict });
}
