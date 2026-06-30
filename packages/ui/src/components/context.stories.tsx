import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
} from './context';
import { componentDescription } from '../stories/docs/element-controls';

/**
 * Story for the compound `Context` family. `Context` is the root provider that
 * holds the token-usage values; the trigger/content/usage-row subcomponents read
 * from it. The controllable props all live on the `Context` root, so `Playground`
 * drives the root and composes a full hover-card breakdown.
 */
const meta = {
  title: 'Components/Elements/Context',
  component: Context,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A context-window usage indicator: a hover-card trigger with a used-percent ring, and a popover breaking down token usage (input, output, reasoning, cache) plus estimated cost.',
        'Wrap the composition in `Context` and pass `usedTokens` / `maxTokens` (plus optional per-category counts and `estimatedCost`); compose `ContextTrigger`, `ContextContent` (Header/Body/Footer), and the usage rows.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    usedTokens: {
      control: 'number',
      description: 'Tokens consumed so far. Drives the ring fill and progress bar.',
    },
    maxTokens: {
      control: 'number',
      description: 'Total context window size.',
    },
    inputTokens: {
      control: 'number',
      description: 'Prompt/input tokens (shown by `ContextInputUsage`).',
    },
    outputTokens: {
      control: 'number',
      description: 'Generated/output tokens (shown by `ContextOutputUsage`).',
    },
    reasoningTokens: {
      control: 'number',
      description: 'Reasoning tokens (shown by `ContextReasoningUsage`).',
    },
    cacheTokens: {
      control: 'number',
      description: 'Cached tokens (shown by `ContextCacheUsage`).',
    },
    estimatedCost: {
      control: 'number',
      description: 'Estimated cost in USD (shown by `ContextContentFooter`).',
    },
    warnThreshold: {
      control: 'number',
      description: 'Fraction (0–1) above which the bar turns yellow. Default `0.7`.',
    },
    dangerThreshold: {
      control: 'number',
      description: 'Fraction (0–1) above which the bar turns red. Default `0.9`.',
    },
  },
  args: {
    usedTokens: 85000,
    maxTokens: 128000,
    inputTokens: 60000,
    outputTokens: 15000,
    reasoningTokens: 8000,
    cacheTokens: 2000,
    estimatedCost: 0.45,
  },
  render: (args) => (
    <Context {...args}>
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <div class="space-y-1">
            <ContextInputUsage />
            <ContextOutputUsage />
            <ContextReasoningUsage />
            <ContextCacheUsage />
          </div>
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  ),
} satisfies Meta<typeof Context>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import {
  Context, ContextTrigger, ContextContent, ContextContentHeader,
  ContextContentBody, ContextContentFooter,
  ContextInputUsage, ContextOutputUsage, ContextReasoningUsage, ContextCacheUsage,
} from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

const usage = `<Context usedTokens={85000} maxTokens={128000} inputTokens={60000} outputTokens={15000} reasoningTokens={8000} cacheTokens={2000} estimatedCost={0.45}>
  <ContextTrigger />
  <ContextContent>
    <ContextContentHeader />
    <ContextContentBody>
      <div class="space-y-1">
        <ContextInputUsage />
        <ContextOutputUsage />
        <ContextReasoningUsage />
        <ContextCacheUsage />
      </div>
    </ContextContentBody>
    <ContextContentFooter />
  </ContextContent>
</Context>`;

/** Interactive playground: tweak token counts to watch the ring, bar color, and breakdown update. */
export const Playground: Story = {
  ...src(usage),
};

export const LowUsage: Story = {
  args: {
    usedTokens: 12000,
    maxTokens: 128000,
    inputTokens: 8000,
    outputTokens: 4000,
    reasoningTokens: undefined,
    cacheTokens: undefined,
    estimatedCost: 0.02,
  },
  ...src(usage),
};

export const MediumUsage: Story = {
  args: {
    usedTokens: 85000,
    maxTokens: 128000,
    inputTokens: 60000,
    outputTokens: 15000,
    reasoningTokens: 8000,
    cacheTokens: 2000,
    estimatedCost: 0.45,
  },
  ...src(usage),
};

export const HighUsage: Story = {
  args: {
    usedTokens: 122000,
    maxTokens: 128000,
    inputTokens: 90000,
    outputTokens: 22000,
    reasoningTokens: 10000,
    cacheTokens: undefined,
    estimatedCost: 1.85,
  },
  ...src(usage),
};

export const WithCost: Story = {
  args: {
    usedTokens: 50000,
    maxTokens: 200000,
    inputTokens: 35000,
    outputTokens: 10000,
    reasoningTokens: 5000,
    cacheTokens: undefined,
    estimatedCost: 0.32,
  },
  ...src(usage),
};

const customThresholdUsage = `<Context
  usedTokens={110000}
  maxTokens={200000}
  inputTokens={70000}
  outputTokens={40000}
  estimatedCost={0.65}
  warnThreshold={0.5}
  dangerThreshold={0.75}
>
  <ContextTrigger />
  <ContextContent>
    <ContextContentHeader />
    <ContextContentBody>
      <div class="space-y-1">
        <ContextInputUsage />
        <ContextOutputUsage />
      </div>
    </ContextContentBody>
    <ContextContentFooter />
  </ContextContent>
</Context>`;

/**
 * Custom thresholds: `warnThreshold=0.5` / `dangerThreshold=0.75` so the bar
 * turns yellow at 50% and red at 75%. At 55% (110 000 / 200 000) the bar renders
 * yellow even though the defaults would show green at this level.
 */
export const CustomThresholds: Story = {
  args: {
    usedTokens: 110000,
    maxTokens: 200000,
    inputTokens: 70000,
    outputTokens: 40000,
    reasoningTokens: undefined,
    cacheTokens: undefined,
    estimatedCost: 0.65,
    warnThreshold: 0.5,
    dangerThreshold: 0.75,
  },
  ...src(customThresholdUsage),
};
