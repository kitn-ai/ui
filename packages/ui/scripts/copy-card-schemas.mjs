// Copy the published card JSON-Schema artifacts to dist/schemas/ so backends in any
// language can fetch/validate against the same shapes the kit uses.
import { mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src/primitives/card-schemas';
const OUT = 'dist/schemas';

mkdirSync(OUT, { recursive: true });
const files = readdirSync(SRC).filter((f) => f.endsWith('.schema.json'));
for (const f of files) copyFileSync(join(SRC, f), join(OUT, f));
console.log(`✓ dist/schemas — ${files.length} card schema(s)`);
