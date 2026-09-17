import { For } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { RowGroup, type RowGroupProps } from './row-group';
import { Row } from '../components/row';
import { renderIcon } from '../ui/icon';
import { componentDescription } from '../stories/docs/element-controls';

/**
 * `RowGroup` on its own page, the way `CheckboxGroup` has one beside `Checkbox`:
 * the frame is a part you reach for by name, and it is what decides the geometry
 * every row inside it inherits.
 */
const meta = {
  title: 'Components/Primitives/RowGroup',
  component: RowGroup,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'The frame that turns loose rows into a list: one bordered, rounded card with a hairline between adjacent rows, the first row rounded at the top only and the last at the bottom only. It renders no geometry itself — the rows read the corner radius and the divider from custom properties the group sets on its children by position — so a list of `Row`s and a list of `SettingItem`s are framed identically.',
        'COMPOSITION ONLY. It takes children, not `items`: which rows exist, in what order, what an empty list means and whether a row is allowed are your application\'s business, not a component\'s. One row in a group is a framed card (both first and last), which is why the same component covers a settings screen (N rows, one frame) and a home tab (one frame per row, spaced).',
        'Two rules come from reaching a row across a style boundary, and neither is visible in the markup. Rows must be DIRECT CHILDREN: wrap one in a `<div>` and the divider and the corners land on the wrapper instead. And a row is added and REMOVED rather than hidden — a `hidden` row stays in the sibling chain, so the row after it paints its hairline under the frame\'s top edge. Mount and unmount, which every framework here already does.',
        '`--kai-row-radius` is the corner-radius knob for the whole list (default: the `--radius-lg` token a standalone row rounds on). Set it to `0` for a group that sits flush inside a panel that is already rounded. The frame itself is styleable from outside via `::part(group)`, and its chrome is ordinary classes, so `class="rounded-none border-0"` drops the frame entirely and leaves only the dividers.',
        'The frame carries NO role of its own, on purpose: a row group is sometimes a cluster of related controls and sometimes just a run of links, and only you know which. When the rows are one meaningful cluster, say so — `role="group"` with `aria-label` (or `aria-labelledby` pointing at visible text) — and both attributes pass straight through to the frame. A `role` the kit picked would be wrong for half the lists it frames.',
        'Ships as `<kai-row-group>` with a `<slot>` for the rows, so React, Vue, Svelte, Angular and plain-HTML apps get the same frame; a `<kai-row>` or `<kai-setting-item>` marks itself as a list row, and your own custom element can opt into the geometry by setting `data-kai-row` on itself.',
      ]),
    },
  },
  argTypes: {
    class: { control: 'text', description: 'Extra classes on the frame — width, background, or removing its chrome.' },
    onActivate: { action: 'activate', description: 'Not a prop of the group: wired onto each demo row below, so a click shows up in the Actions panel.', table: { category: 'Events' } },
  },
  // `onActivate` belongs to `Row`, not to the frame — the cast keeps the demo
  // handler visible in the Actions panel without inventing a prop the component
  // does not have.
  args: {
    class: 'w-80',
    onActivate: fn(),
  } as RowGroupProps & { onActivate: () => void },
} satisfies Meta<typeof RowGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Row, RowGroup } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

const ICONS = ['sliders-horizontal', 'git-branch', 'file-text'] as const;

/** The everyday shape: a framed list of pressable rows. Hover a middle row to see
 *  why its corners are square — the fill runs to the frame's edge on both sides,
 *  which is only possible with a square corner. */
export const Default: Story = {
  render: (args: { class?: string; onActivate: () => void }) => (
    <RowGroup class={args.class} role="group" aria-label="Account settings">
      <Row
        onActivate={args.onActivate}
        leading={renderIcon(ICONS[0], { class: 'size-4 shrink-0' })}
        subtitle="Theme, language, density"
        chevron
      >
        Preferences
      </Row>
      <Row
        onActivate={args.onActivate}
        leading={renderIcon(ICONS[1], { class: 'size-4 shrink-0' })}
        trailing={<span>3</span>}
        chevron
      >
        Connected repos
      </Row>
      <Row
        onActivate={args.onActivate}
        leading={renderIcon(ICONS[2], { class: 'size-4 shrink-0' })}
        trailing={<span>1.4.2</span>}
      >
        Release notes
      </Row>
    </RowGroup>
  ),
  ...src(`{/* the frame takes no role of its own: this one IS a cluster of related
    settings, so it is labelled. role and aria-label pass straight through. */}
<RowGroup class="w-80" role="group" aria-label="Account settings">
  <Row leading={<Sliders />} subtitle="Theme, language, density" chevron onActivate={openPreferences}>
    Preferences
  </Row>
  <Row leading={<GitBranch />} trailing={<span>3</span>} chevron onActivate={openRepos}>
    Connected repos
  </Row>
  <Row leading={<FileText />} trailing={<span>1.4.2</span>}>Release notes</Row>
</RowGroup>`),
};

