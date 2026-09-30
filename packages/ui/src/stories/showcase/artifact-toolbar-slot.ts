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

  // A native read-only input, styled to the built-in field's box (kai-input is taller).
  const address = document.createElement('input');
  address.readOnly = true;
  address.setAttribute('aria-label', 'Address');
  address.style.cssText =
    'flex:1;min-width:0;height:1.75rem;box-sizing:border-box;padding:0 0.625rem;border-radius:0.375rem;' +
    'border:1px solid var(--color-border);background:color-mix(in srgb,var(--color-muted) 40%,transparent);' +
    'color:var(--color-foreground);font:12px ui-monospace,SFMono-Regular,Menlo,monospace;outline:none';
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
    // Native buttons in the built-in toggle's box: kai-segmented is taller than the bar's 28px row.
    const list = document.createElement('div');
    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-label', 'View');
    list.style.cssText =
      'display:flex;flex-shrink:0;align-items:center;gap:0.125rem;padding:0.125rem;border-radius:0.375rem;background:var(--color-muted)';
    const tabs = (['preview', 'code'] as const).map((value) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.setAttribute('role', 'tab');
      const icon = document.createElement('kai-icon');
      icon.setAttribute('name', value === 'preview' ? 'eye' : 'code');
      icon.setAttribute('size', 'sm');
      t.append(icon, value === 'preview' ? 'Preview' : 'Code');
      t.addEventListener('click', () => { el.tab = value; });
      list.append(t);
      return { value, t };
    });
    const paint = () => {
      const current = (el.tab as string | undefined) ?? (el.defaultTab as string | undefined) ?? 'preview';
      for (const { value, t } of tabs) {
        const on = value === current;
        t.setAttribute('aria-selected', String(on));
        t.style.cssText =
          'display:inline-flex;align-items:center;gap:0.375rem;height:1.5rem;padding:0 0.5rem;border:0;border-radius:0.25rem;' +
          'font:500 12px system-ui,sans-serif;cursor:pointer;' +
          (on ? 'background:var(--color-background);color:var(--color-foreground);box-shadow:0 1px 2px rgb(0 0 0/0.08)' : 'background:transparent;color:var(--color-muted-foreground)');
      }
    };
    paint();
    art.addEventListener('kai-tab-change', paint);
    // `kai-tab-change` reports the user's tab choice, not a `tab` assignment, and the toggle sets
    // `el.tab` itself, so repaint on every write. The element installs its own `tab` accessor when
    // it upgrades, so the wrap goes on after that, and wraps that accessor.
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
    bar.append(list);
  }
  art.append(bar);
}
