import { ChatScene } from '../../chat-scene';

/** Live preview: the real chat app scene + a small rail for tokens the chat
 *  doesn't naturally surface. `mode` toggles the .dark wrapper so descendants
 *  resolve dark token values. */
export function Canvas(props: { mode: 'light' | 'dark' }) {
  return (
    <div classList={{ dark: props.mode === 'dark' }} class="h-full">
      <div class="h-full flex flex-col rounded-xl border border-border overflow-hidden bg-background">
        {/* The real product UI — same component the Full Chat App example uses */}
        <div class="flex-1 min-h-0">
          <ChatScene class="h-full" />
        </div>

        {/* Coverage rail: tokens the chat scene doesn't surface at rest */}
        <div class="shrink-0 border-t border-border px-4 py-2.5 flex flex-wrap items-center gap-2 bg-background text-foreground">
          <span class="text-[11px] text-muted-foreground mr-1">Other tokens:</span>
          <button class="bg-destructive text-destructive-foreground rounded-md px-3 h-8 text-xs font-medium">Destructive</button>
          <button class="bg-secondary text-secondary-foreground rounded-md px-3 h-8 text-xs font-medium">Secondary</button>
          <span class="bg-accent text-accent-foreground rounded-md px-2.5 py-1.5 text-xs">Accent</span>
          <span class="bg-popover text-popover-foreground border border-border shadow rounded-md px-2.5 py-1.5 text-xs">Popover</span>
          <input class="bg-input border border-border rounded-md px-2 h-8 text-xs ring-2 ring-ring" placeholder="Focus ring" />
        </div>
      </div>
    </div>
  );
}
