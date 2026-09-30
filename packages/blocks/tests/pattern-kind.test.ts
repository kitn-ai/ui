/**
 * The pattern tier's registry kind. A pattern is a small copyable composition
 * of plain web components: one .html, at most one .js, optional .css. No
 * controller, no binding grammar, no generated framework forms.
 *
 * Each rule is watched failing on a planted manifest or page, and the error
 * text is asserted by name, so a rule that stopped firing cannot pass.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  buildPatternIndex,
  buildPatternItem,
  checkPatternContracts,
  discoverPatterns,
  type RawBlockSource,
} from '../src/registry';
import { renderPattern } from '../src/forms';

const PATTERNS_DIR = resolve(__dirname, '../patterns');

function scan(): RawBlockSource[] {
  const out: RawBlockSource[] = [];
  for (const entry of readdirSync(PATTERNS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(PATTERNS_DIR, entry.name);
    if (!existsSync(join(dir, 'registry-item.json'))) continue;
    out.push({
      dirName: entry.name,
      manifestJson: readFileSync(join(dir, 'registry-item.json'), 'utf8'),
      files: readdirSync(dir, { withFileTypes: true })
        .filter((f) => f.isFile() && f.name !== 'registry-item.json')
        .map((f) => ({ name: f.name, content: readFileSync(join(dir, f.name), 'utf8') })),
    });
  }
  return out;
}

function planted(
  files: { name: string; content: string }[],
  manifestFiles: { path: string; type: string }[],
  extra: Record<string, unknown> = {},
): RawBlockSource {
  return {
    dirName: 'plant',
    manifestJson: JSON.stringify({
      name: 'plant',
      kind: 'pattern',
      title: 'Plant',
      description: 'A planted pattern.',
      files: manifestFiles,
      ...extra,
    }),
    files,
  };
}

const HTML = { name: 'plant.html', content: '<kai-button>Hi</kai-button>\n<script type="module" src="./plant.js"></script>' };
const JS = { name: 'plant.js', content: "import '@kitn.ai/ui/web-components';\n" };
const OK_FILES = [
  { path: 'plant.html', type: 'html' },
  { path: 'plant.js', type: 'js' },
];

describe('pattern kind: the directory scan', () => {
  it('finds hello-pattern with kind "pattern"', () => {
    const { patterns, errors } = discoverPatterns(scan());
    expect(errors).toEqual([]);
    const hello = patterns.find((p) => p.name === 'hello-pattern');
    expect(hello).toBeDefined();
    expect(hello?.manifest.kind).toBe('pattern');
    expect(hello?.files.has('hello-pattern.html')).toBe(true);
  });

  it('accepts a well-formed planted pattern (so the rejections below are not vacuous)', () => {
    const { patterns, errors } = discoverPatterns([planted([HTML, JS], OK_FILES)]);
    expect(errors).toEqual([]);
    expect(patterns).toHaveLength(1);
  });
});

describe('pattern kind: rejections carry a named error', () => {
  it('more than one .js file', () => {
    const { errors } = discoverPatterns([
      planted(
        [HTML, JS, { name: 'extra.js', content: '' }],
        [...OK_FILES, { path: 'extra.js', type: 'js' }],
      ),
    ]);
    expect(errors.join('\n')).toMatch(/at most one "js" file/);
  });

  it('a .tsx file', () => {
    const { errors } = discoverPatterns([
      planted([HTML, { name: 'plant.tsx', content: '' }], [{ path: 'plant.html', type: 'html' }, { path: 'plant.tsx', type: 'js' }]),
    ]);
    expect(errors.join('\n')).toMatch(/\.tsx is not allowed/);
  });

  it.each([
    ['a property binding', '<kai-button .label="x">Hi</kai-button>'],
    ['a colon binding', '<kai-button :label="x">Hi</kai-button>'],
    ['an at binding', '<kai-button @kai-click="go">Hi</kai-button>'],
    ['a hash binding', '<kai-button #ref="x">Hi</kai-button>'],
    ['a star directive', '<kai-button *for="i">Hi</kai-button>'],
  ])('%s in the html', (_label, html) => {
    const { errors } = discoverPatterns([planted([{ name: 'plant.html', content: html }, JS], OK_FILES)]);
    expect(errors.join('\n')).toMatch(/plant\/plant\.html: template binding syntax/);
  });

  it('a manifest with no html page, or two', () => {
    const none = discoverPatterns([planted([JS], [{ path: 'plant.js', type: 'js' }])]);
    expect(none.errors.join('\n')).toMatch(/exactly one "html" file/);
    const two = discoverPatterns([
      planted(
        [HTML, { name: 'b.html', content: '' }],
        [{ path: 'plant.html', type: 'html' }, { path: 'b.html', type: 'html' }],
      ),
    ]);
    expect(two.errors.join('\n')).toMatch(/exactly one "html" file/);
  });

  it('a wrong kind, a bad file type, an unsafe path, a file the scan did not find', () => {
    expect(discoverPatterns([planted([HTML], [{ path: 'plant.html', type: 'html' }], { kind: 'block' })]).errors.join('\n')).toMatch(/"kind" must be "pattern"/);
    expect(discoverPatterns([planted([HTML], [{ path: 'plant.html', type: 'registry:page' }])]).errors.join('\n')).toMatch(/unknown type/);
    expect(discoverPatterns([planted([HTML], [{ path: 'plant.html', type: 'html' }, { path: '../x.css', type: 'css' }])]).errors.join('\n')).toMatch(/"\.\." segment/);
    expect(discoverPatterns([planted([HTML], [{ path: 'plant.html', type: 'html' }, { path: 'gone.css', type: 'css' }])]).errors.join('\n')).toMatch(/found no such file/);
  });
});

describe('pattern html references are cross-checked against the manifest', () => {
  it('rejects a script the html loads that files[] does not list', () => {
    const html = { name: 'plant.html', content: '<kai-button>x</kai-button>\n<script type="module" src="./plant.js"></script>\n<script type="module" src="./ghost.js"></script>' };
    const { errors } = discoverPatterns([planted([html, JS], OK_FILES)]);
    expect(errors.join('\n')).toMatch(/plant\/plant\.html: references "\.\/ghost\.js" but files\[\] does not list it/);
  });

  it('rejects a stylesheet the html links that files[] does not list', () => {
    const html = { name: 'plant.html', content: '<link rel="stylesheet" href="./ghost.css">\n<script type="module" src="./plant.js"></script>' };
    const { errors } = discoverPatterns([planted([html, JS], OK_FILES)]);
    expect(errors.join('\n')).toMatch(/references "\.\/ghost\.css" but files\[\] does not list it/);
  });

  it('rejects a listed js file the html never references', () => {
    const html = { name: 'plant.html', content: '<kai-button>x</kai-button>' };
    const { errors } = discoverPatterns([planted([html, JS], OK_FILES)]);
    expect(errors.join('\n')).toMatch(/files\[\] lists "plant\.js" but plant\.html never references it/);
  });

  it('rejects a listed css file the html never links', () => {
    const { errors } = discoverPatterns([
      planted([HTML, JS, { name: 'plant.css', content: '' }], [...OK_FILES, { path: 'plant.css', type: 'css' }]),
    ]);
    expect(errors.join('\n')).toMatch(/files\[\] lists "plant\.css" but plant\.html never references it/);
  });

  it('ignores absolute and CDN urls, and accepts a matching link', () => {
    const html = {
      name: 'plant.html',
      content: '<link rel="stylesheet" href="https://cdn.example/x.css"><link rel="stylesheet" href="./plant.css"><script type="module" src="./plant.js"></script>',
    };
    const { errors } = discoverPatterns([
      planted([html, JS, { name: 'plant.css', content: '' }], [...OK_FILES, { path: 'plant.css', type: 'css' }]),
    ]);
    expect(errors).toEqual([]);
  });
});

describe('pattern contract checks', () => {
  const nonscalar = { 'kai-thread': ['messages'] };
  const check = (html: string, ts = JS.content) => {
    const { patterns, errors } = discoverPatterns([planted([{ name: 'plant.html', content: `${html}\n<script type="module" src="./plant.js"></script>` }, { name: 'plant.js', content: ts }], OK_FILES)]);
    expect(errors).toEqual([]);
    return checkPatternContracts(patterns[0], nonscalar);
  };

  it('is clean on every shipped pattern', () => {
    const { patterns } = discoverPatterns(scan());
    for (const pattern of patterns) expect(checkPatternContracts(pattern, nonscalar), pattern.name).toEqual([]);
  });

  it('catches the kitn- prefix, a non-scalar attribute, a document listener, a hand-rolled reader', () => {
    expect(check('<kitn-button>x</kitn-button>').join('\n')).toMatch(/legacy "kitn-" prefix/);
    expect(check('<kai-thread messages="[]"></kai-thread>').join('\n')).toMatch(/non-scalar prop "messages"/);
    expect(check('<kai-button>x</kai-button>', "document.addEventListener('kai-click', () => {});").join('\n')).toMatch(/do not bubble/);
    expect(check('<kai-button>x</kai-button>', 'new EventSource("/x");').join('\n')).toMatch(/hand-rolls a stream reader/);
  });
});

describe('pattern index, item JSON and rendering', () => {
  const { patterns } = discoverPatterns(scan());
  // The fixture is picked by name: directory order puts other patterns first.
  const hello = patterns.find((p) => p.name === 'hello-pattern')!;

  it('the index lists patterns by manifest, contents omitted', () => {
    const index = buildPatternIndex(patterns);
    expect(index.items.map((i) => i.name)).toContain('hello-pattern');
    expect(JSON.stringify(index)).not.toContain('Say hello');
  });

  it('the item JSON carries each file content', () => {
    const item = buildPatternItem(hello);
    expect(item.kind).toBe('pattern');
    expect(item.files.find((f) => f.path === 'hello-pattern.html')?.content).toBe(hello.files.get('hello-pattern.html'));
  });

  it('renders files verbatim under src/patterns/<id>/', () => {
    const files = renderPattern(hello);
    expect(files.map((f) => f.target).sort()).toEqual(['src/patterns/hello-pattern/hello-pattern.html', 'src/patterns/hello-pattern/hello-pattern.js']);
    for (const f of files) expect(f.content).toBe(hello.files.get(f.path));
  });

  it('the cdn form rewrites ONLY the kit import line', () => {
    const version = '9.9.9';
    const files = renderPattern(hello, { cdn: { version } });
    const ts = files.find((f) => f.path === 'hello-pattern.js')!;
    const before = (hello.files.get('hello-pattern.js') as string).split('\n');
    const after = ts.content.split('\n');
    expect(after).toHaveLength(before.length);
    const changed = after.filter((line, i) => line !== before[i]);
    expect(changed).toHaveLength(1);
    expect(changed[0]).toContain(`https://cdn.jsdelivr.net/npm/@kitn.ai/ui@${version}/dist/kai.es.js`);
    expect(files.find((f) => f.path === 'hello-pattern.html')?.content).toBe(hello.files.get('hello-pattern.html'));
  });

  it('the cdn form refuses a kit entry outside the proven set, by name', () => {
    const bad = { ...hello, files: new Map(hello.files).set('hello-pattern.js', "import '@kitn.ai/ui';\n") };
    expect(() => renderPattern(bad, { cdn: { version: '9.9.9' } })).toThrow(/root "@kitn\.ai\/ui" export/);
  });
});
