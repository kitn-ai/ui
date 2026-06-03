import { DropdownMenu as KDropdown } from '@kobalte/core/dropdown-menu';
import { type JSX, splitProps } from 'solid-js';
import { cn } from '../utils/cn';

export const Dropdown = KDropdown;
export const DropdownTrigger = KDropdown.Trigger;

export function DropdownContent(props: { children: JSX.Element; class?: string }) {
  return (
    <KDropdown.Portal>
      <KDropdown.Content class={cn('z-50 min-w-[8rem] rounded-lg bg-card p-1 shadow-lg animate-in fade-in-0 zoom-in-95', props.class)}>
        {props.children}
      </KDropdown.Content>
    </KDropdown.Portal>
  );
}

export function DropdownItem(props: { children: JSX.Element; class?: string; onSelect?: () => void; }) {
  return (
    <KDropdown.Item class={cn('flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted transition-colors', props.class)} onSelect={props.onSelect}>
      {props.children}
    </KDropdown.Item>
  );
}
