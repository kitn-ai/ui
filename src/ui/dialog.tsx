import { Dialog as KDialog } from '@kobalte/core/dialog';
import { type JSX } from 'solid-js';
import { cn } from '../utils/cn';

export const Dialog = KDialog;
export const DialogTrigger = KDialog.Trigger;

export function DialogContent(props: { children: JSX.Element; class?: string; title: string }) {
  return (
    <KDialog.Portal>
      <KDialog.Overlay class="fixed inset-0 z-50 bg-black/50 animate-in fade-in-0" />
      <KDialog.Content class={cn('fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-xl animate-in fade-in-0 zoom-in-95 w-full max-w-md', props.class)}>
        <KDialog.Title class="text-lg font-semibold">{props.title}</KDialog.Title>
        {props.children}
        <KDialog.CloseButton class="absolute right-4 top-4 text-muted-foreground hover:text-foreground" />
      </KDialog.Content>
    </KDialog.Portal>
  );
}
