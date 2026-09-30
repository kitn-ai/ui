import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { expect, waitFor } from 'storybook/test';
// The kai-* elements are registered by .storybook/preview.ts, from the built bundle.

/**
 * The question panel built from your own parts. Put `<kai-question>` elements (each with its
 * `<kai-question-option>` rows) inside `<kai-question-panel>` and the app owns the questions;
 * `questions` is the preset over the same parts, and the two draw the same panel. The children
 * render nothing themselves: the panel reads them and keeps the tabs, Back and Next, the review
 * step and Submit.
 *
 * It never settles the tool call. It fires `kai-questions-submit` with the AskResult and
 * `kai-questions-dismiss` with the partial answers; your handler calls `answerQuestions` or
 * `settlePendingQuestions`, and shows `<kai-questions-waiting>` after a dismiss.
 */
const meta: Meta = {
  title: 'Components/Question Panel Composed',
  parameters: { layout: 'padded' },
};
export default meta;

// Hand-written HTML for the "Show code" panel: real consumer markup, not the story's JSX.
const src = (code: string) => ({ docs: { source: { language: 'html', code } } });

const FRAME = { 'max-width': '46rem', margin: '0 auto' } as const;

/** Two questions written as children, with a Review step between them and Submit. */
export const Composed: StoryObj = {
  render: () => (
    <div style={FRAME}>
      <kai-question-panel focusOnOpen={false} toolCallId="call_1">
        <kai-question question-id="scope" header="Scope" question="Which part of the repo should I clean up?" kind="choice">
          <kai-question-option label="Just this package" description="Only packages/ui, nothing else moves" />
          <kai-question-option label="Whole workspace" description="Every package, including the examples" />
          <kai-question-option label="Docs only" description="Stale pages and broken links, no code" />
        </kai-question>
        <kai-question question-id="tone" header="Tone" question="How formal should the release notes read?" kind="choice">
          <kai-question-option label="Casual" description="Contractions, short sentences" />
          <kai-question-option label="Formal" description="Full sentences, no contractions" />
        </kai-question>
      </kai-question-panel>
    </div>
  ),
  parameters: src(`<kai-question-panel id="panel" tool-call-id="call_1">
  <kai-question question-id="scope" header="Scope" question="Which part of the repo should I clean up?" kind="choice">
    <kai-question-option label="Just this package" description="Only packages/ui, nothing else moves"></kai-question-option>
    <kai-question-option label="Whole workspace" description="Every package, including the examples"></kai-question-option>
    <kai-question-option label="Docs only" description="Stale pages and broken links, no code"></kai-question-option>
  </kai-question>
  <kai-question question-id="tone" header="Tone" question="How formal should the release notes read?" kind="choice">
    <kai-question-option label="Casual" description="Contractions, short sentences"></kai-question-option>
    <kai-question-option label="Formal" description="Full sentences, no contractions"></kai-question-option>
  </kai-question>
</kai-question-panel>

<script type="module">
  const panel = document.getElementById('panel');
  panel.addEventListener('kai-questions-submit', (e) => {
    // e.detail.result is the AskResult: hand it to answerQuestions() as the call's tool result
    console.log(e.detail.toolCallId, e.detail.result);
  });
  panel.addEventListener('kai-questions-dismiss', (e) => {
    // partial answers so far: show <kai-questions-waiting> where the composer is
    console.log(e.detail.answers);
  });
</script>`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const panel = canvasElement.querySelector('kai-question-panel')!;
    await waitFor(() => expect(panel.shadowRoot!.querySelectorAll('[role="tab"]').length).toBe(3));
  },
};

/** The same panel from the `questions` preset. Set it as a JS property; the output of `questionsFromToolCall` fits as is. */
export const Preset: StoryObj = {
  render: () => (
    <div style={FRAME}>
      <kai-question-panel
        focusOnOpen={false}
        ref={(e) => {
          (e as HTMLElement & { questions: unknown }).questions = [
            { id: 'scope', header: 'Scope', question: 'Which part of the repo should I clean up?', kind: 'choice', required: true, options: [{ label: 'Just this package', description: 'Only packages/ui, nothing else moves' }, { label: 'Whole workspace', description: 'Every package, including the examples' }, { label: 'Docs only', description: 'Stale pages and broken links, no code' }] },
            { id: 'tone', header: 'Tone', question: 'How formal should the release notes read?', kind: 'choice', required: true, options: [{ label: 'Casual', description: 'Contractions, short sentences' }, { label: 'Formal', description: 'Full sentences, no contractions' }] },
          ];
        }}
      />
    </div>
  ),
  parameters: src(`<kai-question-panel id="panel"></kai-question-panel>

<script type="module">
  const set = questionsFromToolCall('kai_ask', call.input, { id: call.id });
  const panel = document.getElementById('panel');
  panel.toolCallId = set.id;
  panel.questions = set.questions; // a JS property, never an attribute
</script>`),
};

/** Replace the "Let's chat" control with your own through the `dismiss` slot; a click anywhere in it dismisses. */
export const DismissSlot: StoryObj = {
  name: 'Dismiss Slot',
  render: () => (
    <div style={FRAME}>
      <kai-question-panel focusOnOpen={false}>
        <kai-question question-id="tone" header="Tone" question="How formal should the release notes read?" kind="choice">
          <kai-question-option label="Casual" />
          <kai-question-option label="Formal" />
        </kai-question>
        <button slot="dismiss" type="button" style={{ background: 'none', border: '0', 'text-decoration': 'underline', color: 'var(--color-muted-foreground)' }}>Answer later</button>
      </kai-question-panel>
    </div>
  ),
  parameters: src(`<kai-question-panel>
  <kai-question question-id="tone" header="Tone" question="How formal should the release notes read?" kind="choice">
    <kai-question-option label="Casual"></kai-question-option>
    <kai-question-option label="Formal"></kai-question-option>
  </kai-question>
  <button slot="dismiss" type="button">Answer later</button>
</kai-question-panel>`),
};

/** After a dismiss the composer is back, and this quiet line sits with it. It fires `kai-reopen`; your handler shows the panel again and calls its `focus()`. */
export const Waiting: StoryObj = {
  render: () => (
    <div style={FRAME}>
      <kai-questions-waiting count={2} total={3} />
    </div>
  ),
  parameters: src(`<kai-questions-waiting count="2" total="3"></kai-questions-waiting>

<script type="module">
  document.querySelector('kai-questions-waiting').addEventListener('kai-reopen', () => {
    panel.hidden = false;
    panel.focus(); // back onto the active option
  });
</script>`),
};
