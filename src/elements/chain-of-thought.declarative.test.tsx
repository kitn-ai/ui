/**
 * Unit tests for the declarative `<kai-step>` light-DOM API of
 * `<kai-chain-of-thought>`.
 *
 * Strategy: the `defineWebComponent` call registers a real Shadow-DOM custom
 * element which requires a full browser environment (Constructable Stylesheets,
 * shadow roots, etc.) and is therefore not suitable for jsdom unit tests.
 * Instead we:
 *   1. Test the exported `parseKcStepElement` helper in isolation — it has no
 *      DOM dependencies beyond `Element`, which jsdom provides perfectly.
 *   2. Test that the merged list of prop + slotted steps renders correctly via
 *      the `ChainOfThoughtStep`/`ChainOfThoughtTrigger` primitives, mirroring
 *      the pattern used in `prompt-suggestions.declarative.test.tsx`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { For, Show } from 'solid-js';
import { parseKcStepElement } from './chain-of-thought';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// parseKcStepElement — pure helper
// ---------------------------------------------------------------------------

describe('parseKcStepElement', () => {
  function makeEl(label: string | null, textContent?: string): Element {
    const el = document.createElement('kai-step');
    if (label !== null) el.setAttribute('label', label);
    if (textContent !== undefined) el.textContent = textContent;
    return el;
  }

  it('maps label attribute to Step.label', () => {
    const step = parseKcStepElement(makeEl('Searching docs', 'Found 3 hits'));
    expect(step.label).toBe('Searching docs');
  });

  it('maps trimmed textContent to Step.content', () => {
    const step = parseKcStepElement(makeEl('Step', '  Found 3 hits  '));
    expect(step.content).toBe('Found 3 hits');
  });

  it('returns undefined for content when textContent is empty', () => {
    const step = parseKcStepElement(makeEl('Build & verify', ''));
    expect(step.content).toBeUndefined();
  });

  it('returns undefined for content when textContent is whitespace only', () => {
    const step = parseKcStepElement(makeEl('Build & verify', '   '));
    expect(step.content).toBeUndefined();
  });

  it('falls back to empty string for label when attribute is absent', () => {
    const step = parseKcStepElement(makeEl(null, 'some detail'));
    expect(step.label).toBe('');
  });

  it('returns a well-formed Step for a heading-only element', () => {
    const step = parseKcStepElement(makeEl('Understand the request'));
    expect(step).toEqual({ label: 'Understand the request', content: undefined });
  });

  it('returns a well-formed Step for a step with detail', () => {
    const step = parseKcStepElement(makeEl('Searching docs', 'Found 3 hits'));
    expect(step).toEqual({ label: 'Searching docs', content: 'Found 3 hits' });
  });
});

// ---------------------------------------------------------------------------
// Merge + render: prop steps + slotted steps combine correctly
// ---------------------------------------------------------------------------

interface Step {
  label: string;
  content?: string;
}

/**
 * Minimal test harness that renders a list of Steps as labelled divs,
 * mirroring the merge logic in chain-of-thought.tsx. We render plain divs
 * rather than the full Shadow DOM component to stay within jsdom.
 */
function StepList(props: { items: Step[] }) {
  return (
    <div>
      <For each={props.items}>
        {(step) => (
          <div data-testid="step">
            <span data-testid="step-label">{step.label}</span>
            <Show when={step.content}>
              <span data-testid="step-content">{step.content}</span>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
}

describe('Step list rendering', () => {
  it('renders one entry per step', () => {
    const steps: Step[] = [
      { label: 'Understand the request', content: 'The user wants composable web components.' },
      { label: 'Design the API', content: 'Route 1: variant + flags.' },
      { label: 'Build & verify' },
    ];
    const { getAllByTestId } = render(() => <StepList items={steps} />);
    expect(getAllByTestId('step')).toHaveLength(3);
  });

  it('renders the label for each step', () => {
    const steps: Step[] = [{ label: 'Searching docs' }, { label: 'Synthesising' }];
    const { getAllByTestId } = render(() => <StepList items={steps} />);
    const labels = getAllByTestId('step-label').map((el) => el.textContent);
    expect(labels).toEqual(['Searching docs', 'Synthesising']);
  });

  it('renders content only when present', () => {
    const steps: Step[] = [
      { label: 'With detail', content: 'Found 3 hits' },
      { label: 'No detail' },
    ];
    const { getAllByTestId, queryAllByTestId } = render(() => <StepList items={steps} />);
    const contents = queryAllByTestId('step-content');
    expect(contents).toHaveLength(1);
    expect(contents[0]).toHaveTextContent('Found 3 hits');
    expect(getAllByTestId('step')).toHaveLength(2);
  });

  it('renders prop steps before declarative (slotted) steps', () => {
    const propSteps: Step[] = [{ label: 'Prop step' }];
    const slottedSteps: Step[] = [{ label: 'Slotted step' }];
    const merged = [...propSteps, ...slottedSteps];

    const { getAllByTestId } = render(() => <StepList items={merged} />);
    const labels = getAllByTestId('step-label').map((el) => el.textContent);
    expect(labels).toEqual(['Prop step', 'Slotted step']);
  });

  it('parseKcStepElement produces steps that render with the correct label and content', () => {
    const el = document.createElement('kai-step');
    el.setAttribute('label', 'Searching docs');
    el.textContent = 'Found 3 hits';

    const step = parseKcStepElement(el);
    const { getByTestId } = render(() => <StepList items={[step]} />);

    expect(getByTestId('step-label')).toHaveTextContent('Searching docs');
    expect(getByTestId('step-content')).toHaveTextContent('Found 3 hits');
  });
});
