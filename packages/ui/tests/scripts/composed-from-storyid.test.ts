import { describe, expect, it } from 'vitest';
import meta from '../../src/web-components/web-component-meta.json';

describe('composedFrom story ids', () => {
  it('points at the SolidJS (advanced) tier path', () => {
    const links = (meta as any[]).flatMap((e) => e.composedFrom);
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      // The segment is the composed component's SOURCE DIR (gen-web-component-api.mjs), so the
      // 2026-09-19 rename moved it from `elements` to `web-components`. These ids are SYNTHETIC:
      // the `Solid (Advanced)/Elements` tier they were minted for no longer exists in any title
      // (retitled 2026-09-18), so nothing resolves them either way. Pinned as the derived shape.
      expect(l.storyId).toMatch(/^solid-advanced-(web-components|primitives)-[a-z0-9-]+--docs$/);
    }
  });

  it('names only real components, never constants', () => {
    // `composedFrom` used to be "every imported binding matching /^[A-Z]/", which
    // swept in `DEFAULT_WARN_THRESHOLD` and `DEFAULT_DANGER_THRESHOLD` — two numbers
    // from src/components/context/context.tsx — and handed each a story id that resolves to
    // nothing. The generator now asks the checker for the declaration; this pins the
    // symptom so a looser filter cannot come back.
    const names = [...new Set((meta as any[]).flatMap((e) => e.composedFrom).map((l: any) => l.name))];
    expect(names.filter((n) => /^[A-Z0-9_]+$/.test(n))).toEqual([]);
  });

  it('is not empty for an element whose whole UI is built in a helper module', () => {
    // `kai-prompt-input` builds its whole UI in a helper (so `<kai-chat>` renders the
    // same composer). A facade-file-only walk reported `composedFrom: []` for it, and
    // that is what this pins.
    //
    // The helper MOVED on 2026-09-19: `default-input.tsx` registers nothing and is a
    // plain Solid component, yet it lived in the web-components layer while a Solid
    // component (components/chat/chat-thread.tsx) imported it -- an upward VALUE edge.
    // It now lives in components/prompt/, so this facade composes it DIRECTLY and the
    // reported name is that helper rather than the three primitives inside it. The
    // in-layer recursion branch this test once exercised is exercised by nothing today
    // (the remaining local imports are a CSS string and a validator), which is why the
    // expectation is now the single direct name.
    const promptInput = (meta as any[]).find((e) => e.tag === 'kai-prompt-input');
    expect(promptInput.composedFrom.map((c: any) => c.name)).toEqual(
      expect.arrayContaining(['DefaultPromptInput']),
    );
  });

  it('every element that renders kit components has a non-empty composedFrom', () => {
    // Positive control on coverage: an element whose facade (or its element-local
    // helpers) imports from ../components/ or ../ui/ must report something. Elements
    // that legitimately render nothing from those layers are listed by tag, so the
    // set can only shrink deliberately.
    const empty = (meta as any[]).filter((e) => e.composedFrom.length === 0).map((e) => e.tag).sort();
    expect((meta as any[]).length).toBeGreaterThan(50);
    // kai-icon renders a raw glyph via the icon registry; kai-remote mounts a
    // cross-origin card through an iframe. Neither renders a kit component.
    // The blocks-and-parts trio render no kit component either: kai-tab-bar
    // renders its own <nav> driven by the headless createTabBarItemsController
    // (its items are light-DOM children, not composed JSX); kai-view-stack
    // renders a bare <slot/> over createViewStack; kai-view is a slot plus a
    // host style. All three import only lowercase controller/helper functions
    // from ../components/, which composedFrom rightly excludes.
    expect(empty).toEqual(['kai-icon', 'kai-remote', 'kai-tab-bar', 'kai-view', 'kai-view-stack']);
  });
});
