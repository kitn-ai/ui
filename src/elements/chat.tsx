import { createSignal, For, Show } from 'solid-js';
import { defineKitnElement } from './define';
import { ChatConfig, useChatConfig } from '../primitives/chat-config';
import { ChatContainer, ChatContainerContent, ChatContainerScrollAnchor } from '../components/chat-container';
import { Message, MessageContent, MessageActions } from '../components/message';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '../components/reasoning';
import { Tool } from '../components/tool';
import { Button } from '../ui/button';
import { DefaultPromptInput } from './default-input';
import type { ChatMessage, ChatMessageAction } from './chat-types';
import type { ProseSize } from '../primitives/chat-config';

interface Props extends Record<string, unknown> {
  messages: ChatMessage[];
  value?: string;
  placeholder?: string;
  loading?: boolean;
  suggestions?: string[];
  proseSize?: ProseSize;
  codeTheme?: string;
  codeHighlight?: boolean;
}

const ACTION_LABEL: Record<ChatMessageAction, string> = {
  copy: 'Copy', like: 'Like', dislike: 'Dislike', regenerate: 'Regenerate', edit: 'Edit',
};

defineKitnElement<Props>('kitn-chat', {
  messages: [],
  value: undefined,
  placeholder: 'Send a message...',
  loading: false,
  suggestions: undefined,
  proseSize: 'sm',
  codeTheme: 'github-dark-dimmed',
  codeHighlight: true,
}, (props, { dispatch }) => {
  // Preserve the shadow-root portal mount from the wrapper's outer ChatConfig
  // when we nest a second ChatConfig to set proseSize/codeTheme.
  const outer = useChatConfig();

  const [internal, setInternal] = createSignal(props.value ?? '');
  const current = () => props.value ?? internal();
  const handleChange = (v: string) => { setInternal(v); dispatch('valuechange', { value: v }); };
  const handleSubmit = () => dispatch('submit', { value: current() });
  const handleSuggestionClick = (v: string) => { handleChange(v); dispatch('suggestionclick', { value: v }); };

  return (
    <ChatConfig proseSize={props.proseSize} codeTheme={props.codeTheme} codeHighlight={props.codeHighlight} portalMount={outer.portalMount()}>
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
            <DefaultPromptInput
              value={current()}
              placeholder={props.placeholder}
              loading={props.loading}
              suggestions={props.suggestions}
              onValueChange={handleChange}
              onSubmit={handleSubmit}
              onSuggestionClick={handleSuggestionClick}
            />
          </div>
        </div>
      </div>
    </ChatConfig>
  );
});
