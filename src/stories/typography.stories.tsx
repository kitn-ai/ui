import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { For, createSignal, onMount } from 'solid-js';

const meta = {
  title: 'Theming/Typography',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// The semantic type scale (defined in theme.css `@theme`). Each row is a token
// that generates a Tailwind utility AND is an overridable CSS custom property.
const SCALE = [
  { token: '--text-caption', cls: 'text-caption', role: 'Micro labels, badges, sub-counts', used: 'token sub-totals · model provider · media-type subtitle' },
  { token: '--text-meta', cls: 'text-meta', role: 'Controls, toggles, switchers, captions', used: 'reasoning / chain-of-thought triggers · model switcher · context · source' },
  { token: '--text-body', cls: 'text-body', role: 'Primary reading text', used: 'messages · input · suggestions · markdown (also scales with the `proseSize` prop)' },
  { token: '--text-title', cls: 'text-title', role: 'Emphasis / headers', used: 'section emphasis' },
] as const;

function TypographyScale() {
  const [px, setPx] = createSignal<Record<string, string>>({});
  onMount(() => {
    const cs = getComputedStyle(document.documentElement);
    const toPx = (rem: string) => {
      const v = parseFloat(rem);
      return rem.includes('rem') ? `${Math.round(v * 16)}px` : rem.trim();
    };
    setPx(Object.fromEntries(SCALE.map((s) => [s.token, toPx(cs.getPropertyValue(s.token))])));
  });

  return (
    <div class="text-foreground max-w-3xl">
      <h2 class="mb-1 text-lg font-semibold">Typography scale</h2>
      <p class="text-muted-foreground mb-6 text-sm">
        Defined once in <code class="text-code-foreground">theme.css</code>. Each token generates a Tailwind utility
        (<code class="text-code-foreground">text-meta</code>, …). To restyle the kit's typography globally, override the
        namespaced <code class="text-code-foreground">--kai-text-*</code> token on <code class="text-code-foreground">:root</code> —
        it pierces the Shadow&nbsp;DOM exactly like the <code class="text-code-foreground">--kai-color-*</code> tokens. (The bare
        <code class="text-code-foreground"> --text-*</code> names stay internal, so a host's own tokens can't collide.)
      </p>

      <div class="border-border divide-border divide-y rounded-xl border">
        <For each={SCALE}>
          {(s) => (
            <div class="grid grid-cols-[170px_1fr] items-center gap-4 p-4">
              <div class="min-w-0">
                <div class="text-foreground font-mono text-xs">{s.token}</div>
                <div class="text-muted-foreground mt-1 font-mono text-[11px]">{px()[s.token] ?? '…'}</div>
                <div class="text-muted-foreground mt-2 text-xs">{s.role}</div>
              </div>
              <div class="min-w-0">
                <div class={`${s.cls} text-foreground`}>The quick brown fox jumps over the lazy dog</div>
                <div class="text-muted-foreground mt-1.5 text-[11px]">{s.used}</div>
              </div>
            </div>
          )}
        </For>
      </div>

      <h3 class="mt-8 mb-2 text-sm font-semibold">Override example</h3>
      <pre class="bg-muted text-foreground overflow-auto rounded-lg p-3 font-mono text-xs">{`:root {
  --kai-text-body: 0.9375rem;   /* bump the reading size to 15px */
  --kai-text-meta: 0.8125rem;   /* and the control size to 13px */
}`}</pre>
      <p class="text-muted-foreground mt-2 text-xs">
        Reading text in messages / input / markdown additionally scales with the
        <code class="text-code-foreground"> proseSize</code> prop (<code class="text-code-foreground">xs · sm · base · lg</code>);
        these tokens cover the fixed chrome &amp; controls.
      </p>
    </div>
  );
}

/** The kit's semantic type scale — defined in theme.css, used everywhere, overridable. */
export const Typography: Story = {
  render: () => <TypographyScale />,
};
