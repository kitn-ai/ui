import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import {
  Context, ContextTrigger, ContextContent,
  ContextContentHeader, ContextContentBody, ContextContentFooter,
  ContextInputUsage, ContextOutputUsage, ContextReasoningUsage, ContextCacheUsage,
  ModelSwitcher, Button, Separator,
} from '../index';
import type { ModelOption } from '../types';
import { createSignal } from 'solid-js';

const meta: Meta = {
  title: 'Examples/Context & Token Usage',
  parameters: { layout: 'padded', options: { showPanel: false } },
};

export default meta;
type Story = StoryObj;

export const LowUsage: Story = {
  name: 'Low Usage (Green)',
  render: () => (
    <div class="p-8">
      <p class="text-sm text-muted-foreground mb-4">Early in a conversation -- minimal token usage.</p>
      <Context usedTokens={4200} maxTokens={200000} inputTokens={2800} outputTokens={1400} estimatedCost={0.012}>
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <div class="space-y-1.5">
              <ContextInputUsage />
              <ContextOutputUsage />
            </div>
          </ContextContentBody>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    </div>
  ),
};

export const MediumUsage: Story = {
  name: 'Medium Usage (Yellow)',
  render: () => (
    <div class="p-8">
      <p class="text-sm text-muted-foreground mb-4">Extended conversation with reasoning -- approaching 75% usage.</p>
      <Context usedTokens={150000} maxTokens={200000} inputTokens={85000} outputTokens={42000} reasoningTokens={23000} estimatedCost={0.89}>
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <div class="space-y-1.5">
              <ContextInputUsage />
              <ContextOutputUsage />
              <ContextReasoningUsage />
            </div>
          </ContextContentBody>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    </div>
  ),
};

export const HighUsage: Story = {
  name: 'High Usage (Red)',
  render: () => (
    <div class="p-8">
      <p class="text-sm text-muted-foreground mb-4">Near the context limit -- user should consider starting a new conversation.</p>
      <Context usedTokens={189000} maxTokens={200000} inputTokens={110000} outputTokens={54000} reasoningTokens={25000} estimatedCost={1.42}>
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <div class="space-y-1.5">
              <ContextInputUsage />
              <ContextOutputUsage />
              <ContextReasoningUsage />
            </div>
          </ContextContentBody>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    </div>
  ),
};

export const WithCacheBreakdown: Story = {
  name: 'Full Breakdown with Cache',
  render: () => (
    <div class="p-8">
      <p class="text-sm text-muted-foreground mb-4">Detailed usage including cache hit tokens.</p>
      <Context usedTokens={82000} maxTokens={200000} inputTokens={45000} outputTokens={22000} reasoningTokens={15000} cacheTokens={32000} estimatedCost={0.38}>
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <div class="space-y-1.5">
              <ContextInputUsage />
              <ContextOutputUsage />
              <ContextReasoningUsage />
              <ContextCacheUsage />
            </div>
          </ContextContentBody>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    </div>
  ),
};

export const InHeaderBar: Story = {
  name: 'In a Header Bar',
  render: () => {
    const [modelId, setModelId] = createSignal('claude-4');
    const models: ModelOption[] = [
      { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
      { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
    ];

    return (
      <div class="w-full max-w-3xl">
        <p class="text-sm text-muted-foreground mb-4 px-4">Context usage as it appears in the app header, alongside model switcher.</p>

        <div class="bg-background rounded-xl shadow-lg overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5">
            <div class="flex items-center gap-3">
              <h2 class="text-sm font-semibold text-foreground">Database indexing strategies</h2>
              <span class="text-xs text-muted-foreground">24 messages</span>
            </div>
            <div class="flex items-center gap-2">
              <ModelSwitcher models={models} currentModelId={modelId()} onModelChange={setModelId} />
              <Context usedTokens={67000} maxTokens={200000} inputTokens={38000} outputTokens={29000} estimatedCost={0.31}>
                <ContextTrigger />
                <ContextContent>
                  <ContextContentHeader />
                  <ContextContentBody>
                    <div class="space-y-1.5">
                      <ContextInputUsage />
                      <ContextOutputUsage />
                    </div>
                  </ContextContentBody>
                  <ContextContentFooter />
                </ContextContent>
              </Context>
            </div>
          </div>
          <Separator />
          <div class="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Chat content area
          </div>
        </div>
      </div>
    );
  },
};
