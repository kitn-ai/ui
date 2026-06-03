import type { StorybookConfig } from 'storybook-solidjs-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: 'storybook-solidjs-vite',
  addons: [
    '@storybook/addon-themes',
    '@storybook/addon-vitest',
    '@storybook/addon-docs'
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
