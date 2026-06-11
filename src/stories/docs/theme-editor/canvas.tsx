import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Loader } from '../../../components/loader';
import type { JSX } from 'solid-js';

const inlineCode: JSX.CSSProperties = {
  color: 'var(--color-code-foreground)',
  background: 'color-mix(in oklab, var(--color-code-foreground) 15%, transparent)',
  padding: '.1em .35em',
  'border-radius': '4px',
  'font-family': 'ui-monospace, monospace',
};

/** Realistic chat preview + coverage rail. `mode` toggles the .dark wrapper. */
export function Canvas(props: { mode: 'light' | 'dark' }) {
  return (
    <div classList={{ dark: props.mode === 'dark' }} class="h-full">
      <div class="h-full rounded-xl border border-border bg-background text-foreground overflow-hidden flex flex-col">
        {/* Chat layout */}
        <div class="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div class="w-44 shrink-0 bg-sidebar border-r border-border p-2 space-y-1 text-xs">
            <Button size="sm" class="w-full mb-2">New chat</Button>
            <div class="px-2 py-1 font-medium text-muted-foreground">Recent</div>
            <div class="bg-muted rounded-md px-2 py-1.5">SolidJS vs React</div>
            <div class="px-2 py-1.5 text-muted-foreground hover:bg-accent rounded-md">Tailwind v4 setup</div>
            <div class="px-2 py-1.5 text-muted-foreground hover:bg-accent rounded-md">Deploy to Pages</div>
          </div>

          {/* Thread */}
          <div class="flex-1 min-w-0 flex flex-col">
            <div class="h-12 shrink-0 border-b border-border px-4 flex items-center justify-between">
              <span class="text-sm font-semibold">SolidJS reactivity</span>
              <Badge>claude-opus-4</Badge>
            </div>
            <div class="flex-1 min-h-0 overflow-auto p-4 space-y-3 bg-card text-card-foreground">
              <div class="bg-primary text-primary-foreground rounded-2xl px-3 py-2 w-fit ml-auto text-sm max-w-[80%]">
                How do signals differ from React hooks?
              </div>
              <div class="bg-muted text-foreground rounded-2xl px-3 py-2 w-fit text-sm max-w-[80%] space-y-2">
                <p>Signals are fine-grained: reading <span style={inlineCode}>count()</span> subscribes only that spot, so no re-render of the whole component.</p>
                <pre class="bg-secondary text-secondary-foreground rounded-md p-2 text-xs overflow-auto"><code>const [count, setCount] = createSignal(0);</code></pre>
              </div>
              <div class="text-muted-foreground text-xs flex items-center gap-2">
                <Loader variant="dots" size="sm" /> thinking…
              </div>
            </div>
            {/* Prompt input */}
            <div class="shrink-0 border-t border-border p-3 flex items-center gap-2">
              <input class="flex-1 bg-input border border-border rounded-md px-3 h-9 text-sm" placeholder="Message…" />
              <Button size="sm">Send</Button>
            </div>
          </div>
        </div>

        {/* Coverage rail: tokens the chat doesn't naturally hit */}
        <div class="shrink-0 border-t border-border p-3 flex flex-wrap items-center gap-2 bg-background">
          <span class="text-[11px] text-muted-foreground mr-1">Coverage:</span>
          <button class="bg-destructive text-destructive-foreground rounded-md px-3 h-8 text-xs font-medium">Delete</button>
          <button class="bg-secondary text-secondary-foreground rounded-md px-3 h-8 text-xs font-medium">Secondary</button>
          <span class="bg-accent text-accent-foreground rounded-md px-2 py-1 text-xs">Accent</span>
          <span class="bg-popover text-popover-foreground border border-border shadow rounded-md px-2 py-1 text-xs">Popover</span>
          <input class="bg-input border border-border rounded-md px-2 h-8 text-xs ring-2 ring-ring" placeholder="Focus ring" />
          <Badge>Badge</Badge>
        </div>
      </div>
    </div>
  );
}
