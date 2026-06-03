import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { For } from 'solid-js';
import { Button } from '../ui/button';

const meta: Meta = {
  title: 'Components/VoiceInput',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div class="relative inline-flex items-center justify-center">
      <Button variant="ghost" size="icon-sm" class="relative z-10 rounded-full">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </Button>
    </div>
  ),
};

export const RecordingState: Story = {
  render: () => (
    <div class="relative inline-flex items-center justify-center">
      <For each={[0, 1, 2]}>
        {(index) => (
          <div
            class="absolute inset-0 animate-ping rounded-full border-2 border-red-400/30"
            style={{
              "animation-delay": `${index * 0.3}s`,
              "animation-duration": "2s",
            }}
          />
        )}
      </For>
      <Button
        variant="ghost"
        size="icon-sm"
        class="relative z-10 rounded-full bg-destructive text-white hover:bg-destructive/80 transition-all duration-300"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      </Button>
    </div>
  ),
};

export const ProcessingState: Story = {
  render: () => (
    <div class="relative inline-flex items-center justify-center">
      <Button variant="ghost" size="icon-sm" class="relative z-10 rounded-full" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      </Button>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div class="flex items-center gap-8">
      <div class="flex flex-col items-center gap-2">
        <div class="relative inline-flex items-center justify-center">
          <Button variant="ghost" size="icon-sm" class="relative z-10 rounded-full">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </Button>
        </div>
        <span class="text-xs text-muted-foreground">Idle</span>
      </div>

      <div class="flex flex-col items-center gap-2">
        <div class="relative inline-flex items-center justify-center">
          <For each={[0, 1, 2]}>
            {(index) => (
              <div
                class="absolute inset-0 animate-ping rounded-full border-2 border-red-400/30"
                style={{
                  "animation-delay": `${index * 0.3}s`,
                  "animation-duration": "2s",
                }}
              />
            )}
          </For>
          <Button
            variant="ghost"
            size="icon-sm"
            class="relative z-10 rounded-full bg-destructive text-white hover:bg-destructive/80"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </Button>
        </div>
        <span class="text-xs text-muted-foreground">Recording</span>
      </div>

      <div class="flex flex-col items-center gap-2">
        <div class="relative inline-flex items-center justify-center">
          <Button variant="ghost" size="icon-sm" class="relative z-10 rounded-full" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          </Button>
        </div>
        <span class="text-xs text-muted-foreground">Processing</span>
      </div>
    </div>
  ),
};
