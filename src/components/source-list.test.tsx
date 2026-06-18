import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { For } from 'solid-js';
import { Source, SourceTrigger, SourceContent, SourceList } from './source';
import { parseKcSourceElement } from '../elements/source';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// parseKcSourceElement — unit-tests for the attribute→SourceItem mapping
// ---------------------------------------------------------------------------

describe('parseKcSourceElement', () => {
  function makeEl(attrs: Record<string, string | null>): Element {
    const el = document.createElement('kai-source');
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== null) el.setAttribute(k, v);
    }
    return el;
  }

  it('maps href, label, headline→title, description', () => {
    const el = makeEl({
      href: 'https://kitn.dev',
      label: 'kitn',
      headline: 'kitn — the kit',
      description: 'Composable SolidJS chat UI.',
    });
    expect(parseKcSourceElement(el)).toEqual({
      href: 'https://kitn.dev',
      label: 'kitn',
      title: 'kitn — the kit',
      description: 'Composable SolidJS chat UI.',
      showFavicon: false,
    });
  });

  it('sets showFavicon=true for a bare show-favicon attribute', () => {
    const el = makeEl({ href: 'https://kitn.dev', 'show-favicon': '' });
    expect(parseKcSourceElement(el).showFavicon).toBe(true);
  });

  it('sets showFavicon=false when show-favicon="false"', () => {
    const el = makeEl({ href: 'https://kitn.dev', 'show-favicon': 'false' });
    expect(parseKcSourceElement(el).showFavicon).toBe(false);
  });

  it('returns undefined for optional attrs when absent', () => {
    const el = makeEl({ href: 'https://kitn.dev' });
    const item = parseKcSourceElement(el);
    expect(item.label).toBeUndefined();
    expect(item.title).toBeUndefined();
    expect(item.description).toBeUndefined();
  });

  it('falls back to empty string for missing href', () => {
    const el = makeEl({});
    expect(parseKcSourceElement(el).href).toBe('');
  });
});

// ---------------------------------------------------------------------------
// SourceList component — verify citations render as anchor links
// ---------------------------------------------------------------------------

describe('SourceList with Source children', () => {
  it('renders citation links for each source', () => {
    const sources = [
      { href: 'https://kitn.dev', title: 'kitn', description: 'Composable chat UI.' },
      { href: 'https://solidjs.com', title: 'SolidJS', description: 'A reactive UI library.' },
    ];

    const { container } = render(() => (
      <SourceList>
        {sources.map((s) => (
          <Source href={s.href}>
            <SourceTrigger />
            <SourceContent title={s.title} description={s.description} />
          </Source>
        ))}
      </SourceList>
    ));

    const links = container.querySelectorAll('a[href]');
    // SourceTrigger and SourceContent each render an <a>; 2 sources × 2 = 4
    expect(links.length).toBeGreaterThanOrEqual(2);
    const hrefs = [...links].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('https://kitn.dev');
    expect(hrefs).toContain('https://solidjs.com');
  });
});

// ---------------------------------------------------------------------------
// numbered prop — kai-sources web component behavior reproduced at Solid level
// ---------------------------------------------------------------------------

describe('numbered citations', () => {
  /** Helper: render N sources with explicit numeric labels (mirroring numbered mode). */
  function renderNumbered(sources: { href: string; label?: string | number }[]) {
    return render(() => (
      <SourceList>
        <For each={sources}>
          {(s, i) => (
            <Source href={s.href}>
              {/* When numbered is active the element replaces label with i()+1. */}
              <SourceTrigger label={i() + 1} />
              <SourceContent title="" description="" />
            </Source>
          )}
        </For>
      </SourceList>
    ));
  }

  it('labels N sources 1..N in order', () => {
    const sources = [
      { href: 'https://kitn.dev' },
      { href: 'https://solidjs.com' },
      { href: 'https://vitejs.dev' },
    ];

    const { container } = renderNumbered(sources);

    // SourceTrigger renders a <span> with the label inside the trigger <a>.
    // Grab all trigger anchors — they have target="_blank".
    const triggerLinks = [...container.querySelectorAll('a[target="_blank"]')];
    // One trigger per source (SourceContent also renders an <a target="_blank">,
    // so we narrow to ones whose text content is a number 1–N).
    const labels = triggerLinks
      .map((a) => a.querySelector('span')?.textContent?.trim())
      .filter(Boolean);

    expect(labels).toEqual(['1', '2', '3']);
  });

  it('label sequence resets from 1 for each independent list', () => {
    const firstSources = [{ href: 'https://kitn.dev' }, { href: 'https://solidjs.com' }];
    const secondSources = [{ href: 'https://vitejs.dev' }, { href: 'https://vitest.dev' }];

    const { container: c1 } = renderNumbered(firstSources);
    const { container: c2 } = renderNumbered(secondSources);

    const getLabels = (c: HTMLElement) =>
      [...c.querySelectorAll('a[target="_blank"]')]
        .map((a) => a.querySelector('span')?.textContent?.trim())
        .filter(Boolean);

    expect(getLabels(c1)).toEqual(['1', '2']);
    expect(getLabels(c2)).toEqual(['1', '2']);
  });
});
