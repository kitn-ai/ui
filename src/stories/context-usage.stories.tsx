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
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'Show how much of the model\'s context window is consumed. `<kai-context>` (or its SolidJS `Context` primitive) takes token counts and renders a circular meter trigger + hover-card breakdown.',
          '',
          '**Color thresholds** are configurable via `warnThreshold` (default `0.7`) and `dangerThreshold` (default `0.9`) props on both `<Context>` and `<kai-context>`:',
          '- Green (`bg-primary`): `usedTokens / maxTokens` ≤ `warnThreshold`',
          '- Yellow (`bg-yellow-400`): above `warnThreshold`',
          '- Red (`bg-red-400`): above `dangerThreshold`',
          '',
          'When the computed severity level changes, `<kai-context>` fires a **`kai-threshold-change`** CustomEvent with `detail.level` set to `\'ok\'`, `\'warn\'`, or `\'danger\'`.',
          '',
          '**Where token counts come from:** read them from the API response `usage` object (`input_tokens`, `output_tokens`, `cache_read_input_tokens`, etc.) after each turn and pass them as props. The element fires no data-fetching events.',
          '',
          '**Live-update pattern:** for SolidJS, drive the `Context` props from reactive signals that you update after each streaming response completes. The element re-renders automatically when props change.',
          '',
          '**`<kai-context>` web-component route:** pass a single `context` object as a **property** (not an attribute — attributes only accept strings). Set `warnThreshold` / `dangerThreshold` as numeric properties to override defaults. The WC renders the full trigger + popover for you with no composition needed.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const LowUsage: Story = {
  name: 'Low Usage (Green)',
  parameters: {
    docs: {
      description: {
        story: 'Early in a conversation. `usedTokens / maxTokens` ≤ `warnThreshold` (default 70%) → green meter. Only input + output rows shown; omit `reasoningTokens` / `cacheTokens` to hide those rows.',
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story: '`usedTokens / maxTokens` > `warnThreshold` (default 70%) → yellow meter. Add `reasoningTokens` to surface a reasoning row in the breakdown. Pass `warnThreshold` to `<Context>` / `<kai-context>` to override the 70% default.',
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story: '`usedTokens / maxTokens` > `dangerThreshold` (default 90%) → red meter. Pass `dangerThreshold` to `<Context>` / `<kai-context>` to override the 90% default. Signal to the user to start a new conversation.',
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story: 'Add `cacheTokens` to expose the cache row. From the API: cache-hit tokens come from `usage.cache_read_input_tokens` in the response; cache-write tokens from `usage.cache_creation_input_tokens`. Both count toward `usedTokens`.',
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story: '`Context` (or `<kai-context>`) is a plain inline element — place it anywhere in your header. Here it sits next to a `ModelSwitcher`. Drive both from reactive signals that you update after each API response.',
      },
    },
  },
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
