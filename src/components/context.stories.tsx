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

const meta: Meta = {
  title: 'Components/Context',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const LowUsage: Story = {
  render: () => (
    <Context usedTokens={12000} maxTokens={128000} inputTokens={8000} outputTokens={4000} estimatedCost={0.02}>
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
    </Context>
  ),
};

export const MediumUsage: Story = {
  render: () => (
    <Context usedTokens={85000} maxTokens={128000} inputTokens={60000} outputTokens={15000} reasoningTokens={8000} cacheTokens={2000} estimatedCost={0.45}>
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
};

export const HighUsage: Story = {
  render: () => (
    <Context usedTokens={122000} maxTokens={128000} inputTokens={90000} outputTokens={22000} reasoningTokens={10000} estimatedCost={1.85}>
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <div class="space-y-1">
            <ContextInputUsage />
            <ContextOutputUsage />
            <ContextReasoningUsage />
          </div>
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  ),
};

export const WithCost: Story = {
  render: () => (
    <Context usedTokens={50000} maxTokens={200000} inputTokens={35000} outputTokens={10000} reasoningTokens={5000} estimatedCost={0.32}>
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <div class="space-y-1">
            <ContextInputUsage />
            <ContextOutputUsage />
            <ContextReasoningUsage />
          </div>
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  ),
};
