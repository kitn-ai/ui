import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { decideEntry, CONSTRUCT_COMMANDS, KNOWN_COMMANDS } from './route.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const binPath = join(__dirname, 'kai.js');
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

describe('package.json bin map (pure)', () => {
  it('exposes exactly one bin, `kai` — the name a human types', () => {
    // ONE bin on purpose: the MCP server is its own package (@kitn.ai/mcp, bin kai-mcp), so this
    // package's install weight does not include the MCP SDK. A second bin here would put it back.
    expect(Object.keys(pkg.bin)).toEqual(['kai']);
    expect(pkg.bin.kai).toBe('./bin/kai.js');
  });

  it('keeps the MCP SDK out of this package, which is the whole reason for the split', () => {
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain('@modelcontextprotocol/sdk');
    expect(Object.keys(pkg.dependencies ?? {})).toContain('create-kai');
    // The kit is a BUILD input (the construct bundle is built from ui's sources) and the bundle
    // imports nothing from it at runtime, so it must NOT be a runtime dependency: declaring it
    // as one is what made the old package resolve a published copy instead of this tree.
    expect(pkg.devDependencies['@kitn.ai/ui']).toBe('workspace:*');
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain('@kitn.ai/ui');
  });
});

describe('decideEntry (pure routing decision)', () => {
  it('no args -> help, so a bare `kai` teaches instead of starting something', () => {
    expect(decideEntry(undefined)).toEqual({ kind: 'help' });
  });

  it.each(['help', '--help', '-h'])('%s -> help', (flag) => {
    expect(decideEntry(flag)).toEqual({ kind: 'help' });
  });

  it.each(['version', '--version', '-v'])('%s -> version', (flag) => {
    expect(decideEntry(flag)).toEqual({ kind: 'version' });
  });

  it('"create" forwards to create-kai with its arguments untouched', () => {
    expect(decideEntry('create', ['my-app', '--framework', 'react'])).toEqual({
      kind: 'forward',
      pkg: 'create-kai',
      args: ['my-app', '--framework', 'react'],
    });
  });

  it('"add" forwards to create-kai WITH the verb, because that is how its own CLI spells it', () => {
    expect(decideEntry('add', ['support-widget'])).toEqual({
      kind: 'forward',
      pkg: 'create-kai',
      args: ['add', 'support-widget'],
    });
  });

  it('"mcp" forwards to the MCP package with no arguments (the server takes none)', () => {
    expect(decideEntry('mcp')).toEqual({ kind: 'forward', pkg: '@kitn.ai/mcp', args: [] });
  });

  it('"doctor" is LOCAL: its bundle ships in this package', () => {
    expect(decideEntry('doctor')).toEqual({ kind: 'local', verb: 'doctor' });
  });

  it.each(CONSTRUCT_COMMANDS)('%s -> local construct bundle', (cmd) => {
    expect(decideEntry(cmd)).toEqual({ kind: 'local', verb: 'construct' });
  });

  it("unknown/typo'd command -> error naming the valid commands", () => {
    const decision = decideEntry('frobnicate');
    expect(decision.kind).toBe('error');
    for (const known of KNOWN_COMMANDS) {
      expect(decision.message).toContain(known);
    }
  });
});

describe('bin/kai.js dispatcher (spawned, real process)', () => {
  const run = (args) => {
    try {
      const stdout = execFileSync('node', [binPath, ...args], {
        timeout: 10_000,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { status: 0, stdout, stderr: '' };
    } catch (err) {
      return { status: err.status, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
    }
  };

  it('unknown subcommand exits 2 with stderr naming valid commands, never falling through', () => {
    const { status, stderr } = run(['frobnicate']);
    expect(status).toBe(2);
    expect(stderr).toMatch(/valid commands/i);
  });

  it("a typo'd valid-ish command (validat) also exits 2, not a hang", () => {
    const { status, stderr } = run(['validat']);
    expect(status).toBe(2);
    expect(stderr).toMatch(/valid commands/i);
  });

  it('`kai --version` prints this package\'s own version, read from the manifest beside it', () => {
    const { status, stdout } = run(['--version']);
    expect(status).toBe(0);
    expect(stdout.trim()).toBe(pkg.version);
  });

  it('`kai --help` lists every verb, including the ones that forward to another package', () => {
    const { status, stdout } = run(['--help']);
    expect(status).toBe(0);
    for (const verb of KNOWN_COMMANDS) expect(stdout).toContain(verb);
  });

  it('a forward whose target package is MISSING says so and names the fix, rather than failing obscurely', () => {
    // Run from a copy of the two bin files in a temp dir, so Node's resolution finds NO
    // node_modules anywhere above it. In THIS workspace the sibling packages are hoisted into the
    // root node_modules and a forward resolves, which is the path the other tests cover; this one
    // needs the absent case, and a fake install is the only honest way to get it.
    const dir = mkdtempSync(join(tmpdir(), 'kai-bin-'));
    for (const file of ['kai.js', 'route.js']) copyFileSync(join(__dirname, file), join(dir, file));
    let status = 0;
    let stderr = '';
    try {
      execFileSync('node', [join(dir, 'kai.js'), 'mcp'], { timeout: 10_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      status = err.status;
      stderr = err.stderr ?? '';
    }
    expect(status).toBe(2);
    expect(stderr).toMatch(/@kitn\.ai\/mcp is not installed/);
    expect(stderr).toMatch(/npx -y @kitn\.ai\/mcp/);
  });
});
