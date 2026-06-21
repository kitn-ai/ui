/** Live demo for the imperative toast() API — themed trigger buttons that raise each
 *  toast variant. The region auto-mounts on document.body on the first call (the real
 *  behavior), so we theme-sync it to the site light/dark. */
import { onMount, onCleanup } from 'solid-js';
import { getKit, syncToastRegionTheme } from './example/kit';

type ToastHandle = { update: (p: Record<string, unknown>) => void; dismiss: () => void };
type ToastFn = ((m: string, o?: Record<string, unknown>) => ToastHandle) & {
  success: (m: string, o?: Record<string, unknown>) => ToastHandle;
};

const BTN =
  'cursor-pointer rounded-lg border border-line bg-surface-2 px-3.5 py-2 text-sm font-medium ' +
  'text-ink transition-colors hover:border-ink-3 disabled:opacity-40';

export default function ToastDemo() {
  let toast: ToastFn | undefined;
  onMount(async () => {
    const mod = (await getKit()) as { toast: ToastFn };
    toast = mod.toast;
    onCleanup(syncToastRegionTheme());
  });

  return (
    <div class="not-content my-5 rounded-xl border border-line bg-surface p-5">
      <p class="mb-4 text-sm text-ink-3">
        Click to raise a toast — it slides in top-center and auto-dismisses (5s; the Undo one stays
        up to 7s). The region mounts itself on the first call.
      </p>
      <div class="flex flex-wrap gap-2">
        <button type="button" class={BTN} onClick={() => toast?.('Saved your changes')}>Neutral</button>
        <button type="button" class={BTN} onClick={() => toast?.success('Copied to clipboard')}>Success</button>
        <button
          type="button"
          class={BTN}
          onClick={() =>
            toast?.('Conversation dismissed', {
              action: { label: 'Undo', onAction: () => toast?.success('Restored') },
            })
          }
        >Undo action</button>
        <button
          type="button"
          class={BTN}
          onClick={() => {
            const t = toast?.('Generating report…', { duration: 0 });
            setTimeout(() => t?.update({ message: 'Report ready', variant: 'success', duration: 2000 }), 1600);
          }}
        >Sticky → update</button>
        <button
          type="button"
          class={BTN}
          onClick={() => {
            toast?.('Connecting…');
            toast?.('Syncing files');
            toast?.success('All set');
          }}
        >Stack three</button>
      </div>
    </div>
  );
}
