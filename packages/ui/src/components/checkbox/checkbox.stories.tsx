import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { createSignal, For } from 'solid-js';
import { Checkbox, type CheckboxProps } from './checkbox';
import { componentDescription } from '../../stories/docs/web-component-controls';

// The component renders a real `<input type="checkbox">` behind `appearance: none`, so keyboard
// operation, the focus ring, form participation and screen-reader announcement are the browser's.
// Everything it does not own is forwarded to that input; the one thing it adds is `indeterminate`,
// which is a DOM property with no attribute. No validation is applied: `required` reaches the native
// attribute and stops there, and whether an unticked box is an error is the application's rule.

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A control for turning an option on or off.',
      ]),
    },
  },
  argTypes: {
    checked: { control: 'boolean', description: 'Checked state; drive it from `onChange`.' },
    indeterminate: {
      control: 'boolean',
      description: 'The mixed state of a parent box whose children are partly ticked. A DOM property, so set it from JS.',
    },
    disabled: { control: 'boolean', description: 'Disables interaction and dims the box.' },
    required: { control: 'boolean', description: 'Native `required`; the kit adds no validation.' },
    name: { control: 'text', description: 'Name the form submits, paired with `value`.' },
    value: { control: 'text', description: 'Submitted value when checked. Defaults to `on`.' },
    class: { control: 'text', description: 'Extra classes, merged with the kit rule rather than replacing it.' },
    'aria-label': {
      control: 'text',
      description: 'Accessible name, for a box with no visible label.',
    },
    onChange: { action: 'change', description: 'Native change event. Read `e.currentTarget.checked`.', table: { category: 'Events' } },
  },
  args: {
    checked: false,
    indeterminate: false,
    disabled: false,
    required: false,
    name: 'notify',
    value: 'on',
    // Every prop the component does not own is forwarded, and `aria-label` is the one a
    // bare checkbox genuinely needs: axe flags an unnamed form control, and a demo that
    // ships the violation teaches the violation. The label-row story shows the better form.
    'aria-label': 'Notify me',
    onChange: fn(),
  },
  render: (args: CheckboxProps) => <Checkbox {...args} />,
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * SolidJS stories can't auto-serialize a render function, so notable variations carry
 * a real, paste-ready snippet with its import line.
 */
const IMPORT = `import { Checkbox } from '@kitn.ai/ui/solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Every prop on a control panel. Toggle `checked`, `indeterminate` and `disabled` here. */
export const Playground: Story = {
  ...src('<Checkbox aria-label="Notify me" />'),
};

/**
 * The three states side by side. Mixed fills the box like checked does and draws a bar
 * instead of a tick, so "some" is never mistaken for "none".
 */
export const States: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', 'align-items': 'center' }}>
      <label style={{ display: 'inline-flex', gap: '0.625rem', 'align-items': 'center' }}>
        <Checkbox /> <span>Unchecked</span>
      </label>
      <label style={{ display: 'inline-flex', gap: '0.625rem', 'align-items': 'center' }}>
        <Checkbox checked /> <span>Checked</span>
      </label>
      <label style={{ display: 'inline-flex', gap: '0.625rem', 'align-items': 'center' }}>
        <Checkbox indeterminate /> <span>Mixed</span>
      </label>
    </div>
  ),
  ...src(`<Checkbox />
<Checkbox checked />
<Checkbox indeterminate />`),
};

/** A disabled checkbox, off and on. */
export const Disabled: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', 'align-items': 'center' }}>
      <label style={{ display: 'inline-flex', gap: '0.625rem', 'align-items': 'center' }}>
        <Checkbox disabled /> <span>Off, locked</span>
      </label>
      <label style={{ display: 'inline-flex', gap: '0.625rem', 'align-items': 'center' }}>
        <Checkbox disabled checked /> <span>On, locked</span>
      </label>
    </div>
  ),
  ...src(`<Checkbox disabled />
