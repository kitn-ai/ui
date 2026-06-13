import type { Preview } from 'storybook-solidjs-vite';
import { themes } from 'storybook/theming';
import './styles.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    options: {
      storySort: {
        // All documentation lives under a single "Docs" group, pinned to the
        // top of the sidebar (in reading order), then examples/patterns, then
        // the component libraries.
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
          'Examples',
          'Patterns',
          'Components',
          'UI',
          'Web Components',
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
