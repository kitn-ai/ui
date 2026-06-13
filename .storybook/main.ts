import type { StorybookConfig } from 'storybook-solidjs-vite';
import remarkGfm from 'remark-gfm';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  framework: 'storybook-solidjs-vite',
  // Serve the generated agent files so the docs can link to them directly.
  staticDirs: [
    { from: '../llms.txt', to: '/llms.txt' },
    { from: '../llms-full.txt', to: '/llms-full.txt' },
  ],
  addons: [
    'storybook-dark-mode',
    '@storybook/addon-themes',
    '@storybook/addon-vitest',
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
