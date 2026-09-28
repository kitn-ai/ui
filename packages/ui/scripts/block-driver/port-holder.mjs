// Who is holding a port — the one place that answers it.
//
// Two callers need the same answer, which is why this is a module and not four
// lines inside driver.mjs: the driver refuses to START when the port it is about
// to bind is already taken (that refusal is the stale-run tell), and serve.mjs
// reports the holder when its own bind fails. A second copy of the lookup would
// drift, and the pair of messages is exactly the pair a reader sees.
//
// lsof is the only thing here that can answer the question. A TCP connect tells
// you a port is BUSY and never BY WHOM, which is not enough to decide whether the
// holder is a stale block-driver run (kill it) or somebody else's server (route
// around it). Where lsof is absent — Windows, and a stripped container — the
// callers get an empty list and report what they CAN see instead of guessing a
// PID, so a missing tool degrades the message rather than inventing one.
import { execFileSync } from 'node:child_process';

/**
 * LISTENers on `port` as `[{ pid, args }]` — empty when the port is free, and
 * empty (not an error) when the lookup itself cannot run.
 */
export function portHolders(port) {
  let out;
  try {
    // `-F pc` is machine-readable field output: one field per line, a `p<pid>`
    // line opening a record and `c<command>` naming that record. lsof exits 1
    // having written "nothing found" to STDERR for a free port, so stderr is
    // dropped and the throw is read as "no holder".
    out = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-F', 'pc'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return [];
  }
  const holders = [];
  for (const line of out.split('\n')) {
    if (line.startsWith('p')) holders.push({ pid: Number(line.slice(1)), command: '' });
    else if (line.startsWith('c') && holders.length) holders[holders.length - 1].command = line.slice(1);
  }
  // `c` gives the executable's name ("node") for every process on the port; the
  // argv is what separates a stale `serve.mjs` from an unrelated node server, so
  // the driver's message carries it when ps can produce it.
  for (const h of holders) h.args = psArgs(h.pid) ?? h.command;
  return holders;
}

/** The holder rows as lines a person reads, one per process. */
export function formatPortHolders(holders) {
  return holders.length
    ? holders.map((h) => `  pid ${h.pid}  ${h.args}`).join('\n')
    : '  (nothing on this port that lsof can name)';
}

function psArgs(pid) {
  try {
    return execFileSync('ps', ['-o', 'args=', '-p', String(pid)], { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}
