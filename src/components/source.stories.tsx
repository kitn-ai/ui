import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Source, SourceTrigger, SourceContent, SourceList } from './source';

const meta = {
  title: 'Components/Source',
  component: Source,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'An inline citation chip with a hover-card preview. Compose `Source` (root, holds the `href`) with `SourceTrigger` (the clickable pill) and `SourceContent` (the hover preview). `SourceList` lays out several side by side.',
          '**When to use:** to cite a referenced web source inline in an assistant message — show a compact domain/number pill that previews the title and description on hover.',
          '**How to use:** wrap `SourceTrigger` and `SourceContent` in `Source` with the target `href`. Use `label` for custom text or a citation number, `showFavicon` for the site icon, and pass `title`/`description` to `SourceContent`.',
          '**Placement:** within message body text as citations, or grouped under a message in a `SourceList`.',
        ].join('\n\n'),
      },
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    href: {
      control: 'text',
      description: 'Target URL of the source. The domain is derived from it for the default label.',
    },
    children: { control: false, description: 'Trigger and content composition.' },
  },
  args: {
    href: 'https://solidjs.com/docs/basic-reactivity/signals',
  },
  render: (args) => (
    <Source href={args.href}>
      <SourceTrigger label="solidjs.com" />
      <SourceContent
        title="Signals - SolidJS"
        description="Signals are the most basic reactive primitive. They track a single value that changes over time."
      />
    </Source>
  ),
} satisfies Meta<typeof Source>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Source, SourceTrigger, SourceContent, SourceList } from '@kitn-ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — set the `href` and hover the chip to preview. */
export const Playground: Story = {
  ...src(`<Source href="https://solidjs.com/docs/basic-reactivity/signals">
  <SourceTrigger label="solidjs.com" />
  <SourceContent
    title="Signals - SolidJS"
    description="The most basic reactive primitive — a single value that changes over time."
  />
</Source>`),
};

/** Trigger shows the site favicon and derives its label from the domain. */
export const WithFavicon: Story = {
  render: () => (
    <Source href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">
      <SourceTrigger showFavicon />
      <SourceContent
        title="JavaScript | MDN"
        description="JavaScript (JS) is a lightweight interpreted programming language with first-class functions."
      />
    </Source>
  ),
  ...src(`<Source href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">
  <SourceTrigger showFavicon />
  <SourceContent title="JavaScript | MDN" description="A lightweight interpreted language." />
</Source>`),
};

/** A numbered citation chip. */
export const NumberedCitation: Story = {
  render: () => (
    <Source href="https://example.com/article">
      <SourceTrigger label={1} />
      <SourceContent
        title="Example Article"
        description="This is a sample article used as a citation reference."
      />
    </Source>
  ),
  ...src(`<Source href="https://example.com/article">
  <SourceTrigger label={1} />
  <SourceContent title="Example Article" description="A sample citation reference." />
</Source>`),
};

/** Several sources laid out together with `SourceList` (showcase). */
export const SourceListExample: Story = {
  name: 'Source list',
  render: () => (
    <SourceList>
      <Source href="https://solidjs.com">
        <SourceTrigger showFavicon />
        <SourceContent title="SolidJS" description="Simple and performant reactivity for building user interfaces." />
      </Source>
      <Source href="https://developer.mozilla.org">
        <SourceTrigger showFavicon />
        <SourceContent title="MDN Web Docs" description="Resources for developers, by developers." />
      </Source>
      <Source href="https://tailwindcss.com">
        <SourceTrigger showFavicon />
        <SourceContent title="Tailwind CSS" description="A utility-first CSS framework." />
      </Source>
    </SourceList>
  ),
  ...src(`<SourceList>
  <Source href="https://solidjs.com">
    <SourceTrigger showFavicon />
    <SourceContent title="SolidJS" description="Simple and performant reactivity." />
  </Source>
  <Source href="https://tailwindcss.com">
    <SourceTrigger showFavicon />
    <SourceContent title="Tailwind CSS" description="A utility-first CSS framework." />
  </Source>
</SourceList>`),
};