<Checkbox disabled checked />`),
};

/**
 * A checkbox wrapped in a label: the label text is the accessible name and the
 * whole row is the click target.
 */
export const WithLabel: Story = {
  name: 'In a label row',
  render: () => {
    const [on, setOn] = createSignal(true);
    return (
      <label style={{ display: 'inline-flex', gap: '0.625rem', 'align-items': 'center', cursor: 'pointer' }}>
        <Checkbox checked={on()} onChange={(e) => setOn(e.currentTarget.checked)} />
        <span>Stream responses as they generate</span>
      </label>
    );
  },
  ...src(`const [on, setOn] = createSignal(true);

<label class="inline-flex cursor-pointer items-center gap-2.5">
  <Checkbox checked={on()} onChange={(e) => setOn(e.currentTarget.checked)} />
  <span>Stream responses as they generate</span>
</label>`),
};

// `indeterminate` is visual plus an accessibility hint: the input still reports
// `checked: false` and submits accordingly, so the children have to be driven
// from the story's own state.
/** Three children, one on, so the parent box is mixed. */
export const ParentAndChildren: Story = {
  name: 'Parent with mixed state',
  render: () => {
    const TOOLS = ['Web search', 'Code interpreter', 'File retrieval'];
    const [on, setOn] = createSignal<string[]>(['Code interpreter']);
    const all = () => on().length === TOOLS.length;
    const some = () => on().length > 0 && !all();
    return (
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
        <label style={{ display: 'inline-flex', gap: '0.625rem', 'align-items': 'center', cursor: 'pointer', 'font-weight': 500 }}>
          <Checkbox
            checked={all()}
            indeterminate={some()}
            aria-checked={some() ? 'mixed' : all()}
            onChange={(e) => setOn(e.currentTarget.checked ? [...TOOLS] : [])}
          />
          <span>Enable all tools</span>
        </label>
        <For each={TOOLS}>
          {(tool) => (
            <label style={{ display: 'inline-flex', gap: '0.625rem', 'align-items': 'center', cursor: 'pointer', 'padding-left': '1.75rem' }}>
              <Checkbox
                checked={on().includes(tool)}
                onChange={(e) => setOn(e.currentTarget.checked ? [...on(), tool] : on().filter((t) => t !== tool))}
              />
              <span>{tool}</span>
            </label>
          )}
        </For>
      </div>
    );
  },
  ...src(`// The tool list is your own data: this is what the parent box stands for.
const TOOLS = ['Web search', 'Code interpreter', 'File retrieval'];

const all = () => on().length === TOOLS.length;
const some = () => on().length > 0 && !all();

<Checkbox
  checked={all()}
  indeterminate={some()}
  aria-checked={some() ? 'mixed' : all()}
  onChange={(e) => setOn(e.currentTarget.checked ? [...TOOLS] : [])}
/>`),
};

/**
 * Three checkboxes on one form field, with the submitted values printed underneath.
 */
export const InAForm: Story = {
  name: 'Native form participation',
  render: () => {
    const [submitted, setSubmitted] = createSignal<string[]>([]);
    return (
      <form
        style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem', 'align-items': 'flex-start' }}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(new FormData(e.currentTarget).getAll('env') as string[]);
        }}
      >
        <For each={['Production', 'Staging', 'Local']}>
          {(env) => (
            <label style={{ display: 'inline-flex', gap: '0.625rem', 'align-items': 'center', cursor: 'pointer' }}>
              <Checkbox name="env" value={env.toLowerCase()} /> <span>{env}</span>
            </label>
          )}
        </For>
        <button type="submit" style={{ 'margin-top': '0.5rem' }}>Submit</button>
        <code style={{ 'font-size': '12px' }}>env = [{submitted().map((v) => `"${v}"`).join(', ')}]</code>
      </form>
    );
  },
  ...src(`<form onSubmit={(e) => { e.preventDefault(); console.log(new FormData(e.currentTarget).getAll('env')); }}>
  <Checkbox name="env" value="production" />
  <Checkbox name="env" value="staging" />
  <Checkbox name="env" value="local" />
  <button type="submit">Submit</button>
</form>`),
};
