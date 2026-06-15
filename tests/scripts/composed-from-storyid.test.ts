import { describe, expect, it } from 'vitest';
import meta from '../../src/elements/element-meta.json';

describe('composedFrom story ids', () => {
  it('points at the SolidJS (advanced) tier path', () => {
    const links = (meta as any[]).flatMap((e) => e.composedFrom);
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      expect(l.storyId).toMatch(/^solid-advanced-(elements|primitives)-[a-z0-9-]+--docs$/);
    }
  });
});
