import { splitProps, For, Show } from 'solid-js';
import { cn } from '../utils/cn';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/dropdown';
import { Button } from '../ui/button';
import type { ModelOption } from '../types';

export interface ModelSwitcherProps { models: ModelOption[]; currentModelId: string; onModelChange: (modelId: string) => void; class?: string; }

export function ModelSwitcher(props: ModelSwitcherProps) {
  const [local] = splitProps(props, ['models', 'currentModelId', 'onModelChange', 'class']);
  const currentModel = () => local.models.find((m) => m.id === local.currentModelId);
  return (
    <Show when={local.models.length > 1}>
      <Dropdown>
        <DropdownTrigger as={(triggerProps: any) => (
          <Button variant="ghost" size="sm" class={cn('gap-1 text-meta text-muted-foreground', local.class)} {...triggerProps}>
            {currentModel()?.name ?? local.currentModelId}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </Button>
        )} />
        <DropdownContent>
          <For each={local.models}>
            {(model) => (
              <DropdownItem onSelect={() => local.onModelChange(model.id)}>
                <div class="flex flex-col">
                  <span class={cn('text-body', model.id === local.currentModelId && 'font-medium text-foreground')}>{model.name}</span>
                  <Show when={model.provider}><span class="text-caption text-muted-foreground">{model.provider}</span></Show>
                </div>
              </DropdownItem>
            )}
          </For>
        </DropdownContent>
      </Dropdown>
    </Show>
  );
}
