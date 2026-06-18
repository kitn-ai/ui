// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import solid from '@astrojs/solid-js';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// PROTOTYPE — Astro Starlight evaluation for the kitn docs site.
// `base: '/chat'` proves GitHub Pages readiness (kitn-ai.github.io/chat). The
// dev server serves under that base too; assets are referenced with
// import.meta.env.BASE_URL so they resolve in both dev and the static build.
export default defineConfig({
  site: 'https://kitn-ai.github.io',
  base: '/chat',
  vite: { plugins: [tailwindcss(), Icons({ compiler: 'solid' })] },
  // Render the heading anchor as a CHILD of the heading (behavior: 'append'),
  // so the heading can be a flex row [text · #] — clean gap + hover reveal,
  // and the "#" inherits the heading's font size. (Starlight's default emits it
  // as a sibling, which is why it floated; we hide that one in CSS.)
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, {
        behavior: 'append',
        // Empty content — the visible "#" is added via CSS ::after so it's NOT
        // part of the heading text (otherwise the TOC reads "Preview#").
        properties: { className: ['kc-anchor'], 'aria-label': 'Link to this section' },
        content: [],
      }],
    ],
  },
  integrations: [
    icon(),
    solid(),
    starlight({
      title: 'kitn',
      // Single entry: Tailwind (layered for Starlight) + the kitn design system.
      customCss: ['./src/styles/app.css'],
      // Code blocks: vibrant Tokyo Night tokens on a near-black bg (matches the
      // kitn dark surface); GitHub Light for light mode.
      expressiveCode: {
        themes: ['tokyo-night', 'github-light'],
        styleOverrides: {
          borderRadius: '0.6rem',
          borderColor: 'var(--kc-line)',
          frames: { frameBoxShadowCssValue: 'none' },
        },
      },
      components: {
        Header: './src/components/overrides/Header.astro',
        SocialIcons: './src/components/overrides/SocialIcons.astro',
        ThemeSelect: './src/components/overrides/ThemeToggle.astro',
      },
      // Topic-based sidebars: the header nav (Docs · Components · Examples)
      // switches between these, each showing only its own pages (no redundant
      // topic title in the sidebar — the plugin's own switcher is hidden in CSS).
      plugins: [
        starlightSidebarTopics([
          {
            label: 'Docs',
            link: '/guides/introduction/',
            id: 'docs',
            items: [
              { label: 'Introduction', slug: 'guides/introduction' },
              { label: 'Installation', slug: 'guides/installation' },
              { label: 'Getting Started', slug: 'guides/getting-started' },
              { label: 'Theming', slug: 'guides/theming' },
              { label: 'Accessibility', slug: 'guides/accessibility' },
              { label: 'For AI Agents', slug: 'guides/for-ai-agents' },
              { label: 'Generative UI', slug: 'guides/generative-ui' },
              {
                label: 'Working with primitives',
                items: [
                  { label: 'How it\'s built', slug: 'guides/primitives/architecture' },
                  { label: 'Working with the components directly', slug: 'guides/primitives/using-primitives' },
                  { label: 'Run the kit locally', slug: 'guides/primitives/development' },
                  { label: 'Create or modify a component', slug: 'guides/primitives/extending' },
                ],
              },
              {
                label: 'Frameworks',
                items: [
                  { label: 'Overview', slug: 'guides/frameworks/overview' },
                  { label: 'HTML', slug: 'guides/frameworks/html' },
                  { label: 'React', slug: 'guides/frameworks/react' },
                  { label: 'Vue', slug: 'guides/frameworks/vue' },
                  { label: 'Svelte', slug: 'guides/frameworks/svelte' },
                  { label: 'Angular', slug: 'guides/frameworks/angular' },
                  { label: 'Solid', slug: 'guides/frameworks/solid' },
                ],
              },
              {
                label: 'Recipes',
                items: [
                  { label: 'Streaming', slug: 'guides/recipes/streaming' },
                  { label: 'Text to Speech', slug: 'guides/recipes/text-to-speech' },
                  { label: 'Speech to Text', slug: 'guides/recipes/speech-to-text' },
                ],
              },
            ],
          },
          {
            label: 'Components',
            link: '/components/artifact/',
            id: 'components',
            // Auto-listed from src/content/docs/components/*.mdx.
            items: [{ autogenerate: { directory: 'components' } }],
          },
          {
            label: 'Patterns',
            link: '/patterns/compose-your-own/',
            id: 'patterns',
            items: [
              { label: 'Compose your own shell', slug: 'patterns/compose-your-own' },
              { label: 'Custom chat header', slug: 'patterns/custom-chat-header' },
              { label: 'Button and popover menu', slug: 'patterns/popover-menu' },
              { label: 'Resizable split', slug: 'patterns/resizable-split' },
              { label: 'Empty & first-run state', slug: 'patterns/empty-state' },
              { label: 'Tool calls & reasoning', slug: 'patterns/tool-reasoning' },
              { label: 'Generative UI cards', slug: 'patterns/generative-ui-cards' },
              { label: 'Open an artifact from a message', slug: 'patterns/artifact-from-message' },
              { label: 'Attachments flow', slug: 'patterns/attachments-flow' },
            ],
          },
          {
            label: 'Examples',
            link: '/examples/drop-in-chat/',
            id: 'examples',
            items: [
              { label: 'Drop-in chat', slug: 'examples/drop-in-chat' },
              { label: 'Support widget', slug: 'examples/support-widget' },
              { label: 'Docked assistant', slug: 'examples/docked-assistant' },
              { label: 'Workspace app', slug: 'examples/workspace' },
              { label: 'Artifacts canvas', slug: 'examples/artifacts-canvas' },
              { label: 'RAG assistant', slug: 'examples/rag-assistant' },
              { label: 'Knowledge base', slug: 'examples/knowledge-base' },
              { label: 'Agentic assistant', slug: 'examples/agentic-assistant' },
              { label: 'Reasoning assistant', slug: 'examples/reasoning-assistant' },
              { label: 'Skills & slash commands', slug: 'examples/skills-assistant' },
              { label: 'Models & context', slug: 'examples/model-context' },
              { label: 'Voice assistant', slug: 'examples/voice-assistant' },
              { label: 'Custom theme', slug: 'examples/custom-theme' },
              { label: 'Remote cards', slug: 'examples/remote-cards' },
            ],
          },
          {
            label: 'Theme',
            link: '/theme/editor/',
            id: 'theme',
            icon: 'setting',
            items: [
              { label: 'Theme editor', slug: 'theme/editor' },
            ],
          },
        ]),
      ],
    }),
  ],
});
