// Sample data for <kai-toast-region>.
//
// `toasts` is scalar:false — the stack to render, set as a JS property. The
// playground's `position` / `max` controls and the Console (kai-dismiss /
// kai-action) work off it.
//
// `target: '$preview'` is a playground sentinel: the playground resolves it to its
// own preview container, so the (otherwise viewport-fixed) stack anchors INSIDE the
// preview box. The region filters toasts to its own target, so each toast carries
// the same sentinel. `duration: 0` keeps them up (sticky) for the demo.

const TOASTS = [
  { id: 't1', message: 'Copied to clipboard', variant: 'success', duration: 0, target: '$preview' },
  {
    id: 't2',
    message: 'Conversation dismissed',
    duration: 0,
    target: '$preview',
    action: { label: 'Undo', onAction: () => {} },
  },
  { id: 't3', message: 'Saved your changes', duration: 0, target: '$preview' },
];

export default { sample: { toasts: TOASTS, target: '$preview', previewHeight: '260px' } };
