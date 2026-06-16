import type { Preview } from 'storybook-solidjs-vite';
import { themes } from 'storybook/theming';
import './styles.css';

// Storybook's dark toggle adds `.dark` to the preview <html>, but the `kc-*`
// custom elements render in SHADOW DOM, which a light-DOM class can't cross — so
// they'd otherwise fall back to their own `theme="auto"` (the OS preference) and
// ignore the toggle. Mirror the resolved Storybook theme onto each element's
// `theme` attribute (which DOES drive its shadow content), keeping web-component
// stories in lockstep with the light/dark switch.
if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
  const applyElementTheme = (): void => {
    const dark = document.documentElement.classList.contains('dark');
    const root = document.querySelector('#storybook-root') ?? document.body;
    root.querySelectorAll('*').forEach((el) => {
      if (el.tagName.toLowerCase().startsWith('kc-')) {
        el.setAttribute('theme', dark ? 'dark' : 'light');
      }
    });
  };
  let pending = false;
  const schedule = (): void => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      applyElementTheme();
    });
  };
  new MutationObserver(schedule).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  const start = (): void => {
    const root = document.querySelector('#storybook-root') ?? document.body;
    new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
    schedule();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    // Accessibility (axe) runs per-story in both the Storybook UI panel and the
    // `vitest --project=storybook` test run. `test: 'error'` makes a11y
    // violations FAIL the test run/CI. The kit-wide a11y audit (PR #49) plus the
    // code-block/checkpoint fixes cleared the real violations, so a11y is gated.
    // Override per-story with a local `a11y.test` parameter if a fixture differs.
    //
    // `context.exclude` is the kit's ONE documented a11y exception: the Shiki
    // dark theme (github-dark-dimmed) renders code comments at #768390 (~3.87:1),
    // below WCAG AA — a deliberate, theme-defined syntax-highlighting aesthetic we
    // don't control. axe can't scope a single rule to a subtree, so we exclude the
    // rendered code (`<pre>`) from the run; it carries no interactive/labelable
    // content, so in practice only the comment-color contrast check is waived.
    // color-contrast (and every other rule) stays enforced everywhere else.
    // NOTE: exclude MUST live under `context` — a top-level `exclude` is ignored.
    a11y: {
      test: 'error',
      context: { exclude: [['pre']] },
    },
    // SB10 Code panel: show a "Code" tab in the CANVAS (next to Controls/
    // Actions/etc.) carrying each story's source. It reuses the Docs Source-block
    // config, so element stories that set their own `docs.source.code`
    // (the per-element HTML/Solid usage snippets) surface that same snippet here
    // — which is exactly what their "See the Code tab" descriptions point at.
    // Provided by the already-registered `@storybook/addon-docs`; no extra
    // registration needed. Disable for a single story with `docs.codePanel:
    // false`.
    docs: {
      codePanel: true,
    },
    options: {
      storySort: {
        // Sidebar order, top to bottom: the docs, the interactive Theming tools
        // (next to the Theming doc), composed Examples/Patterns, then the
        // framework-agnostic **Components** (the primary, copy-into-any-app
        // API) ABOVE the **Solid (Advanced)** tier — so a reader reaches the
        // portable elements before the Solid-only building blocks (which stay
        // present but collapsed below).
        //
        // NOTE: every top-level group MUST be named explicitly here. The
        // trailing `*` is a catch-all that sorts unlisted groups to the very
        // bottom — that's why the `Theming` stories group used to strand itself
        // below "Components" (it was only referenced inside the nested Docs
        // sub-order, never as a top-level entry). The nested arrays set the
        // intra-group order (e.g. Examples lead with the full-app "wow" demo
        // rather than sorting alphabetically).
        order: [
          'Docs',
          [
            'Introduction',
            'Installation',
            'Getting Started',
            'Choosing Components',
            'Frameworks',
            ['Overview', 'HTML', 'React', 'Svelte', 'Vue', 'Angular', 'Solid'],
            'Recipes',
            ['Streaming (OpenRouter)', 'Text-to-Speech', 'Speech-to-Text'],
            'Accessibility',
            'For AI Agents',
          ],
          'Theming',
          ['Overview', 'Editor', 'Token Reference', 'Typography'],
          'Examples',
          [
            'Full Chat App',
            'Streaming Response',
            'Conversation with Reasoning',
            'Conversation with Sources',
            'Message Actions',
            'Prompt Input Variants',
            'Context & Token Usage',
            'Checkpoint & Restore',
          ],
          'Patterns',
          'Components',
          'Solid (Advanced)',
          ['Overview', 'Elements', 'Primitives'],
          'Generative UI',
          ['Overview', 'Cards', ['kc-confirm', '*'], 'SDK'],
          '*',
        ],
      },
    },
    // storybook-dark-mode: one toggle themes the whole Storybook — manager
    // chrome, docs pages, and the preview. `darkClass: 'dark'` on the preview
    // <html> drives the kit's own `.dark` design tokens, so the components
    // switch in lockstep with the surrounding UI.
    darkMode: {
      current: 'light',
      stylePreview: true,
      classTarget: 'html',
      darkClass: 'dark',
      lightClass: 'light',
      dark: { ...themes.dark, appPreviewBg: 'hsl(50 2% 9%)' },
      light: { ...themes.light },
    },
  },
};

export default preview;
