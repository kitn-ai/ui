import { For, Show } from 'solid-js';
import { PromptInput, PromptInputTextarea, PromptInputActions } from '../components/prompt-input';
import { PromptSuggestion } from '../components/prompt-suggestion';
import { SlashCommand, type SlashCommandItem } from '../components/slash-command';
import { Button } from '../ui/button';
import { Tooltip } from '../ui/tooltip';
import { Paperclip, Globe, Mic, Square } from 'lucide-solid';
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
  type AttachmentData,
} from '../components/attachments';
import { actionIcon } from '../ui/action-icons';
import type { CustomAction } from './chat-types';

export interface DefaultPromptInputProps {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  suggestions?: string[];
  /** Attachments staged in the input. Provide `onAttachmentsChange` to enable
   *  the attach button + removable previews. */
  attachments?: AttachmentData[];
  /** Show a Search (Globe) button in the left toolbar; calls `onSearch`. */
  search?: boolean;
  /** Show a Voice (Mic) button in the left toolbar; calls `onVoice`. */
  voice?: boolean;
  /** Slash commands — when set, typing `/` opens the command palette. */
  slashCommands?: SlashCommandItem[];
  /** Currently-active command ids (highlighted in the palette). */
  slashActiveIds?: string[];
  /** Single-line palette rows. */
  slashCompact?: boolean;
  onValueChange: (v: string) => void;
  onSubmit: () => void;
  onSuggestionClick: (v: string) => void;
  onAttachmentsChange?: (attachments: AttachmentData[]) => void;
  onSearch?: () => void;
  onVoice?: () => void;
  onSlashSelect?: (command: SlashCommandItem) => void;
  /** When `true` and `loading` is also `true`, the send button is replaced by
   *  a Stop button that calls `onStop`. */
  stoppable?: boolean;
  /** Called when the user clicks the Stop button. */
  onStop?: () => void;
  /** Custom toolbar action buttons declared as `<kc-action>` light-DOM children. */
  toolbarActions?: CustomAction[];
  /** Called when a custom toolbar action button is clicked, with the action id. */
  onAction?: (id: string) => void;
}

function fileToAttachment(file: File): AttachmentData {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${file.name}-${file.size}-${file.lastModified}`;
  return {
    id,
    type: 'file',
    filename: file.name,
    mediaType: file.type || undefined,
    url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
  };
}

export function DefaultPromptInput(props: DefaultPromptInputProps) {
  let fileInput: HTMLInputElement | undefined;
  const attachments = () => props.attachments ?? [];
  const canAttach = () => !!props.onAttachmentsChange;

  const addFiles = (files: FileList | null) => {
    if (!files?.length || !props.onAttachmentsChange) return;
    props.onAttachmentsChange([...attachments(), ...Array.from(files).map(fileToAttachment)]);
  };
  const removeAttachment = (id: string) =>
    props.onAttachmentsChange?.(attachments().filter((a) => a.id !== id));

  const sendDisabled = () =>
    props.disabled || props.loading || (!props.value.trim() && attachments().length === 0);

  const showStop = () => !!props.loading && !!props.stoppable;

  return (
    <>
      <Show when={props.suggestions?.length}>
        <div class="mb-2 flex flex-wrap gap-2">
          <For each={props.suggestions}>
            {(s) => (
              <PromptSuggestion onClick={() => props.onSuggestionClick(s)}>{s}</PromptSuggestion>
            )}
          </For>
        </div>
      </Show>
      <PromptInput
        value={props.value}
        onValueChange={props.onValueChange}
        onSubmit={props.onSubmit}
        isLoading={props.loading}
        disabled={props.disabled}
        class="relative"
      >
        <Show when={props.slashCommands?.length}>
          {/* Rendered inside PromptInput so SlashCommand's usePromptInput()
              context (input value + textarea ref) resolves; the `relative` root
              anchors its `absolute bottom-full` palette above the input. */}
          <SlashCommand
            commands={props.slashCommands!}
            activeIds={props.slashActiveIds}
            compact={props.slashCompact}
            onSelect={(command) => props.onSlashSelect?.(command)}
          />
        </Show>
        <Show when={canAttach() && attachments().length}>
          <div class="px-3 pt-3">
            <Attachments variant="inline">
              <For each={attachments()}>
                {(att) => (
                  <Attachment data={att} onRemove={() => removeAttachment(att.id)}>
                    <AttachmentPreview />
                    <AttachmentInfo />
                    <AttachmentRemove />
                  </Attachment>
                )}
              </For>
            </Attachments>
          </div>
        </Show>
        <PromptInputTextarea placeholder={props.placeholder} aria-label={props.placeholder || 'Message'} class="min-h-[44px] pt-3 pl-4" />
        <PromptInputActions class="mt-2 flex w-full items-center justify-between gap-2 px-3 pb-3">
          <div class="flex items-center gap-2">
            <Show when={canAttach()}>
              <input
                ref={fileInput}
                type="file"
                multiple
                class="hidden"
                onChange={(e) => {
                  addFiles(e.currentTarget.files);
                  e.currentTarget.value = ''; // allow re-picking the same file
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                class="rounded-full"
                aria-label="Attach files"
                disabled={props.disabled}
                onClick={() => fileInput?.click()}
              >
                <Paperclip class="size-4" />
              </Button>
            </Show>
            <Show when={props.search}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="rounded-full gap-1"
                aria-label="Search the web"
                disabled={props.disabled}
                onClick={() => props.onSearch?.()}
              >
                <Globe class="size-4" />
                Search
              </Button>
            </Show>
            <Show when={props.voice}>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                class="rounded-full"
                aria-label="Voice input"
                disabled={props.disabled}
                onClick={() => props.onVoice?.()}
              >
                <Mic class="size-4" />
              </Button>
            </Show>
            <For each={props.toolbarActions ?? []}>
              {(action) => {
                const Icon = actionIcon(action.icon);
                const label = action.tooltip ?? action.label;
                const btn = (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    class="rounded-full"
                    aria-label={action.label}
                    data-action={action.id}
                    disabled={props.disabled}
                    onClick={() => props.onAction?.(action.id)}
                  >
                    <Show when={Icon} fallback={<span class="px-1 text-xs">{action.label}</span>}>
                      {(I) => { const C = I(); return <C class="size-4" />; }}
                    </Show>
                  </Button>
                );
                return Icon ? <Tooltip content={label}>{btn}</Tooltip> : btn;
              }}
            </For>
          </div>
          <Show
            when={showStop()}
            fallback={
              <Button
                size="icon-sm"
                class="rounded-full"
                data-testid="send"
                aria-label="Send message"
                disabled={sendDisabled()}
                onClick={props.onSubmit}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                </svg>
              </Button>
            }
          >
            <Button
              size="icon-sm"
              variant="outline"
              class="rounded-full"
              data-testid="stop"
              aria-label="Stop"
              onClick={props.onStop}
            >
              <Square class="size-3" />
            </Button>
          </Show>
        </PromptInputActions>
      </PromptInput>
    </>
  );
}
