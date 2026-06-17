// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import solid from '@astrojs/solid-js';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// PROTOTYPE — Astro Starlight evaluation for the kitn docs site.
// `base: '/chat'` proves GitHub Pages readiness (kitn-ai.github.io/chat). The
// dev server serves under that base too; assets are referenced with
// import.meta.env.BASE_URL so they resolve in both dev and the static build.
export default defineConfig({
  site: 'https://kitn-ai.github.io',
  base: '/chat',
  vite: { plugins: [tailwindcss()] },
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
      // segmented like Vercel AI Elements: Docs · Components · Examples
      sidebar: [
        {
          label: 'Docs',
          items: [
            { label: 'Introduction', slug: 'guides/example' },
            { label: 'Installation', slug: 'reference/example' },
          ],
        },
        {
          label: 'Components',
          items: [{ label: 'Attachments', slug: 'components/attachments' }],
        },
        {
          label: 'Examples',
          items: [{ label: 'Full Chat App', slug: 'guides/example' }],
        },
      ],
    }),
  ],
});
