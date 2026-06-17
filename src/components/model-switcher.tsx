import { splitProps, For, Show, createSignal } from 'solid-js';
import { cn } from '../utils/cn';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/dropdown';
import { Button } from '../ui/button';
import type { ModelOption } from '../types';

export interface ModelSwitcherProps { models: ModelOption[]; currentModelId: string; onModelChange: (modelId: string) => void; class?: string; }

const Chevron = (props: { class?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class={props.class}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function ModelRow(props: { model: ModelOption; currentModelId: string; onModelChange: (id: string) => void }) {
  const subtitle = () => props.model.description ?? props.model.provider;
  return (
    <DropdownItem onSelect={() => props.onModelChange(props.model.id)}>
      <div class="flex flex-col">
        <span class={cn('text-body', props.model.id === props.currentModelId && 'font-medium text-foreground')}>{props.model.name}</span>
        <Show when={subtitle()}><span class="text-caption text-muted-foreground">{subtitle()}</span></Show>
      </div>
    </DropdownItem>
  );
}

export function ModelSwitcher(props: ModelSwitcherProps) {
  const [local] = splitProps(props, ['models', 'currentModelId', 'onModelChange', 'class']);
  const currentModel = () => local.models.find((m) => m.id === local.currentModelId);

  // Ungrouped models list first; grouped models collect under their group name,
  // preserving first-seen group order.
  const ungrouped = () => local.models.filter((m) => !m.group);
  const groups = () => {
    const order: string[] = [];
    const byGroup = new Map<string, ModelOption[]>();
    for (const m of local.models) {
      if (!m.group) continue;
      if (!byGroup.has(m.group)) { byGroup.set(m.group, []); order.push(m.group); }
      byGroup.get(m.group)!.push(m);
    }
    return order.map((name) => ({ name, models: byGroup.get(name)! }));
  };

  return (
    <Show when={local.models.length > 1}>
      <Dropdown>
        <DropdownTrigger as={(triggerProps: any) => (
          <Button variant="ghost" size="sm" class={cn('gap-1 text-meta text-muted-foreground', local.class)} {...triggerProps}>
            {currentModel()?.name ?? local.currentModelId}
            <Chevron />
          </Button>
        )} />
        <DropdownContent>
          <For each={ungrouped()}>
            {(model) => <ModelRow model={model} currentModelId={local.currentModelId} onModelChange={local.onModelChange} />}
          </For>
          <For each={groups()}>
            {(group) => {
              const [open, setOpen] = createSignal(false);
              return (
                <div>
                  <button
                    type="button"
                    aria-expanded={open()}
                    onClick={() => setOpen(!open())}
                    class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-body outline-none transition-colors hover:bg-muted focus:bg-muted"
                  >
                    {group.name}
                    <Chevron class={cn('transition-transform', open() && 'rotate-180')} />
                  </button>
                  <Show when={open()}>
                    <div class="pl-2">
                      <For each={group.models}>
                        {(model) => <ModelRow model={model} currentModelId={local.currentModelId} onModelChange={local.onModelChange} />}
                      </For>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </DropdownContent>
      </Dropdown>
    </Show>
  );
}
