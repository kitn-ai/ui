/**
 * The studio's half of the builder handshake (rail embed, `?embed=1`):
 *
 *  1. kai-theme-init SEEDS the controls — including from the canonical flat
 *     ThemePayload the builder now posts, and tolerantly from the construct
 *     file's nested `tokens` shape (the mismatch that shipped: a saved theme
 *     seeded nothing and the studio opened on kit defaults).
 *  2. WRITE-FREE OPEN: seeding must post NO kai-theme-change — the host
 *     debounce-writes every change frame to disk, so a seed echo overwrote
 *     the construct's saved theme with a full palette of zero edits. Only a
 *     real user edit opens the stream.
 *
 * jsdom has no canvas 2d context, so non-hex kit defaults resolve to #000000
 * in here — irrelevant: the assertions ride on hex OVERRIDES, which pass
 * through cssToHex untouched. The rail renders no showroom (loadKit is never
 * called), which is what makes the studio mountable in jsdom at all.
 *
 * The last describe is the OTHER half of that contract's lesson: a catalogued
 * knob is not a wired knob. `EXTRA_TOKENS` (src/themes/theme-tokens.ts) feeds
 * `studioTokens()`, whose two readers are tests/styles/theme-studio-coverage.test.ts
 * and `mcp/construct/theme-token-policy.ts` (the construct allowlist) — and NOT
 * the studio UI, which keeps its own list of extras. That is how the coverage
 * test stayed green about `--kai-density` while `buildCss` emitted no such line
 * and `themePayload` never named it: the catalog said the knob existed and
 * nothing in the studio had to agree. These assertions are therefore derived
 * from EXTRA_TOKENS itself, so the next catalogued knob with nothing behind it
 * is red here.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@solidjs/testing-library';
import ThemeStudio from './ThemeStudio';
import { EXTRA_TOKENS, parseKitDefaults, remValue } from '../../src/themes/theme-tokens';
// theme.css RAW, the same import the studio itself derives every default from —
// so "the default is 0.25rem" is read out of the kit, never typed in here. Not
// readFileSync: the apps/ tsconfig carries vite/client, not node types.
import kitCss from '../../theme.css?raw';

const ORIGIN = window.location.origin;

const KIT_DENSITY = remValue(parseKitDefaults(kitCss).get('--kai-density')!.light);

/** Deliver a host frame exactly as the browser would: a same-origin
 *  MessageEvent on window (the studio's listener attaches on mount). */
const postInit = (theme: unknown): void => {
  window.dispatchEvent(new MessageEvent('message', { data: { type: 'kai-theme-init', theme }, origin: ORIGIN }));
};

/** kai-theme-change frames the studio posted to its host (window.parent ===
 *  window in jsdom, so the spy on window.postMessage sees them all). */
const changeFrames = (spy: ReturnType<typeof vi.spyOn>): unknown[] =>
  spy.mock.calls.map((c: unknown[]) => c[0]).filter((d: unknown) => (d as { type?: string })?.type === 'kai-theme-change');

/** Frames of any one postMessage type the studio sent its host. */
const framesOf = (spy: ReturnType<typeof vi.spyOn>, type: string): unknown[] =>
  spy.mock.calls.map((c: unknown[]) => c[0]).filter((d: unknown) => (d as { type?: string })?.type === type);

const primaryInput = (): HTMLInputElement => screen.getByLabelText('Primary') as HTMLInputElement;

describe('theme studio — rail embed handshake (kai-theme-init seeding + write-free open)', () => {
  let postSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.pushState({}, '', '/?embed=1'); // isRail() + isEmbedded() both key off the flag
    postSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    postSpy.mockRestore();
    window.history.pushState({}, '', '/');
  });

  it('seeds from the canonical FLAT ThemePayload — the saved primary shows in the control, not the kit default', async () => {
    render(() => <ThemeStudio />);
    postInit({ light: { '--kai-color-primary': '#123456' }, dark: {}, radius: '1rem' });
    await waitFor(() => expect(primaryInput().value).toBe('#123456'));
  });

  it('tolerates the construct file\'s NESTED tokens shape (and a bare accent) rather than silently seeding kit defaults', async () => {
    render(() => <ThemeStudio />);
    postInit({ mode: 'system', accent: '#112233', tokens: { light: { '--kai-color-primary': '#123456' } } });
    await waitFor(() => expect(primaryInput().value).toBe('#123456')); // tokens win
    cleanup();
    render(() => <ThemeStudio />);
    postInit({ mode: 'system', accent: '#abcdef' }); // no tokens yet — accent folds into primary
    await waitFor(() => expect(primaryInput().value).toBe('#abcdef'));
  });

  it('OPENING POSTS NOTHING: no kai-theme-change on mount or on seeding — only a real edit opens the stream', async () => {
    render(() => <ThemeStudio />);
    postInit({ light: { '--kai-color-primary': '#123456' }, dark: {} });
    await waitFor(() => expect(primaryInput().value).toBe('#123456'));
    await new Promise((r) => setTimeout(r, 50)); // let any effect run settle
    expect(changeFrames(postSpy)).toHaveLength(0);

    // The first REAL edit posts, carrying the edit over the seeded state.
    fireEvent.input(primaryInput(), { target: { value: '#ff0000' } });
    await waitFor(() => expect(changeFrames(postSpy).length).toBeGreaterThan(0));
    const frame = changeFrames(postSpy).at(-1) as { light: Record<string, string> };
    expect(frame.light['--kai-color-primary']).toBe('#ff0000');
  });

  it('a rail that never receives init streams nothing at all (its side of the contract)', async () => {
    render(() => <ThemeStudio />);
    fireEvent.input(primaryInput(), { target: { value: '#ff0000' } }); // even an edit holds until seeded
    await new Promise((r) => setTimeout(r, 50));
    expect(changeFrames(postSpy)).toHaveLength(0);
  });
});

