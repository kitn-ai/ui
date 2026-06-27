import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import type { JSX } from 'solid-js';
import './stat';

// Declare the custom element tag for SolidJS JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-stat': JSX.HTMLAttributes<HTMLElement> & { label?: string; value?: string; hint?: string; theme?: string };
    }
  }
}

const meta: Meta = {
  title: 'Labs/Foundations/Stat',
};
export default meta;

const grid: JSX.CSSProperties = {
  display: 'grid',
  'grid-template-columns': 'repeat(3, minmax(0, 1fr))',
  gap: '0.75rem',
  'max-width': '720px',
  padding: '1rem',
};

export const Dashboard: StoryObj = {
  render: () => (
    <div style={grid}>
      <kai-stat label="Sessions" value="408"></kai-stat>
      <kai-stat label="Total tokens" value="181.5M"></kai-stat>
      <kai-stat label="Current streak" value="17d"></kai-stat>
      <kai-stat label="Favorite model" value="Opus 4.8"></kai-stat>
      <kai-stat label="Avg. response" value="2.4s" hint="−18% vs. last week"></kai-stat>
      <kai-stat label="Tools run" value="1,204"></kai-stat>
    </div>
  ),
};

export const RichValue: StoryObj = {
  render: () => (
    <div style={{ 'max-width': '240px', padding: '1rem' }}>
      <kai-stat label="Favorite model">
        <span style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.375rem' }}>
          <span style={{ width: '0.5rem', height: '0.5rem', 'border-radius': '9999px', background: 'var(--color-primary)' }}></span>
          Opus 4.8
        </span>
      </kai-stat>
    </div>
  ),
};
