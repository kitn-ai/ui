// Regression guard for the generated React wrappers bundle (dist/react.js, the
// `@kitn.ai/ui/react` entry). Each wrapper lazily imports its element via a
// per-element specifier `@kitn.ai/ui/elements/<X>` — if the generator emits a
// specifier whose `dist/elements/<X>.js` does not exist, the import 404s at
// runtime and `<Chat>` (et al.) silently never registers in every React
// consumer. The bundle must ALSO open with a 'use client' directive or RSC
// builds reject the hooks it uses. This asserts both so that regression can
// never silently ship again.
import { existsSync, readFileSync } from 'node:fs';

const BUNDLE = 'dist/react.js';
const SPECIFIER = /@kitn\.ai\/ui\/elements\/([a-z0-9-]+)/g;

let code;
try {
  code = readFileSync(BUNDLE, 'utf8');
} catch {
  console.error(
    `✗ verify-react-wrappers: ${BUNDLE} not found — run the lib build first.`,
  );
  process.exit(1);
}

const problems = [];

// 1 + 2. Every per-element specifier must resolve to a real dist/elements file.
const names = [...new Set([...code.matchAll(SPECIFIER)].map((m) => m[1]))];
const missing = names.filter((name) => !existsSync(`dist/elements/${name}.js`));
if (missing.length > 0) {
  problems.push(
    `  ${missing.length} react wrapper specifier(s) point at non-existent element files:\n` +
      missing
        .map((name) => `    @kitn.ai/ui/elements/${name} → dist/elements/${name}.js (missing)`)
        .join('\n'),
  );
}

// 3. The bundle must open with a 'use client' directive (first non-empty line).
const firstLine = code.split('\n').find((line) => line.trim() !== '') ?? '';
if (!/^\s*['"]use client['"]/.test(firstLine)) {
  problems.push(
    `  ${BUNDLE} is missing its 'use client' banner — the first non-empty line is:\n` +
      `    ${firstLine.trim() || '(empty)'}\n` +
      `  RSC consumers will reject the React hooks the wrappers use.`,
  );
}

if (problems.length > 0) {
  console.error(
    `✗ verify-react-wrappers: ${BUNDLE} failed validation.\n` +
      problems.join('\n') +
      `\n  See frameworks/react/ (the wrapper generator) and src/elements/ —\n` +
      `  every wrapped element needs a matching dist/elements/<X>.js entry.`,
  );
  process.exit(1);
}

console.log(
  `✓ verify-react-wrappers — ${BUNDLE} has 'use client' and all ${names.length} element specifiers resolve`,
);