describe('theme studio — --kai-density is wired, not merely catalogued', () => {
  let postSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.pushState({}, '', '/?embed=1');
    postSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    postSpy.mockRestore();
    window.history.pushState({}, '', '/');
    localStorage.removeItem('kai-theme-studio-presets');
  });

  /** The Code modal's `<pre><code>` — the paste-ready block, as exported. */
  const exportedCss = (): string => document.querySelector('pre code')?.textContent ?? '';
  const densityField = (): HTMLInputElement => screen.getByLabelText('Density value') as HTMLInputElement;
  const radiusField = (): HTMLInputElement => screen.getByLabelText('Radius value') as HTMLInputElement;
  const openOtherTab = () => fireEvent.click(screen.getByText('Other'));
  /** In embed mode the toolbar carries an Apply of its own, so the modal's is
   *  the LAST `Apply` in DOM order (the modal Portals to <body>). */
  const clickModalApply = () => fireEvent.click(screen.getAllByText('Apply').at(-1)!);

  it('emits one line for EVERY token EXTRA_TOKENS catalogues — a catalogued knob with no wiring behind it fails here', () => {
    render(() => <ThemeStudio />);
    // The font and tracking knobs are emitted only once set, so set them: the
    // claim under test is "catalogued implies emitted", not "emitted at rest".
    postInit({ light: { '--kai-tracking': '0.02em' }, dark: {}, fonts: { '--kai-font-base': 'Inter', '--kai-font-code': 'monospace' } });
    fireEvent.click(screen.getByText('Code'));
    const css = exportedCss();
    expect(EXTRA_TOKENS.filter((t) => !css.includes(`${t}:`)), css).toEqual([]);
  });

  it('publishes Tailwind geometry by default: the exported density is the value theme.css declares', () => {
    render(() => <ThemeStudio />);
    fireEvent.click(screen.getByText('Code'));
    expect(exportedCss()).toContain(`--kai-density: ${KIT_DENSITY}rem;`);
    expect(KIT_DENSITY).toBe(0.25); // Tailwind's own default — the whole reason the fallback is 0.25
  });

  it('carries --kai-density to the rail host, so the preview beside the rail re-themes with it', async () => {
    render(() => <ThemeStudio />);
    clickModalApply(); // kai-theme-apply posts untimed — no need to open the change stream
    const atRest = framesOf(postSpy, 'kai-theme-apply').at(-1) as { light: Record<string, string> };
    expect(atRest.light['--kai-density']).toBe(`${KIT_DENSITY}rem`);

    openOtherTab();
    fireEvent.change(densityField(), { target: { value: '0.375' } });
    await waitFor(() => expect(densityField().value).toBe('0.375'));
    clickModalApply();
    const moved = framesOf(postSpy, 'kai-theme-apply').at(-1) as { light: Record<string, string> };
    expect(moved.light['--kai-density']).toBe('0.375rem');
  });

  it('round-trips: the exported CSS pasted back in reproduces the density it exported', async () => {
    render(() => <ThemeStudio />);
    openOtherTab();
    fireEvent.change(densityField(), { target: { value: '0.5' } });
    await waitFor(() => expect(densityField().value).toBe('0.5'));
    fireEvent.click(screen.getByText('Code'));
    const css = exportedCss();
    expect(css).toContain('--kai-density: 0.5rem;');
    fireEvent.click(screen.getByLabelText('Close'));
    // Move the knob AWAY first: a parser that returned nothing would leave 0.75
    // in the control and this round trip would pass vacuously.
    fireEvent.change(densityField(), { target: { value: '0.75' } });
    await waitFor(() => expect(densityField().value).toBe('0.75'));
    fireEvent.click(screen.getByText('Import'));
    fireEvent.input(screen.getByRole('textbox'), { target: { value: css } });
    clickModalApply();
    await waitFor(() => expect(densityField().value).toBe('0.5'));
  });

  it('loads a preset saved before the knob existed: default density, everything else untouched', async () => {
    // A real older localStorage entry: no `density` key, radius deliberately
    // NOT the default, so a guarded read that blanked the object would show.
    localStorage.setItem('kai-theme-studio-presets', JSON.stringify([
      { name: 'Legacy', light: { '--kai-color-primary': '#123456' }, dark: {}, radius: 0.9, fontBase: '', fontCode: '', tracking: 0, shadow: '#000000' },
    ]));
    render(() => <ThemeStudio />);
    fireEvent.click(screen.getByRole('button', { name: 'Default' })); // the theme dropdown trigger
    // The dropdown stays open while the onMount localStorage read lands, so this
    // waits for the reactive list rather than racing it.
    await waitFor(() => expect(screen.getByText('Legacy')).toBeDefined());
    fireEvent.click(screen.getByText('Legacy'));
    openOtherTab();
    await waitFor(() => expect(densityField().value).toBe(String(KIT_DENSITY)));
    expect(radiusField().value).toBe('0.9');
  });
});
