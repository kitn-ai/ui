/**
 * `RowGroup` — the framed list container. It renders NO geometry of its own: the
 * dividers and the per-position corner radii come from custom properties set by
 * `kit-base.css` and drawn by `Row`'s own classes. That split is why this file
 * asserts the CONTRACT (class name, direct children, the property names and the
 * fact that the rules set properties rather than direct declarations) rather than
 * computed styles: jsdom applies no rules from a shadow root and implements no
 * `::slotted` matching, so a computed-style assertion here would pass over
 * anything. The browser half of the contract is measured in
 * `scripts/probe-row-group.mjs`, which renders a real Chromium on both paths.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RowGroup } from './row-group';
import { Row } from './row';
import { PKG_ROOT } from '../../../tests/helpers/kit-paths';

afterEach(cleanup);

// Comments are stripped before every assertion below. Without that, a rule the
// doc block merely MENTIONS satisfies the assertion (this file's own prose names
// `::slotted(*)` to explain why it is wrong) — a green that proves nothing. Rule
// text only, please.
const KIT_BASE_CSS = readFileSync(resolve(PKG_ROOT, 'kit-base.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

describe('RowGroup', () => {
  it('renders one frame element carrying the class the geometry rules target', () => {
    const { container } = render(() => (
      <RowGroup>
        <Row>One</Row>
      </RowGroup>
    ));
    const frame = container.querySelector('[part="group"]')!;
    expect(frame.tagName).toBe('DIV');
    expect(frame).toHaveClass('kai-row-group');
    // The frame is the only thing RowGroup adds: a wrapper PER ROW would break
    // both rule sets (they are direct-child selectors).
    expect(container.querySelectorAll('[part="group"]')).toHaveLength(1);
  });

  it('renders the rows as DIRECT children of the frame', () => {
    const { container } = render(() => (
      <RowGroup>
        <Row>One</Row>
        <Row subtitle="Two">Two</Row>
      </RowGroup>
    ));
    const frame = container.querySelector('[part="group"]')!;
    const rows = [...frame.children];
    expect(rows).toHaveLength(2);
    expect(rows.every((el) => el.getAttribute('part') === 'row')).toBe(true);
  });

  it('passes class and rest props through to the frame', () => {
    const { container } = render(() => (
      <RowGroup class="w-80" data-kai-settings aria-label="Settings">
        <Row>One</Row>
      </RowGroup>
    ));
    const frame = container.querySelector('[part="group"]')!;
    expect(frame).toHaveClass('w-80');
    expect(frame).toHaveAttribute('data-kai-settings');
    expect(frame).toHaveAttribute('aria-label', 'Settings');
  });

  it('adds no heading of its own (unlike SettingsGroup, which requires one)', () => {
    const { container } = render(() => (
      <RowGroup>
        <Row>One</Row>
      </RowGroup>
    ));
    expect(container.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
  });

  it('takes the frame chrome from classes, not from the group rules', () => {
    // The border/radius/clip is the component's; kit-base.css only divides and
    // de-rounds. If the frame chrome moved into CSS the story could not vary it.
    const { container } = render(() => (
      <RowGroup>
        <Row>One</Row>
      </RowGroup>
    ));
    const frame = container.querySelector('[part="group"]')!;
    expect(frame).toHaveClass('overflow-hidden');
    expect(frame).toHaveClass('rounded-xl');
    expect(frame).toHaveClass('border');
  });
});

describe('the geometry contract with kit-base.css', () => {
  it('declares the custom properties for both style paths (Solid children + slotted elements)', () => {
    // EVERY declaration there is a custom property, and the probe is why: written
    // as direct declarations the divider lost to a document-level preflight
    // (`* { border: 0 solid }`) whenever the kit sheet is also loaded at document
    // level (Storybook, docs). See `scripts/probe-row-group.mjs`.
    expect(KIT_BASE_CSS).toMatch(/\.kai-row-group\s*>\s*\*\s*\{[^}]*--kai-row-radius-top:\s*0/);
    expect(KIT_BASE_CSS).toMatch(/\.kai-row-group\s*>\s*\*\s*\{[^}]*--kai-row-divide-width:\s*0px/);
    expect(KIT_BASE_CSS).toMatch(/\.kai-row-group\s*>\s*\*:first-child\s*\{[^}]*--kai-row-radius-top:/);
    expect(KIT_BASE_CSS).toMatch(/\.kai-row-group\s*>\s*\*:last-child\s*\{[^}]*--kai-row-radius-bottom:/);
    expect(KIT_BASE_CSS).toMatch(/\.kai-row-group\s*>\s*\*:not\(:first-child\)\s*\{[^}]*--kai-row-divide-width:\s*1px/);
    expect(KIT_BASE_CSS).toMatch(/::slotted\(\[data-kai-row\]\)\s*\{[^}]*display:\s*block/);
    expect(KIT_BASE_CSS).toMatch(/::slotted\(\[data-kai-row\]\)\s*\{[^}]*--kai-row-divide-width:\s*0px/);
    expect(KIT_BASE_CSS).toMatch(/::slotted\(\[data-kai-row\]:first-child\)\s*\{/);
    expect(KIT_BASE_CSS).toMatch(/::slotted\(\[data-kai-row\]:last-child\)\s*\{/);
    expect(KIT_BASE_CSS).toMatch(/::slotted\(\[data-kai-row\]:not\(:first-child\)\)\s*\{[^}]*--kai-row-divide-width:\s*1px/);
    // The slotted half is scoped by a MARKER, never a tag and never `*`: this sheet
    // is shared by every element's shadow root, so `::slotted(*)` would restyle
    // every other element's slotted children, and a tag list is a roster a third
    // row-shaped element would silently miss.
    expect(KIT_BASE_CSS).not.toMatch(/::slotted\(\*\)/);
  });

  it('every facade rendering a row-shaped child marks its host, or it silently loses the geometry', () => {
    // Derived from the facades, not typed out: a new element that renders `Row` or
    // `SettingItem` and forgets the marker renders a row with no divider and no
    // corners INSIDE a group, which no type or lint can see. `SettingItem` is the
    // one that proved the need: it draws its own hairline now, where `SettingsGroup`
    // used to get dividers from a `divide-y` class on the frame.
    const facadeDir = resolve(PKG_ROOT, 'src/elements');
    const rowShaped = readdirSync(facadeDir)
      .filter((f) => f.endsWith('.tsx') && !f.endsWith('.stories.tsx'))
      .map((f) => ({ file: f, src: readFileSync(resolve(facadeDir, f), 'utf8') }))
      .filter(({ src }) =>
        [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\.\/components\/(?:row\/row|settings\/settings-group)'/g)]
          .some((m) => /\b(Row|SettingItem)\b/.test(m[1])),
      );

    expect(rowShaped.length, 'no facade renders Row/SettingItem — the scan is looking in the wrong place').toBeGreaterThan(0);
    const unmarked = rowShaped.filter(({ src }) => !src.includes("setAttribute('data-kai-row'")).map(({ file }) => file);
    expect(unmarked).toEqual([]);
  });

  it('Row reads the vars the rules set, with a standalone fallback', () => {
    // Rename either side and the geometry silently stops: no divider, every row
    // square. Both halves are asserted so neither can drift alone.
    const { container } = render(() => <Row>One</Row>);
    const row = container.querySelector('[part="row"]')!;
    expect(row.className).toContain('--kai-row-radius-top');
    expect(row.className).toContain('--kai-row-radius-bottom');
    expect(row.className).toContain('--kai-row-divide-width');
    // The fallback is the TOKEN `rounded-lg` reads, not a literal: a row inside a
    // group and one outside it must round on the same scale, and the token is
    // consumer-rebindable through `--kai-radius`.
    expect(row.className).toContain('var(--radius-lg)');
    expect(row.className).not.toContain('rounded-lg');
  });
});
