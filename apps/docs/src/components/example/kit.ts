// Load the kit bundle once (idempotent) — shared by every island that mounts a
// kai-* element or the kai-code-block highlighter.
let kitPromise: Promise<Record<string, unknown>> | undefined;

/** Import the kit bundle once and resolve to its MODULE namespace (exports include
 *  `toast`, `configureCodeHighlighting`, …) AFTER the kai-* elements are registered.
 *  The bundle registers elements ASYNCHRONOUSLY (it dynamic-imports its impl chunk
 *  for SSR-safety), so the import resolving does NOT mean elements are defined —
 *  wait for kai-chat (the coarse register-all bundle registers them all together,
 *  so this one guard means every element is ready). Without it, islands that set
 *  properties right after loadKit() race the upgrade and their data is dropped. */
export function getKit(): Promise<Record<string, unknown>> {
  if (!kitPromise) {
    // Resolve the live workspace package: Vite honors @kitn.ai/ui sideEffects, so
    // the elements self-register. No raw-bundle URL, no sync-kit drift. Still
    // resolves to the MODULE namespace (toast, configureCodeHighlighting, …) once
    // kai-chat is defined, so callers that read those exports keep working.
    kitPromise = import('@kitn.ai/ui/elements').then(
      async (mod: Record<string, unknown>) => {
        await customElements.whenDefined('kai-chat');
        return mod;
      },
    );
  }
  return kitPromise;
}

/** Await before setting properties on a kai-* element (callers ignore the value). */
export function loadKit(): Promise<unknown> {
  return getKit();
}

/** Mirror the Starlight site theme (`data-theme` on <html>) onto a kai-* element's
 *  `theme` attribute and keep it in sync as the user toggles. Call inside onMount
 *  once the element is connected; pass the return value to onCleanup. Without this,
 *  the element defaults to theme="auto" (OS) and can mismatch the page. */
export function syncKaiTheme(el: HTMLElement): () => void {
  const theme = (): string => document.documentElement.dataset.theme ?? 'light';
  el.setAttribute('theme', theme());
  const obs = new MutationObserver(() => el.setAttribute('theme', theme()));
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}

/** The imperative `toast()` lazily mounts a <kai-toast-region> on document.body.
 *  Theme-sync it (and any future one) to the site theme. Returns a cleanup. */
export function syncToastRegionTheme(): () => void {
  const cleanups: Array<() => void> = [];
  const apply = (): void => {
    document.querySelectorAll('kai-toast-region').forEach((r) => {
      const el = r as HTMLElement;
      if (!el.dataset.kaiThemed) {
        el.dataset.kaiThemed = '1';
        cleanups.push(syncKaiTheme(el));
      }
    });
  };
  apply();
  const obs = new MutationObserver(apply);
  obs.observe(document.body, { childList: true });
  return () => {
    obs.disconnect();
    cleanups.forEach((c) => c());
  };
}
