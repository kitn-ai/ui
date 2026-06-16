import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { Source, SourceTrigger, SourceContent, SourceList } from './source';
import { parseKcSourceElement } from '../elements/source';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// parseKcSourceElement — unit-tests for the attribute→SourceItem mapping
// ---------------------------------------------------------------------------

describe('parseKcSourceElement', () => {
  function makeEl(attrs: Record<string, string | null>): Element {
    const el = document.createElement('kc-source');
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
