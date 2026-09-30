import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { JSX } from 'solid-js';
import { QuestionPanel } from './question-panel';
import type { PanelQuestion } from './question-state';

/**
 * The question panel: what stands in the composer's place while a model's questions are open.
 * One tab per question (Review appears from two), Back and Next, numbered options with "Other" as
 * the last row, and one Submit. A lone approve/deny question submits on the click.
 *
 * These are the Solid component; `Components/Question Panel Composed` builds the same panel from
 * `<kai-question>` elements. Question text, labels, descriptions and previews are model output and
 * are always drawn as text.
 */
const meta: Meta = {
  title: 'Components/Question Panel',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

const src = (code: string) => ({ docs: { source: { code, language: 'tsx' } } });
const Frame = (p: { width?: string; children: JSX.Element }): JSX.Element => (
  <div class="mx-auto w-full py-2" style={{ 'max-width': p.width ?? '46rem' }}>{p.children}</div>
);
const NARROW = '22.5rem';

const SCOPE: PanelQuestion = {
  id: 'scope', header: 'Scope', kind: 'choice', required: true,
  question: 'Which part of the repo should I clean up?',
  options: [
    { label: 'Just this package', description: 'Only packages/ui, nothing else moves' },
    { label: 'Whole workspace', description: 'Every package, including the examples' },
    { label: 'Docs only', description: 'Stale pages and broken links, no code' },
  ],
};
const TONE: PanelQuestion = {
  id: 'tone', header: 'Tone', kind: 'choice', required: true,
  question: 'How formal should the release notes read?',
  options: [
    { label: 'Casual', description: 'Contractions, short sentences' },
    { label: 'Neutral', description: 'Plain and direct' },
    { label: 'Formal', description: 'Full sentences, no contractions' },
  ],
};
const DUE: PanelQuestion = {
  id: 'due', header: 'Due', kind: 'choice', required: true,
  question: 'When does this need to land?',
  options: [
    { label: 'Today', description: 'Skip the extra review pass' },
    { label: 'Friday', description: 'Room for one round of feedback' },
    { label: 'Next sprint', description: 'No rush, do it properly' },
  ],
};
const CHECKS: PanelQuestion = {
  id: 'checks', header: 'Checks', kind: 'choice', multiSelect: true, required: true,
  question: 'Which checks should run before merge?',
  options: [
    { label: 'Typecheck', description: 'Every tsc pass, uncached' },
    { label: 'Unit tests', description: 'The jsdom suite' },
    { label: 'Story tests', description: 'Storybook with axe, light and dark' },
    { label: 'Consumer build', description: 'Pack and install into a throwaway app' },
  ],
};
const CONFIG: PanelQuestion = {
  id: 'config', header: 'Config', kind: 'choice', required: true,
  question: 'How should the build ship the elements?',
  options: [
    { label: 'One bundle', description: 'Register everything up front', preview: "import '@kitn.ai/ui/web-components';\n\n// every kai-* element is defined here" },
    { label: 'Per element', description: 'Import only what the page renders', preview: "import '@kitn.ai/ui/web-components/chat';\nimport '@kitn.ai/ui/web-components/message';\n\n// two definitions, loaded on demand" },
    { label: 'Autoloader', description: 'Define elements as they appear', preview: '<script type="module" src="https://esm.sh/@kitn.ai/ui/autoloader"></script>\n\n<kai-chat></kai-chat>' },
  ],
};
const APPROVE: PanelQuestion = {
  id: 'run', header: 'Run', kind: 'confirm', required: true,
  question: 'Run `pnpm --filter @kitn.ai/ui run build:css && nx build ui` in this checkout?',
  options: [{ label: 'Approve', description: 'Run it once' }, { label: 'Deny', description: 'Skip it and say why below' }],
};
const STEPS: PanelQuestion = {
  id: 'steps', header: 'Steps', kind: 'tasks', required: true,
  question: 'Which cleanup steps should I run?',
  options: [{ label: 'Remove unused exports' }, { label: 'Delete stale snapshots' }, { label: 'Prune dead CSS tokens' }, { label: 'Regenerate the React wrappers' }],
};
const NAME: PanelQuestion = { id: 'name', header: 'Name', kind: 'text', required: true, question: 'What should the new element be called?', placeholder: 'kai-…' };
const CONTACT: PanelQuestion = {
  id: 'contact', header: 'Send to', kind: 'form', required: true,
  question: 'Where should the report go?',
  fields: {
    type: 'object', required: ['to'],
    properties: {
      to: { type: 'string', title: 'Recipient', format: 'email', 'x-kai-placeholder': 'name@company.com' },
      subject: { type: 'string', title: 'Subject', 'x-kai-placeholder': 'Weekly cleanup report' },
    },
  },
};

const answer = (q: PanelQuestion, extra: object) => ({ questionId: q.id, header: q.header, question: q.question, kind: q.kind, ...extra });

/** One choice question. Number keys 1 to 4 pick; 4 is Other and focuses its textarea. */
export const SingleSelect: Story = {
  name: 'Single Select',
  render: () => <Frame><QuestionPanel questions={[TONE]} focusOnOpen={false} /></Frame>,
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';
import { answerQuestions } from '@kitn.ai/ui/state';

const questions = [{
  id: 'tone', header: 'Tone', kind: 'choice', required: true,
  question: 'How formal should the release notes read?',
  options: [
    { label: 'Casual', description: 'Contractions, short sentences' },
    { label: 'Neutral', description: 'Plain and direct' },
    { label: 'Formal', description: 'Full sentences, no contractions' },
  ],
}];

<QuestionPanel
  questions={questions}
  toolCallId="call_1"
  onSubmit={({ toolCallId, result }) => send(answerQuestions(messages, toolCallId!, result))}
  onDismiss={({ answers }) => setWaiting(answers)}
/>`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('radio', { name: /Neutral/ }));
    await waitFor(() => expect(c.getByRole('radio', { name: /Neutral/ })).toBeChecked());
  },
};

/** Checkbox rows plus Other. Back and Next sit together; Next advances, picking does not. */
export const MultiSelect: Story = {
  name: 'Multi Select',
  render: () => (
    <Frame>
      <QuestionPanel questions={[CHECKS, DUE]} focusOnOpen={false} defaultValue={[answer(CHECKS, { selected: ['Typecheck', 'Story tests'] })] as never} />
    </Frame>
  ),
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<QuestionPanel
  questions={[checks, due]}
  defaultValue={[{ questionId: 'checks', header: 'Checks', question: checks.question, kind: 'choice', selected: ['Typecheck', 'Story tests'] }]}
/>`),
};

