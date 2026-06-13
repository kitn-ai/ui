import type { Preview } from 'storybook-solidjs-vite';
import { themes } from 'storybook/theming';
import './styles.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    options: {
      storySort: {
        // Sidebar order, top to bottom: the docs, the interactive Theming tools
        // (next to the Theming doc), composed Examples/Patterns, then the
        // framework-agnostic **Web Components** (the primary, copy-into-any-app
        // API) ABOVE the SolidJS-native Components/UI reference — so a reader
        // reaches the portable elements before the Solid-only building blocks.
        //
        // NOTE: every top-level group MUST be named explicitly here. The
        // trailing `*` is a catch-all that sorts unlisted groups to the very
        // bottom — that's why the `Theming` stories group used to strand itself
        // below "Web Components" (it was only referenced inside the nested Docs
        // sub-order, never as a top-level entry). The nested arrays set the
        // intra-group order (e.g. Examples lead with the full-app "wow" demo
        // rather than sorting alphabetically).
        order: [
          'Docs',
          [
            'Introduction',
            'Installation',
            'Getting Started',
            'Theming',
            'Frameworks & Integrations',
            'Accessibility',
            'For AI Agents',
          ],
          'Theming',
          ['Editor', 'Token Reference', 'Typography'],
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
          'Web Components',
          'Components',
          'UI',
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
