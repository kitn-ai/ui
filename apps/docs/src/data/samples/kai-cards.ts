// Sample data for <kai-cards> non-scalar props.
//
// All three props — `cards`, `types`, `policy` — are scalar:false and must be set
// as JS properties. `sample` drives the Playground and bare Examples; `named` provides
// focused per-example sets.
//
// The card envelopes mirror the Storybook story's CARDS array so the docs page
// matches what developers see in Storybook.

/** The default mixed stream: confirm + tasks + choice + link-preview. */
const MIXED_CARDS = [
  {
    type: 'confirm',
    id: 'deploy',
    title: 'Deploy to production?',
    data: {
      body: 'Apply 3 migrations and deploy the release build?',
      tone: 'warning',
      actions: [
        { id: 'go', label: 'Deploy', style: 'primary', default: true },
        { id: 'no', label: 'Cancel' },
      ],
    },
  },
  {
    type: 'tasks',
    id: 'plan',
    title: 'Pick the steps to run',
    data: {
      tasks: [
        { id: 'lint', label: 'Run linter', checked: true },
        { id: 'test', label: 'Run unit tests', checked: true },
        { id: 'build', label: 'Build production bundle' },
        { id: 'deploy', label: 'Deploy to staging', description: 'Reversible; staging only' },
      ],
      confirmLabel: 'Run selected',
    },
  },
  {
    type: 'choice',
    id: 'plan-pick',
    title: 'Choose a plan',
    data: {
      prompt: 'Which plan fits your team?',
      options: [
        { id: 'free', label: 'Free', meta: '$0 / month' },
        { id: 'pro', label: 'Pro', meta: '$12 / seat', recommended: true, payload: { plan: 'pro' } },
        { id: 'enterprise', label: 'Enterprise', meta: 'Contact us' },
      ],
    },
  },
  {
    type: 'link',
    id: 'doc',
    data: {
      url: 'https://kitn.dev',
      title: 'kitn.dev — Generative UI components',
      description: 'Ready-made web components for AI-powered interfaces.',
      domain: 'kitn.dev',
    },
  },
];

/** Single confirm card — useful for focused examples. */
const CONFIRM_CARD = [
  {
    type: 'confirm',
    id: 'confirm-1',
    title: 'Delete workspace?',
    data: {
      body: 'This will permanently remove the workspace and all its conversations. This cannot be undone.',
      tone: 'danger',
      actions: [
        { id: 'delete', label: 'Delete', style: 'destructive', default: true },
        { id: 'cancel', label: 'Keep it' },
      ],
    },
  },
];

/** A card that has already been resolved — renders the read-only chromed view. */
const RESOLVED_CARDS = [
  {
    type: 'confirm',
    id: 'resolved-confirm',
    title: 'Restart workers?',
    data: {
      body: 'Restart all 4 background workers? Ongoing jobs will be requeued.',
      tone: 'warning',
      actions: [
        { id: 'restart', label: 'Restart', style: 'primary', default: true },
        { id: 'skip', label: 'Skip' },
      ],
    },
    resolution: {
      kind: 'action',
      action: 'restart',
      at: '2026-06-16T09:12:00Z',
    },
  },
];

/** An envelope whose type isn't registered — exercises the CardFallback. */
const UNKNOWN_TYPE_CARDS = [
  {
    type: 'weather-forecast',
    id: 'unknown-1',
    data: { location: 'San Francisco', unit: 'celsius' },
  },
];

export default {
  sample: { cards: MIXED_CARDS },
  named: {
    confirm: { cards: CONFIRM_CARD },
    resolved: { cards: RESOLVED_CARDS },
    unknownType: { cards: UNKNOWN_TYPE_CARDS },
  },
};