/** Other selected: the row grows an inline textarea that sizes to a multi-line answer. Enter moves on, Shift+Enter is a newline. */
export const OtherSelected: Story = {
  name: 'Other Selected',
  render: () => (
    <Frame>
      <QuestionPanel
        questions={[SCOPE, TONE, DUE]}
        focusOnOpen={false}
        defaultValue={[answer(SCOPE, { selected: [], text: 'Start with packages/ui only.\nSkip the examples folder, they get their own pass.\nDocs can wait until the API settles.' })] as never}
      />
    </Frame>
  ),
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<QuestionPanel
  questions={[scope, tone, due]}
  defaultValue={[{ questionId: 'scope', header: 'Scope', question: scope.question, kind: 'choice', selected: [], text: 'Start with packages/ui only.\\n...' }]}
/>`),
};

/** A checklist: the box leads, the number trails, and the footer counts what is ticked. */
export const Tasks: Story = {
  render: () => <Frame><QuestionPanel questions={[STEPS]} focusOnOpen={false} defaultValue={[answer(STEPS, { selected: ['Delete stale snapshots'] })] as never} /></Frame>,
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<QuestionPanel questions={[{ id: 'steps', header: 'Steps', kind: 'tasks', required: true, question: 'Which cleanup steps should I run?', options: [{ label: 'Remove unused exports' } /* ... */] }]} />`),
};

/** A panel whose only question is a confirm submits on the click of Approve or Deny: there is no Submit. */
export const OneClickConfirm: Story = {
  name: 'One-click Confirm',
  render: () => <Frame><QuestionPanel questions={[APPROVE]} focusOnOpen={false} /></Frame>,
  parameters: src(`import { isOneClick } from '@kitn.ai/ui';
import { QuestionPanel } from '@kitn.ai/ui/solid';

isOneClick(questions); // true for a lone confirm, false for anything else

<QuestionPanel questions={[approve]} onSubmit={({ result }) => run(result.answers[0].selected?.[0] === 'Approve')} />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole('button', { name: 'Submit' })).toBeNull();
    await expect(c.getByRole('radio', { name: /Approve/ })).toBeInTheDocument();
  },
};

export const TextQuestion: Story = {
  name: 'Text Question',
  render: () => <Frame><QuestionPanel questions={[NAME]} focusOnOpen={false} /></Frame>,
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<QuestionPanel questions={[{ id: 'name', header: 'Name', kind: 'text', required: true, question: 'What should the new element be called?', placeholder: 'kai-…' }]} />`),
};

