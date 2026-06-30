/** Live demo for "Menus & command pickers" — two interactive pickers side by side:
 *
 *  - <kai-menu>: the `+` cascading menu. A nested "Skills" submenu, a separator, and
 *    a "Web search" checkbox toggle. Trigger via a slotted `slot="trigger"` (a + icon).
 *    Fires `kai-select` with `{ id }` (plus `checked` for the toggle).
 *  - <kai-command>: a grouped, filterable picker (the @-mention / command palette).
 *    Items carry a `group`; type to filter across groups. Fires `kai-select` ({ id })
 *    and `kai-query-change` ({ value }) on every keystroke.
 *
 *  Built like ComposerDemo.tsx / ComposedShell.tsx: array data is set as JS properties
 *  in onMount (arrays can't be HTML attributes) and events are wired with
 *  addEventListener (kit events don't bubble and Solid's on: handlers don't cross the
 *  shadow boundary). Every selection is logged to a shared Console strip, mirroring the
 *  FeedbackDemo / Playground convention. Theme-aware — mirrors the page theme. */
import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { loadKit, syncKaiTheme } from './example/kit';

type AnyEl = HTMLElement & Record<string, unknown>;

export default function MenuCommandDemo() {
  let menuEl: AnyEl | undefined;
  let commandEl: AnyEl | undefined;

  const [log, setLog] = createSignal<string[]>([]);
  const push = (m: string) => setLog((p) => [...p.slice(-5), m]);

  const cleanups: Array<() => void> = [];

  onMount(async () => {
    await loadKit();

    // The + menu — attach actions, a nested "Skills" submenu, a separator, and a
    // "Web search" checkbox. `heading: true` renders a non-interactive group label.
    if (menuEl) {
      customElements.upgrade(menuEl);
      menuEl.items = [
        { heading: true, label: 'Actions' },
        { id: 'add-files', label: 'Add files or photos', icon: 'paperclip', shortcut: '⌘U' },
        { id: 'add-github', label: 'Add from GitHub', icon: 'github' },
        {
          label: 'Skills',
          icon: 'sparkles',
          items: [
            { id: 'skill-creator', label: 'skill-creator', icon: 'sparkles' },
            { id: 'manage-skills', label: 'Manage skills', icon: 'settings' },
            { id: 'add-skill', label: 'Add skill', icon: 'file-text' },
          ],
        },
        { separator: true },
        { id: 'web-search', label: 'Web search', icon: 'globe', checked: true },
        { id: 'coming-soon', label: 'Coming soon', disabled: true },
      ];

      const onMenuSelect = (e: Event) => {
        const d = (e as CustomEvent<{ id: string; checked?: boolean }>).detail;
        push(`kai-select  •  ${d.id}${d.checked !== undefined ? `  (checked: ${d.checked})` : ''}`);
        // Checkbox items report the NEW state — write a fresh array back to keep the
        // checkmark in sync (mutating in place won't re-render).
        if (d.id === 'web-search' && d.checked !== undefined) {
          menuEl!.items = (menuEl!.items as Array<Record<string, unknown>>).map((item) =>
            item.id === 'web-search' ? { ...item, checked: d.checked } : item,
          );
        }
      };
      menuEl.addEventListener('kai-select', onMenuSelect);
      cleanups.push(() => menuEl!.removeEventListener('kai-select', onMenuSelect));
    }

    // The command picker — a flat list of items, grouped by `group`. The element
    // groups, filters, and keyboard-navigates them for you.
    if (commandEl) {
      customElements.upgrade(commandEl);
      commandEl.items = [
        { id: 'ana', label: 'Ana Ortiz', icon: 'message-circle', description: 'Design', group: 'People' },
        { id: 'sam', label: 'Sam Lee', icon: 'message-circle', description: 'Engineering', group: 'People' },
        { id: 'design-spec', label: 'design-spec.md', icon: 'file-text', description: '/docs', group: 'Files' },
        { id: 'roadmap', label: 'roadmap.md', icon: 'file-text', description: '/docs', group: 'Files' },
        { id: 'deploy', label: 'Deploy', icon: 'sparkles', description: 'Ship to production', group: 'Commands' },
        { id: 'invite', label: 'Invite teammate', icon: 'paperclip', group: 'Commands' },
      ];

      const onCommandSelect = (e: Event) => {
        const d = (e as CustomEvent<{ id: string }>).detail;
        push(`kai-select  •  ${d.id}`);
      };
      const onQueryChange = (e: Event) => {
        const d = (e as CustomEvent<{ value: string }>).detail;
        push(`kai-query-change  •  "${d.value}"`);
      };
      commandEl.addEventListener('kai-select', onCommandSelect);
      commandEl.addEventListener('kai-query-change', onQueryChange);
      cleanups.push(() => commandEl!.removeEventListener('kai-select', onCommandSelect));
      cleanups.push(() => commandEl!.removeEventListener('kai-query-change', onQueryChange));
    }

    // Theme-sync both elements to the page theme.
    for (const el of [menuEl, commandEl]) {
      if (el) cleanups.push(syncKaiTheme(el));
    }

    onCleanup(() => cleanups.forEach((c) => c()));
  });

  return (
    <div class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface">
      {/* Preview — two pickers, stacked on narrow screens, side by side on wide. */}
      <div class="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:gap-8">
        {/* The + cascading menu. */}
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold uppercase tracking-wider text-ink-3">
            <code>kai-menu</code> — the + menu
          </div>
          {/* @ts-expect-error custom element */}
          <kai-menu ref={(el: HTMLElement) => (menuEl = el as AnyEl)}>
            {/* A slotted trigger replaces the built-in button. */}
            <span
              slot="trigger"
              style={{ display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center' } as any}
            >
              {/* @ts-expect-error custom element */}
              <kai-icon name="plus" size="md" />
            </span>
          </kai-menu>
          <p class="max-w-[15rem] text-xs text-ink-3">
            Click + to open. Hover <strong>Skills</strong> for the submenu; toggle{' '}
            <strong>Web search</strong>.
          </p>
        </div>

        {/* The grouped command picker. */}
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div class="text-xs font-semibold uppercase tracking-wider text-ink-3">
            <code>kai-command</code> — the grouped picker
          </div>
          <div class="overflow-hidden rounded-xl border border-line" style={{ 'max-width': '22rem' } as any}>
            {/* @ts-expect-error custom element */}
            <kai-command
              ref={(el: HTMLElement) => (commandEl = el as AnyEl)}
              placeholder="Search people, files, commands…"
              empty-label="Nothing matches"
              style={{ display: 'block' } as any}
            />
          </div>
          <p class="max-w-[22rem] text-xs text-ink-3">
            Type to filter across groups. Arrow keys move; Enter picks; Escape clears.
          </p>
        </div>
      </div>

      {/* Console — below the preview, logging both elements' events. */}
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
            fallback={<span class="font-sans text-ink-3">Pick from a menu or search — events appear here.</span>}
          >
            <For each={log()}>{(line) => <div class="whitespace-pre-wrap break-words">{line}</div>}</For>
          </Show>
        </div>
      </div>
    </div>
  );
}
