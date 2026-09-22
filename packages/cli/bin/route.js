// Pure command routing for the `kai` bin, extracted so it can be tested without
// spawning a process or reading the filesystem. `bin/kai.js` does the actual work
// based on what this returns.
//
// THREE KINDS OF VERB, and the distinction is the whole design:
//
//   'local'      -- a bundle inside THIS package. dev/compile/eject/validate are the
//                   construct engine; doctor is the wiring diagnosis.
//   'forward'    -- a SEPARATE published program, launched by resolving that package's
//                   bin and spawning it with this process's stdio. create/add/init are
//                   `create-kai`'s (the same implementation `npm create kai` runs), and
//                   mcp is `@kitn.ai/mcp`'s server. They are
//                   not bundled into this package because neither belongs to its install
//                   weight: create-kai is the scaffolder npm's own `create` convention
//                   reaches, and the MCP is the only thing carrying the 5.9 MB SDK.
//   'error'      -- anything else. A typo must never fall through to a server or a verb
//                   that does the wrong thing; it names the valid commands instead.
//
// `mcp` stays a verb even though the server is its own package, so `kai --help` remains
// the complete surface and a harness config can still say `kai mcp` once both packages
// are installed. When @kitn.ai/mcp is absent the forwarder says so and names the one-line
// fix rather than failing obscurely.

export const CONSTRUCT_COMMANDS = ['dev', 'compile', 'eject', 'validate'];

/** Verbs a human types, whether or not the target package is installed. */
export const KNOWN_COMMANDS = [
  'create',
  'add',
  'init',
  'upgrade',
  'doctor',
  'mcp',
  ...CONSTRUCT_COMMANDS,
];

/**
 * @param {string | undefined} command
 * @returns {{ kind: 'local', verb: string }
 *          | { kind: 'forward', pkg: string, args: string[] }
 *          | { kind: 'help' }
 *          | { kind: 'version' }
 *          | { kind: 'error', message: string }}
 */
export function decideEntry(command, rest = []) {
  if (command === undefined || command === 'help' || command === '--help' || command === '-h') {
    return { kind: 'help' };
  }
  if (command === 'version' || command === '--version' || command === '-v') {
    return { kind: 'version' };
  }
  // `kai create [dir]` and `kai add <block>` are create-kai's verbs, unchanged: the
  // wizard is the from-scratch door, `add` the into-an-existing-project door.
  if (command === 'create') return { kind: 'forward', pkg: 'create-kai', args: rest };
  if (command === 'add') return { kind: 'forward', pkg: 'create-kai', args: ['add', ...rest] };
  // `init` makes an EXISTING project kai-aware: it merges the dependency and prints the wiring.
  if (command === 'init') return { kind: 'forward', pkg: 'create-kai', args: ['init', ...rest] };
  // `upgrade` re-diffs a scaffolded project against the template this CLI emits; it replaces the
  // files the user never touched and reports the ones they did.
  if (command === 'upgrade') return { kind: 'forward', pkg: 'create-kai', args: ['upgrade', ...rest] };
  if (command === 'mcp') return { kind: 'forward', pkg: '@kitn.ai/mcp', args: [] };
  if (command === 'doctor') return { kind: 'local', verb: 'doctor' };
  if (CONSTRUCT_COMMANDS.includes(command)) return { kind: 'local', verb: 'construct' };
  return {
    kind: 'error',
    message: `unknown command "${command}" — valid commands: ${KNOWN_COMMANDS.join(', ')}`,
  };
}