/** The form kind renders the kit's own form widgets over the model's field schema. */
export const FormQuestion: Story = {
  name: 'Form Question',
  render: () => <Frame><QuestionPanel questions={[CONTACT]} focusOnOpen={false} /></Frame>,
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<QuestionPanel questions={[{
  id: 'contact', header: 'Send to', kind: 'form', required: true, question: 'Where should the report go?',
  fields: { type: 'object', required: ['to'], properties: {
    to: { type: 'string', title: 'Recipient', format: 'email' },
    subject: { type: 'string', title: 'Subject' },
  } },
}]} />`),
};

/** Any option with a preview makes the body list + preview side by side; the preview follows the focused row. */
export const WithPreviews: Story = {
  name: 'With Previews',
  render: () => <Frame><QuestionPanel questions={[CONFIG]} focusOnOpen={false} defaultValue={[answer(CONFIG, { selected: ['Per element'] })] as never} /></Frame>,
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<QuestionPanel questions={[{
  id: 'config', header: 'Config', kind: 'choice', required: true, question: 'How should the build ship the elements?',
  options: [
    { label: 'One bundle', description: 'Register everything up front', preview: "import '@kitn.ai/ui/web-components';" },
    { label: 'Per element', description: 'Import only what the page renders', preview: "import '@kitn.ai/ui/web-components/chat';" },
  ],
}]} />`),
};

/** In a narrow container the previews stack under the list and "Let's chat" moves to the footer. */
export const WithPreviewsNarrow: Story = {
  name: 'With Previews, Narrow',
  render: () => <Frame width={NARROW}><QuestionPanel questions={[CONFIG]} focusOnOpen={false} defaultValue={[answer(CONFIG, { selected: ['Per element'] })] as never} /></Frame>,
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<div style={{ width: '22.5rem' }}><QuestionPanel questions={[config]} /></div>`),
};

export const Narrow: Story = {
  render: () => <Frame width={NARROW}><QuestionPanel questions={[SCOPE, TONE, DUE]} defaultActiveIndex={1} focusOnOpen={false} defaultValue={[answer(SCOPE, { selected: ['Just this package'] })] as never} /></Frame>,
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<div style={{ width: '22.5rem' }}><QuestionPanel questions={[scope, tone, due]} defaultActiveIndex={1} /></div>`),
};

/** The Review step: each question with its answer and an edit link, and one Submit. */
export const ReviewStep: Story = {
  name: 'Review Step',
  render: () => (
    <Frame>
      <QuestionPanel
        questions={[SCOPE, TONE, DUE]}
        defaultActiveIndex={3}
        focusOnOpen={false}
        defaultValue={[answer(SCOPE, { selected: ['Just this package'] }), answer(TONE, { selected: ['Casual'] }), answer(DUE, { selected: ['Friday'] })] as never}
      />
    </Frame>
  ),
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<QuestionPanel questions={[scope, tone, due]} defaultActiveIndex={3} defaultValue={answers} />`),
};

/** Submit is disabled while a required question is open, and the reason is on screen. */
export const ReviewIncomplete: Story = {
  name: 'Review Incomplete',
  render: () => (
    <Frame>
      <QuestionPanel
        questions={[SCOPE, TONE, DUE]}
        defaultActiveIndex={3}
        focusOnOpen={false}
        defaultValue={[answer(SCOPE, { selected: ['Just this package'] }), answer(DUE, { selected: ['Friday'] })] as never}
      />
    </Frame>
  ),
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<QuestionPanel questions={[scope, tone, due]} defaultActiveIndex={3} defaultValue={[scopeAnswer, dueAnswer]} />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: 'Submit' })).toBeDisabled();
    await expect(c.getByText('1 question still needs an answer')).toBeInTheDocument();
  },
};

/** `dismissLabel` renames the small outline button that hands the composer back. */
export const CustomDismissLabel: Story = {
  name: 'Custom Dismiss Label',
  render: () => <Frame><QuestionPanel questions={[TONE]} dismissLabel="Skip for now" focusOnOpen={false} /></Frame>,
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<QuestionPanel questions={[tone]} dismissLabel="Skip for now" />`),
};

/** The `dismiss` content replaces the control. A click anywhere in it dismisses. */
export const CustomDismiss: Story = {
  name: 'Custom Dismiss',
  render: () => (
    <Frame>
      <QuestionPanel
        questions={[TONE]}
        focusOnOpen={false}
        dismiss={<button type="button" class="rounded-md px-2 py-1 text-meta text-muted-foreground underline">Answer later</button>}
      />
    </Frame>
  ),
  parameters: src(`import { QuestionPanel } from '@kitn.ai/ui/solid';

<QuestionPanel questions={[tone]} dismiss={<button type="button">Answer later</button>} />`),
};
