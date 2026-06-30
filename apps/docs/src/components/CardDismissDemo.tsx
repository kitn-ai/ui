/** Live demo for card dismiss/recovery — a dismissible confirm card. Click × → it
 *  collapses to a compact, re-openable stub plus an Undo toast (defer, not delete);
 *  Undo or the stub's Reopen brings it back live. The Console logs the policy events.
 *
 *  Mirrors src/primitives/card-recovery.ts semantics INLINE — the kit's
 *  dismissRecovery() helper is a primitive, not re-exported from the docs bundle, so
 *  this island wires onDismiss/onReopen itself:
 *    - onDismiss → stamp { kind:'dismissed', at } and raise a "Dismissed · Undo" toast
 *      whose Undo restores the card's prior resolution (none → live again).
 *    - onReopen  → clear the resolution → live again.
 *  Confirmed against source (2026-06-21):
 *    - the × affordance is gated by `data.dismissible === true` (confirm-card.tsx).
 *    - <kai-cards> routes the contract `dismiss`/`reopen` verbs to policy.onDismiss/
 *      onReopen (card-routing.ts); `dismissed` is a deferred CardResolution kind that
 *      renders the DismissedStub with a Reopen button (use-card-resolution.ts).
 *  NB: the confirm card flips OPTIMISTICALLY to a local `dismissed` resolution on ×.
 *  A resolution-only change can't clear that local flip — only a NEW `data` identity
 *  resets it (the `on(data)` effect in use-card-resolution.ts). So every transition
 *  below rebuilds the envelope with a fresh `data` object, which both re-renders the
 *  host (new array + envelope reference) and resets the optimistic flip. */
import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { getKit, syncKaiTheme, syncToastRegionTheme } from './example/kit';

type AnyEl = HTMLElement & Record<string, unknown>;
type Resolution = { kind: string; at?: string } | undefined;

interface ConfirmData extends Record<string, unknown> {
  body: string;
  tone: 'default' | 'warning' | 'danger';
  dismissible: boolean;
  actions: { id: string; label: string; style?: 'primary' | 'default' | 'destructive' }[];
}
interface Envelope {
  type: string;
  id: string;
  title?: string;
  data: ConfirmData;
  resolution?: Resolution;
}

type ToastFn = (m: string, o?: Record<string, unknown>) => unknown;

const CARD_ID = 'deploy';

/** A fresh confirm definition. Returns a NEW `data` object each call so applying it
 *  resets the confirm card's optimistic local flip (see file header). */
const cardData = (): ConfirmData => ({
  body: 'Applies 2 migrations and restarts 3 services. About 30 s of downtime.',
  tone: 'warning',
  dismissible: true,
  actions: [
    { id: 'deploy', label: 'Deploy now', style: 'primary' },
    { id: 'cancel', label: 'Cancel' },
  ],
});

const envelope = (resolution?: Resolution): Envelope => ({
  type: 'confirm',
  id: CARD_ID,
  title: 'Deploy to production?',
  data: cardData(),
  ...(resolution ? { resolution } : {}),
});

export default function CardDismissDemo() {
  let host: AnyEl | undefined;
  let toast: ToastFn | undefined;
  // The prior resolution, captured at dismiss time so Undo can restore it.
  let priorResolution: Resolution;
  const [log, setLog] = createSignal<string[]>([]);
  const push = (m: string) => setLog((p) => [...p.slice(-5), m]);

  /** Push a NEW cards array (fresh envelope + fresh `data`) onto the element. */
  const apply = (resolution?: Resolution) => {
    if (host) host.cards = [envelope(resolution)];
  };

  onMount(async () => {
    const mod = (await getKit()) as { toast: ToastFn };
    toast = mod.toast;
    if (!host) return;
    customElements.upgrade(host);
    apply();
    host.policy = {
      onDismiss: (id: string) => {
        priorResolution = undefined; // the card was live before this dismiss
        apply({ kind: 'dismissed', at: new Date().toISOString() });
        push(`onDismiss  •  ${id}`);
        toast?.('Dismissed', {
          action: {
            label: 'Undo',
            onAction: () => {
              apply(priorResolution);
              push(`undo  •  ${id} restored`);
            },
          },
        });
      },
      onReopen: (id: string) => {
        apply(undefined); // clear the resolution → live again
        push(`onReopen  •  ${id}  →  live`);
      },
      onAction: (id: string, action: string) => push(`onAction  •  ${id}  →  ${action}`),
    };
    onCleanup(syncKaiTheme(host));
    onCleanup(syncToastRegionTheme());
  });

  const reset = () => {
    priorResolution = undefined;
    apply();
    setLog([]);
  };

  return (
    <div class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface">
      {/* Toolbar */}
      <div class="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2">
        <span class="text-xs font-semibold uppercase tracking-wider text-ink-3">Dismiss and recover</span>
        <button
          type="button"
          onClick={reset}
          class="cursor-pointer appearance-none rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:text-ink"
        >
          Reset card
        </button>
      </div>

      {/* Preview */}
      <div class="p-5">
        {/* @ts-expect-error custom element */}
        <kai-cards ref={(el: HTMLElement) => (host = el as AnyEl)} style={{ display: 'block' }} />
        <p class="mt-3.5 text-sm text-ink-3">
          Click × to dismiss — the card collapses to a re-openable stub plus an Undo toast (defer,
          not delete). Undo or the stub's Reopen restores it live.
        </p>
      </div>

      {/* Console — below the preview, mirroring the Playground convention */}
      <div class="border-t border-line bg-surface-2 px-4 py-3">
        <div class="mb-1.5 flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
            <span class="size-1.5 rounded-full bg-brand"></span> Console
          </div>
          <button
            type="button"
            onClick={() => setLog([])}
            disabled={!log().length}
            class="cursor-pointer appearance-none border-0 bg-transparent text-xs font-medium text-ink-3 transition-colors hover:text-ink disabled:opacity-40"
          >
            Clear
          </button>
        </div>
        <div class="min-h-[1.75rem] font-mono text-sm leading-relaxed text-ink-2">
          <Show
            when={log().length}
            fallback={
              <span class="font-sans text-ink-3">
                Dismiss the card (×), then Undo or Reopen — policy events appear here.
              </span>
            }
          >
            <For each={log()}>{(line) => <div class="whitespace-pre-wrap break-words">{line}</div>}</For>
          </Show>
        </div>
      </div>
    </div>
  );
}
