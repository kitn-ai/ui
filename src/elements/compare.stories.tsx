import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount, createSignal } from 'solid-js';
import './register'; // side effect: registers <kai-compare>
import type { ResponseCompareData, CompareSelection } from '../components/response-compare-types';

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-compare': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

type CompareEl = HTMLElement & { data?: ResponseCompareData; selection?: CompareSelection; layout?: string };

const DATA: ResponseCompareData = {
  prompt: 'Which response do you prefer?',
  candidates: [
    {
      id: 'A',
      label: 'Response A',
      content:
        'Batch the per-item lookups into **one query** (`WHERE id IN (…)`) and hydrate the cart from the result — one round-trip instead of N.',
    },
    {
      id: 'B',
      label: 'Response B',
      content:
        'Add a cache in front of the per-item lookup so repeat hits are fast, and let the slow path warm it.',
    },
  ],
};

/** Live `<kai-compare>` — pick a candidate, it collapses to the chosen one and
 *  emits `kai-compare-select` (chosenId + rejectedIds). */
function CompareDemo(props: { layout?: string }) {
  let el: CompareEl | undefined;
  const [picked, setPicked] = createSignal<CompareSelection>();
  onMount(() => {
    if (!el) return;
    el.data = DATA;
    if (props.layout) el.layout = props.layout;
    el.addEventListener('kai-compare-select', (e) => setPicked((e as CustomEvent<CompareSelection>).detail));
  });
  return (
    <div style={{ padding: '28px', 'max-width': '820px', 'font-family': 'system-ui, sans-serif' }}>
      <kai-compare ref={(e) => (el = e as CompareEl)} />
      <p style={{ 'margin-top': '14px', color: '#666', 'font-size': '14px' }}>
        {picked()
          ? `Preferred ${picked()!.chosenId} · rejected ${picked()!.rejectedIds.join(', ')} → send this pair to your model.`
          : 'Pick a response…'}
      </p>
    </div>
  );
}

const meta = {
  title: 'Components/Compare',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<kai-compare>` shows two candidate responses side-by-side ("which do you prefer?"). Set `data` as a JS **property** with exactly two candidates; both can stream (reassign a fresh `data` ref per chunk). Picking one collapses the split to the chosen response and emits a non-bubbling `kai-compare-select` CustomEvent with `{ chosenId, rejectedIds }` — feed that `(prompt, chosen, rejected)` pair back to your model as a preference signal. Layout auto-switches columns↔stacked by container width (override with `layout`).',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Auto layout (columns on wide, stacked on narrow). */
export const Default: Story = { name: 'Pick a response', render: () => <CompareDemo /> };
/** Forced side-by-side columns. */
export const Columns: Story = { render: () => <CompareDemo layout="columns" /> };
/** Forced stacked (narrow). */
export const Stacked: Story = { render: () => <CompareDemo layout="stacked" /> };
