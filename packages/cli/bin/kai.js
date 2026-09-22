#!/usr/bin/env node
// The `kai` launcher: the one command for @kitn.ai/ui's dev tooling.
//
// THREE KINDS OF VERB, and the distinction is the design (see bin/route.js):
//
//   local    dev, compile, eject, validate (the construct engine) and doctor. Their
//            bundles are in THIS package's dist/, built by config/vite/node.ts.
//   forward  create and add are `create-kai`'s, and mcp is `@kitn.ai/mcp`'s. Both are
//            separate published programs reached by resolving their bin and spawning it
//            with this process's stdio, so the prompt, the TTY and the exit code behave
//            exactly as if the user had run that program directly.
//   error    anything else, loudly, with the valid command list.
//
// WHY THE FORWARDS ARE NOT BUNDLED HERE. Measured: `@modelcontextprotocol/sdk` is 5.9 MB
// installed with 17 direct dependencies, and `dist/construct-cli.es.js` does not import the
// kit or the SDK at runtime at all. Bundling the MCP into this package would put that tree
// into the install of everyone who only wants `kai add`. And create-kai is the package
// npm's own `create` convention resolves for `npm create kai`, so its implementation has to
// stay there; forwarding keeps one implementation rather than two.
//
// A missing forward target is a LOUD failure with the one-line fix, never a silent no-op:
// a harness pointed at `kai mcp` in a project where @kitn.ai/mcp is not installed must not
// look like a server that started and then said nothing.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decideEntry, KNOWN_COMMANDS } from './route.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const require = createRequire(import.meta.url);

const HELP = `kai — the @kitn.ai/ui command line

Usage
  kai create [dir]           scaffold a project (the same wizard as \`npm create kai\`)
  kai add <block>            write a block from the registry into an existing project
  kai add --list             print the blocks this release ships
  kai init [--form <id>]     make an EXISTING project kai-aware: add the kit and print the wiring
  kai upgrade [--write]      bring a SCAFFOLDED project up to this CLI's template (never your edits)

  kai doctor                 diagnose this project's kit wiring, versions and registration
  kai doctor --strict        the same, but warnings fail the run (for CI)
  kai doctor --json          the findings, for a CI job or an agent

  kai mcp                    run the MCP server for AI coding harnesses (@kitn.ai/mcp)
  kai dev <construct.json>   live preview with reload-on-edit
  kai dev --builder          visual builder + live preview
  kai compile <c.json> [out] one self-registering .js
  kai eject <c.json> <outDir> write the generated Solid project (it's yours)
  kai validate <c.json>      check a construct, print problems with paths

Options
  -h, --help                 this
  -v, --version              print this CLI's version

Installing
  npm create kai             no install: npm resolves the create-kai package
  npx -y @kitn.ai/mcp        the MCP server alone, for an MCP client config
  npm i -g @kitn.ai/cli      kai on your PATH, for every project
  npm i -D @kitn.ai/cli      pinned per project (npx kai ...)
`;

/** This package's own version, read from the manifest that ships beside this file. */
function cliVersion() {
  try {
    return JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Resolve another package's bin from its manifest and run it with this process's stdio.
 *
 * The bin is looked up through the PACKAGE (its `bin` field), not by path arithmetic into
 * that package's internals: `bin` is the public contract, and a package that renames its
 * dist file must not break this.
 */
function spawnBin(specifier, args, verb) {
  let manifestPath;
  try {
    manifestPath = require.resolve(`${specifier}/package.json`);
  } catch {
    console.error(`[kai] ${verb}: ${specifier} is not installed, and it implements this verb.`);
    console.error(`[kai]   install it once:  npm i -g ${specifier}`);
    console.error(`[kai]   or run it without installing:  npx -y ${specifier}${verb === 'mcp' ? '' : ` ${verb}`}`);
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const binField = manifest.bin;
  const relative =
    typeof binField === 'string' ? binField : Object.values(binField ?? {})[0];
  if (!relative || typeof relative !== 'string') {
    console.error(`[kai] ${verb}: ${specifier} declares no bin, so there is nothing to run.`);
    process.exit(2);
  }
  const bin = join(dirname(manifestPath), relative);
  const child = spawn(process.execPath, [bin, ...args], { stdio: 'inherit' });
  child.on('error', (err) => {
    console.error(`[kai] ${verb}: could not start ${specifier}:`, err);
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    process.exit(signal ? 1 : (code ?? 0));
  });
}

/** Import a bundle this package built. `doctor` is called with its flags; the construct CLI
 *  parses `process.argv` itself and sets `process.exitCode`, exactly as it did under its old bin. */
async function runLocal(verb, args) {
  if (verb === 'doctor') {
    const bundle = pathToFileURL(join(PKG, 'dist', 'doctor.es.js')).href;
    try {
      const mod = await import(bundle);
      return (await mod.runDoctor(args)) ?? 0;
    } catch (err) {
      console.error('[kai] doctor: could not load dist/doctor.es.js. If you are running from a checkout, build first: npm run build');
      console.error(err);
      process.exit(1);
    }
  }
  const bundle = pathToFileURL(join(PKG, 'dist', 'construct-cli.es.js')).href;
  try {
    await import(bundle);
  } catch (err) {
    console.error(`[kai] ${verb}: could not load dist/construct-cli.es.js. If you are running from a checkout, build first: npm run build`);
    console.error(err);
    process.exit(1);
  }
  return undefined;
}

const [, , command, ...rest] = process.argv;
const decision = decideEntry(command, rest);

switch (decision.kind) {
  case 'help':
    console.log(HELP);
    break;
  case 'version':
    console.log(cliVersion());
    break;
  case 'error':
    console.error(`[kai] ${decision.message}`);
    console.error(`[kai] run \`kai --help\` for the full surface.`);
    process.exitCode = 2;
    break;
  case 'forward':
    spawnBin(decision.pkg, decision.args, command);
    break;
  case 'local': {
    // `doctor`'s own flags start after the verb; the construct CLI parses argv itself, so it
    // gets nothing from here.
    const code = await runLocal(decision.verb, decision.verb === 'doctor' ? rest : []);
    if (typeof code === 'number') process.exitCode = code;
    break;
  }
  default:
    console.error(`[kai] ${KNOWN_COMMANDS.length} verbs are defined but this one is not routed: ${decision.kind}`);
    process.exitCode = 2;
}
