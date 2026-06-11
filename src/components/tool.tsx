import { type JSX, splitProps, createSignal, Show, For } from 'solid-js';
import { cn } from '../utils/cn';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { Button } from '../ui/button';
import { CheckCircle, ChevronDown, Loader2, Settings, XCircle } from 'lucide-solid';

export interface ToolPart {
  type: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  toolCallId?: string;
  errorText?: string;
}

export interface ToolProps {
  toolPart: ToolPart;
  defaultOpen?: boolean;
  class?: string;
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function ToolStateIcon(props: { state: ToolPart['state'] }) {
  return (
    <>
      <Show when={props.state === 'input-streaming'}>
        <Loader2 class="size-4 animate-spin text-blue-500" />
      </Show>
      <Show when={props.state === 'input-available'}>
        <Settings class="size-4 text-orange-500" />
      </Show>
      <Show when={props.state === 'output-available'}>
        <CheckCircle class="size-4 text-green-500" />
      </Show>
      <Show when={props.state === 'output-error'}>
        <XCircle class="size-4 text-red-500" />
      </Show>
    </>
  );
}

// Status chips: a saturated hue as text over a 15% translucent fill of the same
// hue. This reads on both light and dark surfaces (mirroring the inline-code chip),
// so it needs no `dark:` variant — which wouldn't follow a token-scoped theme anyway.
const STATE_HUE: Record<ToolPart['state'], string> = {
  'input-streaming': 'hsl(217 91% 60%)', // blue
  'input-available': 'hsl(38 92% 50%)', // amber
  'output-available': 'hsl(142 71% 45%)', // green
  'output-error': 'hsl(0 84% 60%)', // red
};

function stateChip(state: ToolPart['state']): JSX.CSSProperties {
  const hue = STATE_HUE[state];
  return { color: hue, background: `color-mix(in oklab, ${hue} 15%, transparent)` };
}

function ToolStateBadge(props: { state: ToolPart['state'] }) {
  const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
  return (
    <>
      <Show when={props.state === 'input-streaming'}>
        <span class={baseClasses} style={stateChip('input-streaming')}>
          Processing
        </span>
      </Show>
      <Show when={props.state === 'input-available'}>
        <span class={baseClasses} style={stateChip('input-available')}>
          Ready
        </span>
      </Show>
      <Show when={props.state === 'output-available'}>
        <span class={baseClasses} style={stateChip('output-available')}>
          Completed
        </span>
      </Show>
      <Show when={props.state === 'output-error'}>
        <span class={baseClasses} style={stateChip('output-error')}>
          Error
        </span>
      </Show>
    </>
  );
}

function Tool(props: ToolProps) {
  const [local, rest] = splitProps(props, ['toolPart', 'defaultOpen', 'class']);
  const [isOpen, setIsOpen] = createSignal(local.defaultOpen ?? false);

  const state = () => local.toolPart.state;
  const input = () => local.toolPart.input;
  const output = () => local.toolPart.output;

  return (
    <div class={cn('mt-3 overflow-hidden rounded-lg bg-muted/30', local.class)}>
      <Collapsible open={isOpen()} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          as={(triggerProps: JSX.HTMLAttributes<HTMLButtonElement>) => (
            <Button
              variant="ghost"
              class="h-auto w-full justify-between rounded-b-none px-3 py-2 font-normal"
              {...triggerProps}
            >
              <div class="flex items-center gap-2">
                <ToolStateIcon state={state()} />
                <span class="font-mono text-sm font-medium">{local.toolPart.type}</span>
                <ToolStateBadge state={state()} />
              </div>
              <ChevronDown class={cn('size-4 transition-transform', isOpen() && 'rotate-180')} />
            </Button>
          )}
        />
        <CollapsibleContent
          class="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden"
        >
          <div class="space-y-3 p-3">
            <Show when={input() && Object.keys(input()!).length > 0}>
              <div>
                <h4 class="text-muted-foreground mb-2 text-sm font-medium">Input</h4>
                <div class="rounded bg-muted/50 p-2 font-mono text-sm">
                  <For each={Object.entries(input()!)}>
                    {([key, value]) => (
                      <div class="mb-1">
                        <span class="text-muted-foreground">{key}:</span>{' '}
                        <span>{formatValue(value)}</span>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <Show when={output()}>
              <div>
                <h4 class="text-muted-foreground mb-2 text-sm font-medium">Output</h4>
                <div class="max-h-60 overflow-auto rounded bg-muted/50 p-2 font-mono text-sm">
                  <pre class="whitespace-pre-wrap">{formatValue(output())}</pre>
                </div>
              </div>
            </Show>

            <Show when={state() === 'output-error' && local.toolPart.errorText}>
              <div>
                <h4 class="mb-2 text-sm font-medium text-red-500">Error</h4>
                <div class="rounded bg-red-500/10 p-2 text-sm">
                  {local.toolPart.errorText}
                </div>
              </div>
            </Show>

            <Show when={state() === 'input-streaming'}>
              <div class="text-muted-foreground text-sm">Processing tool call...</div>
            </Show>

            <Show when={local.toolPart.toolCallId}>
              <div class="text-muted-foreground pt-2 text-xs">
                <span class="font-mono">Call ID: {local.toolPart.toolCallId}</span>
              </div>
            </Show>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export { Tool };
