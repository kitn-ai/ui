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
            label: 'Examples',
            link: '/examples/drop-in-chat/',
            id: 'examples',
            items: [
              { label: 'Drop-in chat', slug: 'examples/drop-in-chat' },
              { label: 'Full Chat App', slug: 'examples/full-chat-app' },
            ],
          },
        ]),
      ],
    }),
  ],
});
