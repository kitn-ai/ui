import type { StorybookConfig } from 'storybook-solidjs-vite';
import remarkGfm from 'remark-gfm';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  framework: 'storybook-solidjs-vite',
  // Serve the generated agent files so the docs can link to them directly.
  staticDirs: [
    { from: '../llms.txt', to: '/llms.txt' },
    { from: '../llms-full.txt', to: '/llms-full.txt' },
    // Sample artifact (cross-linked HTML pages + image + PDF) framed by
    // <kc-artifact> stories at a stable URL — no backend needed.
    { from: '../examples/artifact-fixtures', to: '/artifact-fixtures' },
  ],
  addons: [
    'storybook-dark-mode',
    '@storybook/addon-themes',
    '@storybook/addon-vitest',
    // Registers the a11y preview annotations (axe) so accessibility checks run
    // both in the Storybook UI panel and — via @storybook/addon-vitest — as part
    // of the `vitest --project=storybook` test run (SB10 a11y-in-test).
    '@storybook/addon-a11y',
    {
      name: '@storybook/addon-docs',
      options: {
        // MDX is CommonMark by default — enable GitHub-Flavored Markdown so
        // pipe tables (and strikethrough/task lists) render in the docs pages.
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
  ],
  async viteFinal(config) {
    const tailwindcss = (await import('@tailwindcss/postcss')).default;
    config.css = {
      ...config.css,
      postcss: {
        plugins: [tailwindcss()],
      },
    };
    return config;
  },
};

export default config;
