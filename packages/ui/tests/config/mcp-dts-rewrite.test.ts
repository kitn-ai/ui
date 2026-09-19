import { describe, expect, it } from 'vitest';
import { rewriteMcpDtsSpecifiers } from '../../config/vite/mcp-dts-rewrite';

const rewrite = (content: string, distRelPath: string) => rewriteMcpDtsSpecifiers({ content, distRelPath });

/** A declaration emitted `dirs` directories below dist/: emittedAt(2) = "d0/d1/f.d.ts". */
const emittedAt = (dirs: number) => `${Array.from({ length: dirs }, (_, i) => `d${i}`).join('/')}${dirs ? '/' : ''}f.d.ts`;
/** The relative prefix from a dist/<dirs>/ declaration up to dist/ root. */
const upFrom = (dirs: number) => (dirs === 0 ? './' : '../'.repeat(dirs));

describe('rewriteMcpDtsSpecifiers', () => {
  /**
   * The defect this pins: the rewrite matched the literal upward prefix for depth 1
   * ONLY, so the 2026-09-19 reorg (flat file -> family folder) stopped it matching at
   * all and three declarations shipped pointing at raw `../../../mcp/construct/*`.
   * Derived over depths, so the next move cannot pick the one depth nobody listed.
   */
  it('rewrites a crossing specifier at EVERY depth', () => {
    for (let dirs = 0; dirs <= 3; dirs++) {
      const source = `${'../'.repeat(dirs + 1)}mcp/construct/templates`;
      const expected = `${upFrom(dirs)}agent-tooling/construct/templates`;
      expect(
        rewrite(`import { TEMPLATES } from '${source}';\n`, emittedAt(dirs)),
        `emitted ${dirs} dir(s) below dist/`,
      ).toBe(`import { TEMPLATES } from '${expected}';\n`);
    }
  });

  it('handles double quotes, dynamic import and require', () => {
    const forms = [
      [`type T = import('../../mcp/construct/schema').Construct;`, `type T = import('../agent-tooling/construct/schema').Construct;`],
      [`import {TEMPLATES} from "../../mcp/construct/templates";`, `import {TEMPLATES} from "../agent-tooling/construct/templates";`],
      [`const s = require('../../mcp/construct/schema');`, `const s = require('../agent-tooling/construct/schema');`],
    ];
    for (const [before, after] of forms) expect(rewrite(before, emittedAt(1))).toBe(after);
  });

  it('rewrites every crossing specifier in the same file', () => {
    const content = [
      `import type { BuildableTemplate } from '../../mcp/construct/templates';`,
      `import type { Construct, ConstructProblem } from '../../mcp/construct/schema';`,
    ].join('\n');
    const out = rewrite(content, emittedAt(1));
    expect(out).not.toContain('mcp/');
    expect(out.match(/agent-tooling\/construct\//g)).toHaveLength(2);
  });

  it('leaves declarations that do not cross the boundary alone', () => {
    const content = `export * from './state.js';\n/** The mcp/construct/schema.ts provider shape. */\nexport type X = 1;\n`;
    expect(rewrite(content, emittedAt(1))).toBe(content);
  });

  it('refuses a relative specifier that resolves outside dist/', () => {
    const cases = [
      [0, '../src/x'],
      [1, '../../src/elements/chat-types'],
      [2, '../../../src/x'],
    ] as const;
    for (const [dirs, spec] of cases) {
      expect(
        () => rewrite(`export type { X } from '${spec}';\n`, emittedAt(dirs)),
        `${spec} from a declaration ${dirs} dir(s) below dist/`,
      ).toThrow(/resolves outside\s+dist\//);
    }
  });
});
