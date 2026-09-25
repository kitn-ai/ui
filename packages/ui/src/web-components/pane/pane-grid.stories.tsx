import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import '../register/register'; // side effect: registers all kai-* custom elements (incl. kai-pane-grid)

// Declare the custom element tags for SolidJS JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-pane-grid': JSX.HTMLAttributes<HTMLElement> & {
        'min-pane-width'?: string | number;
        'min-pane-height'?: string | number;
        'max-columns'?: string | number;
        gap?: string;
        'maximized-index'?: string | number;
      };
      'kai-pane': JSX.HTMLAttributes<HTMLElement> & {
        headline?: string;
        subtitle?: string;
        maximized?: boolean;
        focused?: boolean;
      };
    }
  }
}

const meta = {
  title: 'Labs/Pane Grid',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

const body = (text: string) => (
  <div style={{ padding: '12px', color: 'var(--color-muted-foreground)', 'font-size': '13px' }}>{text}</div>
);

// Hand-written HTML for the "Show code" panel (real consumer markup, not JSX).
const src = (code: string) => ({ docs: { source: { language: 'html', code } } });

/**
 * Four panes in one grid, dropping columns as it narrows so no pane squishes below a
 * minimum width.
 */
export const FourPanes: Story = {
  render: () => (
    <kai-pane-grid style={{ height: '480px' }} min-pane-width="240">
      <kai-pane headline="Atlas" subtitle="claude-sonnet">{body('Running tests…')}</kai-pane>
      <kai-pane headline="Otto" subtitle="Reviewer">{body('Waiting on input')}</kai-pane>
      <kai-pane headline="Nova" subtitle="claude-haiku">{body('Idle')}</kai-pane>
      <kai-pane headline="Juno" subtitle="Docs">{body('Drafting')}</kai-pane>
    </kai-pane-grid>
  ),
  parameters: src(`<kai-pane-grid min-pane-width="240" style="height: 480px">
  <kai-pane headline="Atlas" subtitle="claude-sonnet">Running tests...</kai-pane>
  <kai-pane headline="Otto" subtitle="Reviewer">Waiting on input</kai-pane>
  <kai-pane headline="Nova" subtitle="claude-haiku">Idle</kai-pane>
  <kai-pane headline="Juno" subtitle="Docs">Drafting</kai-pane>
</kai-pane-grid>`),
};

/** A pane maximized to fill the grid and restored again. */
export const MaximizeHook: Story = {
  render: () => (
    <kai-pane-grid
      style={{ height: '420px' }}
      min-pane-width="200"
      ref={(grid: HTMLElement) => {
        Array.from(grid.children).forEach((pane, i) => {
          pane.addEventListener('kai-maximize', (e) => {
            const on = (e as CustomEvent<{ maximized: boolean }>).detail.maximized;
            if (on) grid.setAttribute('maximized-index', String(i));
            else grid.removeAttribute('maximized-index');
            (pane as HTMLElement & { maximized?: boolean }).maximized = on;
          });
        });
      }}
    >
      <kai-pane headline="Atlas">{body('Use the window controls to maximize.')}</kai-pane>
      <kai-pane headline="Otto">{body('Each pane restores the grid on its restore control.')}</kai-pane>
      <kai-pane headline="Nova">{body('Arbitrary N — add panes freely.')}</kai-pane>
    </kai-pane-grid>
  ),
  parameters: src(`<kai-pane-grid min-pane-width="200" style="height: 420px">
  <kai-pane headline="Atlas">Use the window controls to maximize.</kai-pane>
  <kai-pane headline="Otto">Each pane restores the grid on its restore control.</kai-pane>
  <kai-pane headline="Nova">Arbitrary N - add panes freely.</kai-pane>
</kai-pane-grid>

<script type="module">
  const grid = document.querySelector('kai-pane-grid');
  Array.from(grid.children).forEach((pane, i) => {
    pane.addEventListener('kai-maximize', (e) => {
      if (e.detail.maximized) grid.setAttribute('maximized-index', String(i));
      else grid.removeAttribute('maximized-index');
      pane.maximized = e.detail.maximized;
    });
  });
</script>`),
};
