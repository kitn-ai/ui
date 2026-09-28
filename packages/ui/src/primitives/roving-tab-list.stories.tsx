import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import { createRovingTabList } from './roving-tab-list';

/**
 * The roving tab list is a MECHANISM, not a component. Nothing renders until you say three
 * things: which nodes are rows, what activating one means, and — if your rows are facades —
 * where the tab stop lives. What you get back is the keyboard: one tab stop across the whole
 * set, ArrowUp/ArrowDown between rows, Home/End at the ends, Enter/Space to activate, and a
 * row that yields its keys to a control nested inside it.
 *
 * Composing the list yourself is the point. The demo below is the arrangement this primitive
 * makes cheap: section headings BETWEEN rows, headings that are not rows and that the arrows
 * step over. The conversations rail is the built-in arrangement of the same mechanism, not a
 * different one.
 */
function RovingTabListDemo() {
  const sections = [
    { heading: 'Today', rows: [{ id: 'a', label: 'Refactor the fixture loader' }, { id: 'b', label: 'Draft the Q3 board update' }] },
    { heading: 'Yesterday', rows: [{ id: 'c', label: 'Bump esbuild past the CVE' }] },
  ];
  const [active, setActive] = createSignal('a');
  const [activated, setActivated] = createSignal<string | null>(null);
  let container!: HTMLDivElement;
  // The consumer's own row rule. `[data-row]` is what makes a node a row; the headings below
  // deliberately do not match, so the primitive never sees them.
  const rows = () => [...container.querySelectorAll<HTMLElement>('[data-row]')];

  onMount(() => {
    const list = createRovingTabList({
      getRows: rows,
      getActiveRow: () => rows().find((row) => row.dataset.row === active()),
      onActivate: (row) => {
        setActive(row.dataset.row!);
        setActivated(row.textContent);
      },
      // The row's own bookkeeping — role/aria-current belong to the arrangement, not to the
      // mechanism, so the primitive hands the resolved state back instead of inventing it.
      onRowSynced: (row, isActive) => {
        row.setAttribute('aria-current', String(isActive));
        row.dataset.active = String(isActive);
      },
    });
    container.addEventListener('click', (e) => list.handleClick(e));
    container.addEventListener('keydown', (e) => list.handleKeyDown(e));
    createEffect(() => { active(); list.sync(); });
    list.sync();
  });

  return (
    <div class="flex flex-col gap-3 text-sm">
      <div ref={container} role="list" class="w-full max-w-sm rounded-md border border-border p-1">
        <For each={sections}>
          {(section) => (
            <>
              {/* Not a row: the arrows step over it and clicking it activates nothing. */}
              <div class="px-2 pt-2 pb-1 text-caption font-medium text-muted-foreground">
                {section.heading}
              </div>
              <For each={section.rows}>
                {(item) => (
                  <div
                    data-row={item.id}
                    role="listitem"
                    class="cursor-pointer rounded-md px-2 py-1.5 data-[active=true]:bg-muted"
                  >
                    {item.label}
                  </div>
                )}
              </For>
            </>
          )}
        </For>
      </div>
      <div class="text-muted-foreground">
        Tab into the list once, then ArrowUp/ArrowDown/Home/End.{' '}
        <Show when={activated() !== null} fallback={<>Nothing activated yet.</>}>
          <>Activated: {activated()}</>
        </Show>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'Labs/Foundations/Roving tab list',
  parameters: { layout: 'padded' },
};
export default meta;

const src = (code: string) => ({ docs: { source: { language: 'tsx', code } } });

/**
 * Rows with section headings between them: one tab stop across all three rows, the arrows
 * stepping over the headings, Enter or a click selecting the row it happened in.
 */
export const ComposedRows: StoryObj = {
  render: () => <RovingTabListDemo />,
  parameters: src(`import { createRovingTabList } from '@kitn.ai/ui';

const list = createRovingTabList({
  // Rows in DOM order. A heading between them is simply not a row.
  getRows: () => [...container.querySelectorAll('[data-row]')],
  getActiveRow: () => rows().find((row) => row.dataset.row === activeId()),
  onActivate: (row) => select(row.dataset.row),
  onRowSynced: (row, isActive) => row.setAttribute('aria-current', String(isActive)),
});
// Real listeners on the list region: composedPath() is only populated while dispatching.
container.addEventListener('keydown', (e) => list.handleKeyDown(e));
container.addEventListener('click', (e) => list.handleClick(e));
// After child mutations, and whenever the active row changes.
list.sync();`),
};
