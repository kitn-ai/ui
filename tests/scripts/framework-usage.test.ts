import { describe, expect, it } from 'vitest';
import { buildSnippets } from '../../scripts/gen-framework-usage.mjs';

const artifact = {
  tag: 'kc-artifact',
  displayName: 'Artifact',
  props: [
    { name: 'files', optional: false, scalar: false },
    { name: 'tab', optional: true, scalar: true },
  ],
  events: [{ name: 'navigate', detail: 'string' }],
};

describe('buildSnippets', () => {
  it('imports the bare React name and binds required props', () => {
    const s = buildSnippets(artifact, /* hasSolid */ true);
    expect(s.react).toContain("import { Artifact } from '@kitn.ai/chat/react'");
    expect(s.react).toContain('files={files}');
    expect(s.react).toContain('onNavigate={');
  });
  it('uses the literal tag for HTML, with non-scalar props as JS properties', () => {
    const s = buildSnippets(artifact, true);
    expect(s.html).toContain('<kc-artifact');
    expect(s.html).toContain('el.files =');
    expect(s.html).toContain("addEventListener('navigate'");
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
});
