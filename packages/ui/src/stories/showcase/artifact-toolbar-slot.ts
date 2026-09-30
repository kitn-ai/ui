// A `<kai-artifact>` toolbar composed in its `toolbar` slot, for the showcase stories that
// want the built-in bar minus a control or two. The built-in bar is all-or-nothing now, so
// "the bar without Home" is a composed bar. Reader-facing version: the `artifact-toolbar`
// pattern (`Patterns/Artifact Toolbar`).

type ArtifactEl = HTMLElement & Record<string, unknown> & {
  url: string; back(): void; forward(): void; reload(): void; home(): void;
  openExternal(): void; maximize(): void; restore(): void;
};

export interface ToolbarControls {
  back?: boolean;
  forward?: boolean;
  reload?: boolean;
  home?: boolean;
  /** Read-only address text. Unset shows the live `url`. */
  address?: string;
  expand?: boolean;
  open?: boolean;
  tabs?: boolean;
}

function button(icon: string, label: string, onClick: () => void): HTMLElement & Record<string, unknown> {
  const b = document.createElement('kai-button') as HTMLElement & Record<string, unknown>;
  b.setAttribute('variant', 'ghost');
  b.setAttribute('size', 'icon-sm');
  b.setAttribute('icon', icon);
  b.setAttribute('label', label);
  b.addEventListener('kai-click', onClick);
  return b;
}

/** Append a composed toolbar to `art` as its `slot="toolbar"` child. Call before the element connects. */
export function composeArtifactToolbar(art: HTMLElement, controls: ToolbarControls): void {
  const el = art as ArtifactEl;
  const bar = document.createElement('div');
  bar.slot = 'toolbar';
  // Same box the built-in bar draws: a bordered, surface-tinted strip.
  bar.style.cssText =
    'display:flex;align-items:center;gap:0.375rem;padding:0.375rem 0.5rem;flex-shrink:0;' +
    'border-bottom:1px solid var(--color-border);background:var(--color-surface)';

  const back = controls.back ? button('arrow-left', 'Back', () => el.back()) : undefined;
  const forward = controls.forward ? button('arrow-right', 'Forward', () => el.forward()) : undefined;
  const open = controls.open ? button('external-link', 'Open in new tab', () => el.openExternal()) : undefined;
  const expand = controls.expand ? button('maximize-2', 'Expand', () => (expand!.dataset.on ? el.restore() : el.maximize())) : undefined;
  if (back) bar.append(back);
  if (forward) bar.append(forward);
  if (controls.reload) bar.append(button('rotate-cw', 'Reload', () => el.reload()));
  if (controls.home) bar.append(button('home', 'Home', () => el.home()));

  // A kit input at the bar's 28px row height (`size="xs"`). Its own name comes from the host
  // `aria-label`; the address text keeps the mono face the built-in field draws, through the
  // input's `input` part (this bar is light DOM, so the page's own style reaches it).
  const address = document.createElement('kai-input') as HTMLElement & { value: string };
  address.setAttribute('size', 'xs');
  address.setAttribute('readonly', '');
  address.setAttribute('aria-label', 'Address');
  address.style.cssText = 'flex:1;min-width:0';
  const face = document.createElement('style');
  face.textContent =
    'kai-input[aria-label="Address"]::part(input){font-family:ui-monospace,SFMono-Regular,Menlo,monospace}';
  bar.append(face);
  bar.append(address);
  if (expand) bar.append(expand);
  if (open) bar.append(open);

  // `url` is display text here; `open` only ever goes through the host's own `openExternal()`,
  // which applies the same safe-url check `urlSafe` reports.
  const sync = () => {
    if (back) back.disabled = !el.canGoBack;
    if (forward) forward.disabled = !el.canGoForward;
    if (open) open.disabled = !el.urlSafe;
    address.value = controls.address ?? el.url;
  };
  art.addEventListener('kai-history-change', sync);
  // The getters exist once the element has upgraded, which is after this runs.
  customElements.whenDefined('kai-artifact').then(() => queueMicrotask(sync));

  if (expand) {
    art.addEventListener('kai-maximize-change', (e) => {
      const on = (e as CustomEvent<{ maximized: boolean }>).detail.maximized;
      if (on) expand.dataset.on = '1'; else delete expand.dataset.on;
      expand.setAttribute('icon', on ? 'minimize-2' : 'maximize-2');
      expand.setAttribute('label', on ? 'Collapse' : 'Expand');
    });
  }

  if (controls.tabs) {
    // The built-in toggle, from the kit: a 28px `kai-segmented` (`size="xs"`) in the 28px row.
    const toggle = document.createElement('kai-segmented') as HTMLElement & { options: unknown; value: string };
    toggle.setAttribute('size', 'xs');
    toggle.setAttribute('aria-label', 'View');
    toggle.style.flexShrink = '0';
    toggle.options = [
      { value: 'preview', label: 'Preview', icon: 'eye' },
      { value: 'code', label: 'Code', icon: 'code' },
    ];
    const current = () => (el.tab as string | undefined) ?? (el.defaultTab as string | undefined) ?? 'preview';
    const paint = () => { toggle.value = current(); };
    paint();
    toggle.addEventListener('kai-change', (e) => { el.tab = (e as CustomEvent<{ value: string }>).detail.value; });
    art.addEventListener('kai-tab-change', paint);
    // `kai-tab-change` reports the user's tab choice, not a `tab` assignment, so repaint on every
    // write. The element installs its own `tab` accessor when it upgrades, so the wrap goes on
    // after that, and wraps that accessor.
    customElements.whenDefined('kai-artifact').then(() => queueMicrotask(() => {
      const desc = Object.getOwnPropertyDescriptor(el, 'tab');
      if (!desc?.get || !desc.set) return;
      const { get, set } = desc;
      Object.defineProperty(el, 'tab', {
        configurable: true,
        enumerable: true,
        get: () => get.call(el),
        set: (v: unknown) => { set.call(el, v); paint(); },
      });
      paint();
    }));
    bar.append(toggle);
  }
  art.append(bar);
}
