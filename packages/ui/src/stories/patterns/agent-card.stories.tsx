import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { For, Show, createSignal, onMount } from 'solid-js';
import { expect, userEvent, waitFor } from 'storybook/test';
import '../../web-components/register/register'; // side effect: registers every kai-* element
import type { KaiMenuItem } from '../../web-components/menu/menu';
import { attachKaiActions } from '../docs/story-actions';

type Tone = 'working' | 'idle' | 'done' | 'error' | 'blocked';
interface Agent { name: string; tone: Tone; label: string; pulse?: boolean; needsYou?: boolean }

const AGENTS: Agent[] = [
  { name: 'Planner', tone: 'working', label: 'Working', pulse: true },
  { name: 'Reviewer', tone: 'idle', label: 'Idle' },
  { name: 'Builder', tone: 'done', label: 'Done' },
  { name: 'Tester', tone: 'error', label: 'Failed' },
  { name: 'Deployer', tone: 'blocked', label: 'Blocked on you', needsYou: true },
];

const MENU: KaiMenuItem[] = [
  { id: 'rename', label: 'Rename' },
  { id: 'pause', label: 'Pause' },
  { id: 'remove', label: 'Remove' },
];

const meta = {
  title: 'Patterns/Agent Card',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// The same composition `kai add agent-card` writes into a project
// (packages/blocks/patterns/agent-card/), authored here in Solid JSX. The row is
// the button; the menu is its sibling, laid over the row's trailing edge, so no
// interactive control sits inside another.
const TONE_COLOR: Record<Tone, string> = {
  working: 'var(--color-tool-blue)',
  idle: 'var(--color-muted-foreground)',
  done: 'var(--color-tool-green)',
  error: 'var(--color-tool-red)',
  blocked: 'var(--color-tool-amber)',
};

const cardColors = (a: Agent, active: boolean) => ({
  'border-color': a.needsYou
    ? 'color-mix(in srgb, var(--color-tool-amber) 50%, transparent)'
    : active ? 'var(--color-primary)' : 'var(--color-border)',
  background: active ? 'var(--color-accent)' : 'var(--color-surface)',
  'box-shadow': a.needsYou ? 'inset 0 0 0 2px color-mix(in srgb, var(--color-tool-amber) 60%, transparent)' : 'none',
});

function AgentList() {
  const [active, setActive] = createSignal('Builder');
  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem', width: '21.25rem', 'max-width': '100%' }}>
      <For each={AGENTS}>
        {(agent) => {
          let menu!: HTMLElement & { items?: KaiMenuItem[] };
          let row!: HTMLElement;
          onMount(() => {
            menu.items = MENU;
            const stop = [attachKaiActions(menu), attachKaiActions(row)];
            row.addEventListener('kai-click', () => setActive(agent.name));
            return () => stop.forEach((s) => s());
          });
          return (
            <div
              data-tone={agent.tone}
              style={{ position: 'relative', border: '1px solid', 'border-radius': '0.5rem', ...cardColors(agent, active() === agent.name) }}
            >
              <kai-row ref={row} interactive prop:active={active() === agent.name}>
                <span slot="leading" style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.375rem', 'font-size': '0.75rem', 'font-weight': '500', 'line-height': '1', color: TONE_COLOR[agent.tone] }}>
                  <kai-status status={agent.tone} label={agent.label} pulse={agent.pulse}></kai-status>
                  <span aria-hidden="true">{agent.label}</span>
                </span>
                <span>{agent.name}</span>
                <span slot="trailing" style={{ 'padding-inline-end': '1.75rem' }}>
                  <Show when={agent.needsYou}>
                    <kai-badge variant="outline">Needs you</kai-badge>
                  </Show>
                </span>
              </kai-row>
              <kai-menu
                ref={menu}
                label={`More actions for ${agent.name}`}
                style={{ position: 'absolute', 'inset-block': '0', 'inset-inline-end': '0.5rem', display: 'flex', 'align-items': 'center' }}
              ></kai-menu>
            </div>
          );
        }}
      </For>
    </div>
  );
}

/**
 * One row per agent status, with the attention signal as visible text. Enter and
 * Space activate a row, and each menu trigger names the agent it acts on.
 */
export const Default: Story = {
  render: () => <AgentList />,
  parameters: {
    docs: {
      source: {
        language: 'html',
        code: `<!-- Run: kai add agent-card. The row is the button and the menu is its sibling. -->
<kai-row interactive>
  <span slot="leading"><kai-status status="blocked" label="Blocked on you"></kai-status> Blocked on you</span>
  Deployer
  <span slot="trailing"><kai-badge variant="outline">Needs you</kai-badge></span>
</kai-row>
<kai-menu label="More actions for Deployer"></kai-menu>`,
      },
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('kai-row').length).toBe(5));
    // Status is text, not just colour: each row's leading region carries its word.
    const words = [...canvasElement.querySelectorAll('kai-row [slot="leading"]')].map((n) => n.textContent?.trim());
    expect(words).toEqual(['Working', 'Idle', 'Done', 'Failed', 'Blocked on you']);
    expect(canvasElement.querySelectorAll('kai-badge').length).toBe(1);
    expect(canvasElement.querySelector('kai-badge')?.textContent).toBe('Needs you');
    // Every menu trigger has its own accessible name.
    // The name is read from the trigger the menu renders, not from the prop.
    await waitFor(() => {
      const names = [...canvasElement.querySelectorAll('kai-menu')].map((m) => m.shadowRoot?.querySelector('button')?.getAttribute('aria-label'));
      expect(names).toEqual(AGENTS.map((a) => `More actions for ${a.name}`));
    });

    // Enter and Space on the focused row fire kai-click.
    const row = canvasElement.querySelectorAll('kai-row')[1] as HTMLElement;
    let clicks = 0;
    row.addEventListener('kai-click', () => clicks++);
    const button = await waitFor(() => {
      const b = row.shadowRoot?.querySelector('button');
      expect(b).toBeTruthy();
      return b as HTMLButtonElement;
    });
    button.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(clicks).toBe(2);
    // The selected card is announced: aria-current sits on the row's own button, and only there.
    const current = () => [...canvasElement.querySelectorAll('kai-row')].map((r) => r.shadowRoot?.querySelector('button')?.getAttribute('aria-current') ?? null);
    await waitFor(() => expect(current()).toEqual([null, 'true', null, null, null]));
    await userEvent.click(canvasElement.querySelectorAll('kai-row')[2].shadowRoot!.querySelector('button')!);
    await waitFor(() => expect(current()).toEqual([null, null, 'true', null, null]));
  },
};