/**
 * The whole geometry, which is the only thing the frame decides: a one-row group
 * rounds on all four corners, an N-row group rounds the first row's top and the
 * last row's bottom and squares every row between them, and `--kai-row-radius: 0`
 * flattens the list for a group sitting inside a rounded panel.
 */
function Geometry() {
  const row = (label: string, subtitle: string) => <Row subtitle={subtitle}>{label}</Row>;
  return (
    <div class="flex flex-wrap items-start gap-6">
      <RowGroup class="w-64">{row('One row', 'First and last at once')}</RowGroup>
      <RowGroup class="w-64">
        {row('First', 'Rounded at the top only')}
        {row('Last', 'Rounded at the bottom only')}
      </RowGroup>
      <RowGroup class="w-64">
        {row('First', 'Rounded at the top')}
        {row('Middle', 'Square, with hairlines on both sides')}
        {row('Last', 'Rounded at the bottom')}
      </RowGroup>
      <RowGroup class="w-64 [--kai-row-radius:0]">
        {row('Flush', '--kai-row-radius: 0')}
        {row('Flush', 'For a group inside a rounded panel')}
      </RowGroup>
    </div>
  );
}

export const GeometryStory: Story = {
  name: 'Geometry',
  render: () => <Geometry />,
  ...src(`{/* one row: a framed card, rounded on all four corners */}
<RowGroup class="w-64">
  <Row subtitle="First and last at once">One row</Row>
</RowGroup>

{/* N rows: first rounds at the top, last at the bottom, hairline between */}
<RowGroup class="w-64">
  <Row subtitle="Rounded at the top">First</Row>
  <Row subtitle="Square, with hairlines on both sides">Middle</Row>
  <Row subtitle="Rounded at the bottom">Last</Row>
</RowGroup>

{/* flush: the list's radius knob set to 0 */}
<RowGroup class="w-64 [--kai-row-radius:0]">
  <Row>Flush</Row>
  <Row>Flush</Row>
</RowGroup>`),
};

/**
 * Spacing is the other axis, and it needs nothing from this component: spaced rows
 * are separate one-row groups in a `gap` container, where rounding every corner is
 * correct — there is no neighbour to share an edge with. Grouped is one frame with
 * the rows flush, so the hairlines do the separating.
 */
function GroupedAndSpaced() {
  const links = ['Where is my order?', 'Return an item', 'Talk to a human'];
  return (
    <div class="flex flex-wrap items-start gap-8">
      <div class="flex w-72 flex-col gap-2">
        <div class="text-xs font-medium text-muted-foreground">One row per group (spaced)</div>
        <div class="flex flex-col gap-3">
          <For each={links}>
            {(label) => (
              <RowGroup>
                <Row subtitle="Guides and FAQs" chevron>
                  {label}
                </Row>
              </RowGroup>
            )}
          </For>
        </div>
      </div>
      <div class="flex w-72 flex-col gap-2">
        <div class="text-xs font-medium text-muted-foreground">One group (flush)</div>
        <RowGroup>
          <For each={links}>
            {(label) => (
              <Row subtitle="Guides and FAQs" chevron>
                {label}
              </Row>
            )}
          </For>
        </RowGroup>
      </div>
    </div>
  );
}

export const GroupedAndSpacedStory: Story = {
  name: 'Grouped vs spaced',
  render: () => <GroupedAndSpaced />,
  ...src(`{/* spaced: one frame per row, room for the corners */}
<div class="flex flex-col gap-3">
  <RowGroup><Row chevron>Where is my order?</Row></RowGroup>
  <RowGroup><Row chevron>Return an item</Row></RowGroup>
</div>

{/* grouped: one frame, rows flush, hairlines between */}
<RowGroup>
  <Row chevron>Where is my order?</Row>
  <Row chevron>Return an item</Row>
</RowGroup>`),
};

/** Both themes side by side: the two panels are identical apart from the `dark`
 *  class, so this is a color comparison and nothing else. */
export const LightAndDark: Story = {
  render: () => (
    <div class="flex flex-wrap gap-6">
      <div class="rounded-lg border border-border bg-background p-4">
        <div class="mb-2 text-xs font-medium text-muted-foreground">Light</div>
        <RowGroup class="w-64">
          <Row subtitle="Theme, language, density" chevron>
            Preferences
          </Row>
          <Row subtitle="Three connected" chevron>
            Repos
          </Row>
        </RowGroup>
      </div>
      <div class="dark rounded-lg border border-border bg-background p-4">
        <div class="mb-2 text-xs font-medium text-muted-foreground">Dark</div>
        <RowGroup class="w-64">
          <Row subtitle="Theme, language, density" chevron>
            Preferences
          </Row>
          <Row subtitle="Three connected" chevron>
            Repos
          </Row>
        </RowGroup>
      </div>
    </div>
  ),
  ...src(`<RowGroup class="w-64">
  <Row subtitle="Theme, language, density" chevron>Preferences</Row>
  <Row subtitle="Three connected" chevron>Repos</Row>
</RowGroup>`),
};
