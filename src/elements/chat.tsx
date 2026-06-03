import { createSignal, For, Show } from 'solid-js';
import { defineKitnElement } from './define';
import { ChatConfig, useChatConfig } from '../primitives/chat-config';
import { ChatContainer, ChatContainerContent, ChatContainerScrollAnchor } from '../components/chat-container';
import { Message, MessageContent, MessageActions } from '../components/message';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '../components/reasoning';
import { Tool } from '../components/tool';
import { Button } from '../ui/button';
import { PromptInput, PromptInputTextarea, PromptInputActions } from '../components/prompt-input';
import type { ChatMessage, ChatMessageAction } from './chat-types';
import type { ProseSize } from '../primitives/chat-config';

interface Props extends Record<string, unknown> {
  messages: ChatMessage[];
  value?: string;
  placeholder?: string;
  loading?: boolean;
  proseSize?: ProseSize;
  codeTheme?: string;
}

const ACTION_LABEL: Record<ChatMessageAction, string> = {
  copy: 'Copy', like: 'Like', dislike: 'Dislike', regenerate: 'Regenerate', edit: 'Edit',
};

defineKitnElement<Props>('kitn-chat', {
  messages: [],
  value: undefined,
  placeholder: 'Send a message...',
  loading: false,
  proseSize: 'sm',
  codeTheme: 'github-dark-dimmed',
}, (props, { dispatch }) => {
  // Preserve the shadow-root portal mount from the wrapper's outer ChatConfig
  // when we nest a second ChatConfig to set proseSize/codeTheme.
  const outer = useChatConfig();

  const [internal, setInternal] = createSignal(props.value ?? '');
  const current = () => props.value ?? internal();
  const handleChange = (v: string) => { setInternal(v); dispatch('valuechange', { value: v }); };
  const handleSubmit = () => dispatch('submit', { value: current() });

  return (
    <ChatConfig proseSize={props.proseSize} codeTheme={props.codeTheme} portalMount={outer.portalMount()}>
      <div class="flex h-full flex-col bg-background">
        <ChatContainer class="flex-1 px-4 py-3">
          <ChatContainerContent class="mx-auto w-full max-w-3xl space-y-4">
            <For each={props.messages}>
              {(m) => (
                <Message class={m.role === 'user' ? 'flex-col items-end' : 'flex-col items-start'}>
                  <Show when={m.reasoning}>
                    <Reasoning class="mb-2 w-full">
                      <ReasoningTrigger>{m.reasoning!.label ?? 'Reasoning'}</ReasoningTrigger>
                      <ReasoningContent markdown>{m.reasoning!.text}</ReasoningContent>
                    </Reasoning>
                  </Show>
                  <For each={m.tools ?? []}>
                    {(tp) => <Tool toolPart={tp} class="mb-2 w-full" />}
                  </For>
                  <MessageContent
                    markdown={m.role === 'assistant'}
                    class={m.role === 'user'
                      ? 'bg-muted text-primary max-w-[85%] rounded-2xl px-4 py-2'
                      : 'bg-transparent p-0'}
                  >
                    {m.content}
                  </MessageContent>
                  <Show when={m.actions?.length}>
                    <MessageActions class="mt-1 flex gap-0">
                      <For each={m.actions!}>
                        {(a) => (
                          <Button
                            variant="ghost" size="icon-sm" class="rounded-full"
                            data-action={a}
                            aria-label={ACTION_LABEL[a]}
                            onClick={() => dispatch('messageaction', { messageId: m.id, action: a })}
                          >
                            <span class="text-xs">{ACTION_LABEL[a][0]}</span>
                          </Button>
                        )}
                      </For>
                    </MessageActions>
                  </Show>
                </Message>
              )}
            </For>
            <ChatContainerScrollAnchor />
          </ChatContainerContent>
        </ChatContainer>
        <div class="shrink-0 px-4 pb-4">
          <div class="mx-auto max-w-3xl">
            <PromptInput value={current()} onValueChange={handleChange} onSubmit={handleSubmit} isLoading={props.loading}>
              <PromptInputTextarea placeholder={props.placeholder} class="min-h-[44px] pt-3 pl-4" />
              <PromptInputActions class="mt-2 flex w-full items-center justify-end gap-2 px-3 pb-3">
                <Button size="icon-sm" class="rounded-full" disabled={!current().trim()} onClick={handleSubmit}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                  </svg>
                </Button>
              </PromptInputActions>
            </PromptInput>
          </div>
        </div>
      </div>
    </ChatConfig>
  );
});
