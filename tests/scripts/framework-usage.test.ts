import { describe, expect, it } from 'vitest';
import { buildSnippets } from '../../scripts/gen-framework-usage.mjs';

const CDN_ELEMENTS = 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kitn-chat.es.js';

const artifact = {
  tag: 'kc-artifact',
  displayName: 'Artifact',
  props: [
    { name: 'files', optional: false, scalar: false },
    { name: 'tab', optional: true, scalar: true },
  ],
  events: [{ name: 'kc-navigate', detail: 'string' }],
};

const noBindings = {
  tag: 'kc-foo',
  displayName: 'Foo',
  props: [],
  events: [],
};

describe('buildSnippets', () => {
  it('imports the bare React name and binds required props', () => {
    const s = buildSnippets(artifact, /* hasSolid */ true);
    expect(s.react).toContain("import { Artifact } from '@kitn.ai/ui/react'");
    expect(s.react).toContain('files={files}');
    expect(s.react).toContain('onNavigate={(');
  });
  it('uses the CDN script tag for HTML, with non-scalar props as JS properties', () => {
    const s = buildSnippets(artifact, true);
    expect(s.html).toContain('<script type="module" src=');
    expect(s.html).toContain(CDN_ELEMENTS);
    expect(s.html).toContain('<kc-artifact');
    expect(s.html).toContain('el.files =');
    expect(s.html).toContain("addEventListener('kc-navigate'");
    expect(s.html).not.toContain("import '@kitn.ai/ui/elements'");
  });
  it('uses Vue .prop binding for non-scalar props and Angular bracket binding', () => {
    const s = buildSnippets(artifact, true);
    expect(s.vue).toContain(':files.prop="files"');
    expect(s.angular).toContain('[files]="files"');
  });
  it('omits the Solid snippet when there is no Solid twin', () => {
    const s = buildSnippets(artifact, /* hasSolid */ false);
    expect(s.solid).toBeUndefined();
  });
  it('binds scalar required props as attrs in HTML and :name in Vue (no .prop)', () => {
    const withScalar = {
      tag: 'kc-embed',
      displayName: 'Embed',
      props: [{ name: 'src', optional: false, scalar: true }],
      events: [],
    };
    const s = buildSnippets(withScalar, false);
    expect(s.html).toContain('src="…"');
    expect(s.html).not.toContain('el.src =');
    expect(s.vue).toContain(':src="src"');
    expect(s.vue).not.toContain('.prop');
  });

  describe('multi-line shape when bindings exist', () => {
    it('React: tag on own line, indented bindings, closing on own line', () => {
      const s = buildSnippets(artifact, true);
      expect(s.react).toMatch(/<Artifact\n/);
      expect(s.react).toContain('\n  files={files}');
      expect(s.react).toMatch(/\n\/>/);
    });
    it('Vue: tag on own line, indented bindings, closing on own line', () => {
      const s = buildSnippets(artifact, true);
      expect(s.vue).toMatch(/<kc-artifact\n/);
      expect(s.vue).toContain('\n  :files.prop="files"');
      expect(s.vue).toContain('\n  @kc-navigate="onNavigate"');
      expect(s.vue).toMatch(/\n\/>/);
    });
    it('Angular: tag on own line, indented bindings, closing on own line', () => {
      const s = buildSnippets(artifact, true);
      expect(s.angular).toMatch(/<kc-artifact\n/);
      expect(s.angular).toContain('\n  [files]="files"');
      expect(s.angular).toContain('\n  (kc-navigate)="onNavigate($event)"');
      expect(s.angular).toMatch(/\n><\/kc-artifact>/);
    });
  });

  describe('compact single-line form when no bindings', () => {
    it('React: compact <Foo /> with no newlines inside', () => {
      const s = buildSnippets(noBindings, false);
      expect(s.react).toContain('<Foo />');
      expect(s.react).not.toMatch(/<Foo\n/);
    });
    it('Vue: compact <kc-foo />', () => {
      const s = buildSnippets(noBindings, false);
      expect(s.vue).toBe('<kc-foo />');
    });
    it('Angular: compact <kc-foo></kc-foo>', () => {
      const s = buildSnippets(noBindings, false);
      expect(s.angular).toBe('<kc-foo></kc-foo>');
    });
    it('Svelte compact: <kc-foo></kc-foo> with script block, no binding lines', () => {
      const s = buildSnippets(noBindings, false);
      expect(s.svelte).toContain("import '@kitn.ai/ui/elements'");
      expect(s.svelte).toContain('<kc-foo></kc-foo>');
      expect(s.svelte).not.toMatch(/<kc-foo\n/);
    });
  });

  describe('Svelte snippet', () => {
    it('has elements import in script block', () => {
      const s = buildSnippets(artifact, true);
      expect(s.svelte).toContain("import '@kitn.ai/ui/elements'");
    });
    it('binds required props with {name} shorthand', () => {
      const s = buildSnippets(artifact, true);
      expect(s.svelte).toContain('{files}');
    });
    it('binds events with on:eventName={handler}', () => {
      const s = buildSnippets(artifact, true);
      expect(s.svelte).toContain('on:kc-navigate={onNavigate}');
    });
    it('multi-line: tag on own line, indented bindings, closing on own line', () => {
      const s = buildSnippets(artifact, true);
      expect(s.svelte).toMatch(/<kc-artifact\n/);
      expect(s.svelte).toContain('\n  {files}');
      expect(s.svelte).toContain('\n  on:kc-navigate={onNavigate}');
      expect(s.svelte).toMatch(/\n><\/kc-artifact>/);
    });
    it('is present for all elements (not gated on hasSolid)', () => {
      const withSolid = buildSnippets(artifact, true);
      const withoutSolid = buildSnippets(artifact, false);
      expect(withSolid.svelte).toBeDefined();
      expect(withoutSolid.svelte).toBeDefined();
    });
  });
});
