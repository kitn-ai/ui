import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { ComposerChips } from './composer-chips';
import { DefaultPromptInput, type ComposerToolItem } from './default-input';

// The chips are the SECOND view of one field. A capability is an item with
// `checked: boolean` in the composer's `tools` tree; the menu renders that as a checkbox and
// the chip row renders it as a removable chip, so the two cannot disagree about what is on.
//
// `chip` is the opt-in, and it defaults to FALSE — the kit's default is quiet, and a host
// names the capabilities worth reminding the user about. The block template sets it on web
// search; nothing here does it for you.
//
// WHERE THE OVERFLOW GOES, because it is a real edge and it has an answer rather than a
// clamp: both clusters are `shrink-0`, so as chips multiply the item that gives is the TEXT.
// It wraps, a wrapped line means the composer is no longer one line, and the derived layout
// then hands the chips their own row. The composer self-corrects and the resolver needs no
// chip input. The case that does NOT self-correct is a row whose chips alone are wider than
// the composer: that is a host with more active capabilities than the leading edge can hold,
// and the documented answer is to pin the layout open with `expanded` rather than to hide
// them behind a "+3" the user cannot act on.

const meta = {
  title: 'Components/PromptInput/ComposerChips',
  component: ComposerChips,
  tags: ['autodocs'],
  argTypes: {
    onRemove: {
      action: 'remove',
      description: 'A chip was clicked, carrying the id of the capability being turned off.',
      table: { category: 'Events' },
    },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The active-capability chips that sit beside the composer\'s `+` menu. One chip per ' +
          'item that is both `checked` and `chip: true`; clicking one turns that capability off, ' +
          'which is the same event the menu fires.',
      },
    },
  },
} satisfies Meta<typeof ComposerChips>;

export default meta;
type Story = StoryObj<typeof meta>;

const CAPABILITIES: ComposerToolItem[] = [
  { id: 'web-search', label: 'Web search', icon: 'globe', checked: true, chip: true },
  { id: 'create-image', label: 'Create image', icon: 'image', checked: true, chip: true },
  // Off, and therefore not rendered: a chip shows what is ON, not what exists.
  { id: 'sketch', label: 'Sketch', icon: 'pencil', checked: false, chip: true },
];

const source = (code: string) => ({
  parameters: { docs: { source: { language: 'tsx', code: `import { ComposerChips } from '@kitn.ai/ui';\n\n${code}` } } },
});

/** The chips on their own, which is what a host composing its own composer would render. */
export const Default: Story = {
  render: () => (
    <ComposerChips
      items={CAPABILITIES.filter((c) => c.checked)}
      onRemove={(id) => console.log('turned off', id)}
    />
  ),
  ...source(`<ComposerChips
  items={[
    { id: 'web-search', label: 'Web search', icon: 'globe', checked: true },
    { id: 'create-image', label: 'Create image', icon: 'image', checked: true },
  ]}
  onRemove={(id) => setCapabilityOff(id)}
/>`),
};

/** The same chips in the row they belong to. The composer is what places them, and the state
 *  round-trips through `onToolSelect`, so one field drives both views. */
export const InTheComposer: Story = {
  render: () => {
    const [tools, setTools] = createSignal(CAPABILITIES);
    return (
      <div style={{ width: '640px' }}>
        <DefaultPromptInput
          value=""
          placeholder="Ask anything..."
          tools={tools()}
          onValueChange={() => {}}
          onSubmit={() => {}}
          onSuggestionClick={() => {}}
          onToolSelect={(d) => {
            if (d.checked === undefined) return;
            setTools(tools().map((tool) => (tool.id === d.id ? { ...tool, checked: d.checked } : tool)));
          }}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      source: {
        language: 'html',
        code: `<!-- a checked capability shows in the menu AND, when it opts in, as a chip -->
<kai-prompt-input id="input"></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/web-components';
  const input = document.getElementById('input');
  input.tools = [
    { id: 'web-search', label: 'Web search', icon: 'globe', checked: true, chip: true },
    { id: 'create-image', label: 'Create image', icon: 'image', checked: true, chip: true },
  ];
  // One event for both views: the chip's 'turn off' and the menu's checkbox land here.
  input.addEventListener('kai-select', (e) => {
    input.tools = input.tools.map((tool) =>
      tool.id === e.detail.id ? { ...tool, checked: e.detail.checked } : tool);
  });
</script>`,
      },
    },
  },
};
