/** Header "Ask AI" control + the docked assistant panel it opens.
 *
 *  The assistant isn't wired to a backend yet, so the panel is an honest
 *  preview: an "in development" empty state above a DISABLED <kai-prompt-input>
 *  (the kit's `disabled` prop, dogfooded). The kit bundle is loaded lazily on
 *  first open, so guide pages that don't otherwise mount a kai-* element don't
 *  pay for it up front. Chrome uses the docs design tokens, so it tracks the
 *  site's light/dark automatically. */
import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { loadKit } from './example/kit';
import IconSparkles from '~icons/lucide/sparkles';
import IconClose from '~icons/lucide/x';
import IconBot from '~icons/lucide/bot';

const theme = () => (typeof document !== 'undefined' ? document.documentElement.dataset.theme || 'light' : 'light');

export default function AskAiDock() {
  const [open, setOpen] = createSignal(false);
  const [entered, setEntered] = createSignal(false);
  const [kitReady, setKitReady] = createSignal(false);
  let promptInput: HTMLElement | undefined;
  let closeBtn: HTMLButtonElement | undefined;
  let triggerBtn: HTMLButtonElement | undefined;
  let themeObserver: MutationObserver | undefined;
  let closeTimer: number | undefined;

  const syncTheme = () => promptInput?.setAttribute('theme', theme());

  const openDock = async () => {
    clearTimeout(closeTimer); // cancel an in-flight close if reopened quickly
    setOpen(true);
    // Wide viewports: push the page over to share the space (see app.css).
    // Narrow: the class is inert (media query opts out) and the panel overlays.
    document.documentElement.classList.add('kai-askc-open');
    requestAnimationFrame(() => setEntered(true));
    if (!kitReady()) {
      await loadKit();
      setKitReady(true);
    }
    queueMicrotask(() => {
      if (promptInput) {
        customElements.upgrade(promptInput);
        syncTheme();
      }
      closeBtn?.focus();
    });
  };

  const closeDock = () => {
    setEntered(false);
    document.documentElement.classList.remove('kai-askc-open');
    closeTimer = window.setTimeout(() => {
      setOpen(false);
      triggerBtn?.focus(); // return focus once the trigger is visible again
    }, 220);
  };

  onMount(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open()) closeDock(); };
    document.addEventListener('keydown', onKey);
    // Keep the disabled input themed with the rest of the site.
    themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    onCleanup(() => {
      document.removeEventListener('keydown', onKey);
      themeObserver?.disconnect();
      document.documentElement.classList.remove('kai-askc-open');
    });
  });

  return (
    <>
      <button
        ref={triggerBtn}
        type="button"
        onClick={openDock}
        aria-haspopup="dialog"
        aria-expanded={open()}
        class="inline-flex h-8 cursor-pointer appearance-none items-center justify-center gap-1.5 rounded-full border-0 bg-brand px-3.5 text-sm font-bold text-white transition-[filter] hover:brightness-110"
        style={{ display: open() ? 'none' : undefined }}
      >
        <IconSparkles class="size-4 shrink-0" />
        <span class="leading-none">Ask AI</span>
      </button>

      <Show when={open()}>
       <Portal>
        {/* Backdrop — dims the page in overlay mode; CSS hides it when the page
            shares space (push mode) so the docs stay fully readable. */}
        <div
          onClick={closeDock}
          class="kai-askc-backdrop fixed inset-0 z-[200] bg-black/30 transition-opacity duration-200"
          classList={{ 'opacity-100': entered(), 'opacity-0': !entered() }}
          aria-hidden="true"
        />
        {/* Docked panel */}
        <div
          role="dialog"
          aria-label="Ask AI"
          class="kai-askc-panel fixed inset-y-0 right-0 z-[201] flex w-[var(--kai-dock-w)] max-w-[calc(100vw-2rem)] flex-col border-l border-line bg-surface shadow-2xl transition-transform duration-200 ease-out"
          classList={{ 'translate-x-0': entered(), 'translate-x-full': !entered() }}
        >
          {/* Header */}
          <div class="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div class="flex items-center gap-2">
              <IconSparkles class="size-4 shrink-0 text-brand" />
              <span class="text-sm font-bold text-ink">Ask AI</span>
              <span class="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-ink-3">In development</span>
            </div>
            <button
              ref={closeBtn}
              type="button"
              onClick={closeDock}
              aria-label="Close"
              class="flex size-7 cursor-pointer appearance-none items-center justify-center rounded-md border-0 bg-transparent text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <IconClose class="size-4" />
            </button>
          </div>

          {/* In-development empty state */}
          <div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div class="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
              <IconBot class="size-6" />
            </div>
            <p class="text-sm font-semibold text-ink">An assistant is on the way</p>
            <p class="text-sm leading-relaxed text-ink-2">
              We're building a chat that answers questions about AI/UI right here — powered by the kit itself. It's not live yet, so the composer below is disabled.
            </p>
          </div>

          {/* Disabled composer — the kit's own kai-prompt-input in its disabled state */}
          <div class="border-t border-line p-3">
            <Show when={kitReady()} fallback={<div class="h-12 animate-pulse rounded-lg bg-ink/5" />}>
              {/* @ts-expect-error custom element */}
              <kai-prompt-input
                ref={(el: HTMLElement) => (promptInput = el)}
                disabled
                placeholder="Ask about AI/UI… (coming soon)"
                style={{ display: 'block' }}
              />
            </Show>
            <p class="mt-2 text-center text-[11px] text-ink-3">In the meantime, the docs search has you covered.</p>
          </div>
        </div>
       </Portal>
      </Show>
    </>
  );
}
