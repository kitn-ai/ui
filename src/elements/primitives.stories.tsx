import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import './register'; // side-effect: registers kai-avatar, kai-badge, kai-tooltip, kai-button, …

// A purple square as a tiny offline-safe avatar image (proves the <img> path).
const AVATAR_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%234f46e5'/%3E%3C/svg%3E";

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-avatar': JSX.HTMLAttributes<HTMLElement> & { src?: string; alt?: string; fallback?: string; size?: string };
      'kai-badge': JSX.HTMLAttributes<HTMLElement> & { variant?: string };
      'kai-tooltip': JSX.HTMLAttributes<HTMLElement> & { content?: string; 'open-delay'?: number | string };
      'kai-button': JSX.HTMLAttributes<HTMLElement> & { variant?: string; size?: string; icon?: string; 'icon-trailing'?: string; label?: string; disabled?: boolean };
    }
  }
}

const meta = { title: 'Spikes/New Primitives', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Identity avatars — initials fallback, plus an image. */
export const Avatars: Story = {
  render: () => (
    <div class="flex items-center gap-3">
      <kai-avatar fallback="RT" size="sm" />
      <kai-avatar fallback="AI" />
      <kai-avatar src={AVATAR_SRC} fallback="RT" size="lg" />
    </div>
  ),
};

/** Pills — label, count, and citation marker. */
export const Badges: Story = {
  render: () => (
    <div class="flex items-center gap-3">
      <kai-badge>Beta</kai-badge>
      <kai-badge variant="count">3</kai-badge>
      <kai-badge variant="citation">1</kai-badge>
    </div>
  ),
};

/** Tooltip wrapping a kit button — hover or focus the controls. */
export const Tooltips: Story = {
  render: () => (
    <div class="flex items-center gap-4 p-16">
      <kai-tooltip content="Voice input">
        <kai-button variant="subtle" size="icon" icon="mic" label="Voice input" />
      </kai-tooltip>
      <kai-tooltip content="Add files or photos">
        <kai-button variant="ghost" size="sm" icon="plus">Add</kai-button>
      </kai-tooltip>
    </div>
  ),
};
