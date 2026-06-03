import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Source, SourceTrigger, SourceContent, SourceList } from './source';

const meta: Meta = {
  title: 'Components/Source',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Source href="https://solidjs.com/docs/basic-reactivity/signals">
      <SourceTrigger label="solidjs.com" />
      <SourceContent
        title="Signals - SolidJS"
        description="Signals are the most basic reactive primitive. They track a single value that changes over time."
      />
    </Source>
  ),
};

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
};

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
};

export const SourceListExample: Story = {
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
};
