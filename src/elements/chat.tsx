import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from './define';
import { ChatThread, type ChatThreadProps, type ChatThreadContextUsage } from '../components/chat-thread';
import type { AttachmentData } from '../components/attachments';
import type { TriggerDef } from '../components/composer';
import type { ComposerDoc } from '../primitives/composer-model';
import type { ProseSize } from '../primitives/chat-config';
import type { ModelOption } from '../types';

type Props = Omit<ChatThreadProps,
  'class' | 'onValueChange' | 'onSubmit' | 'onSuggestionClick' | 'onModelChange'
  | 'onMessageAction' | 'onSearch' | 'onVoice'> & Record<string, unknown>;

interface Events {
  /** User submitted a message. */
  'kai-submit': { value: string; attachments: AttachmentData[] };
  /** Fired on every input change. */
  'kai-value-change': { value: string };
  /** A suggestion chip was clicked (only in `suggestion-mode="fill"`). */
  'kai-suggestion-click': { value: string };
  /** An action button on a message was clicked. `action` is the built-in name or
   *  custom id. `state` is present only for the toggleable feedback votes:
   *  `'on'` when a like/dislike is set, `'off'` when re-tapped to clear. */
  'kai-message-action': { messageId: string; action: string; state?: 'on' | 'off' };
  /** The header model switcher changed. */
  'kai-model-change': { modelId: string };
  /** The Search button was clicked. */
  'kai-search': Record<string, never>;
  /** The Mic / voice button was clicked. */
  'kai-voice': Record<string, never>;
}

defineWebComponent<Props, Events>('kai-chat', {
  messages: [], value: undefined, placeholder: 'Send a message...', loading: false,
  suggestions: undefined, suggestionMode: 'submit', persistSuggestions: false, proseSize: 'sm',
  codeTheme: 'github-dark-dimmed', codeHighlight: true, chatTitle: undefined,
  models: undefined, currentModel: undefined, context: undefined, scrollButton: true,
  search: false, voice: false, triggers: undefined, kindIcons: undefined,
  actionsReveal: 'always',
}, (props, { dispatch, flag, element }) => {
  // Detect consumer-projected seam content so each region opens only when the
  // host actually slots something into it (an empty seam stays collapsed — no
  // stray border or padding). Mirrors the <kai-model> light-DOM read pattern,
  // generalized across every seam. SPIKE: drives the slotted-shell composition.
  const SEAMS = [
    'header-start', 'header-end', 'header',
    'sidebar', 'empty', 'composer', 'composer-actions', 'footer',
  ] as const;
  const [seams, setSeams] = createSignal<Record<string, boolean>>({});
  const seam = (name: string) => seams()[name] === true;
  onMount(() => {
    const read = () => {
      const next: Record<string, boolean> = {};
      for (const name of SEAMS) next[name] = !!element.querySelector(`:scope > [slot="${name}"]`);
      setSeams(next);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true });
    onCleanup(() => observer.disconnect());
  });

  return (
  <ChatThread
    messages={props.messages} value={props.value as string | ComposerDoc | undefined} placeholder={props.placeholder as string}
    loading={flag('loading')} suggestions={props.suggestions as string[] | undefined}
    suggestionMode={props.suggestionMode as 'submit' | 'fill'} persistSuggestions={flag('persistSuggestions')}
    proseSize={props.proseSize as ProseSize}
    codeTheme={props.codeTheme as string} codeHighlight={flag('codeHighlight')}
    chatTitle={props.chatTitle as string | undefined} models={props.models as ModelOption[] | undefined}
    currentModel={props.currentModel as string | undefined} context={props.context as ChatThreadContextUsage | undefined}
    scrollButton={props.scrollButton !== false} search={flag('search')} voice={flag('voice')}
    triggers={props.triggers as TriggerDef[] | undefined}
    kindIcons={props.kindIcons as Record<string, string> | undefined}
    actionsReveal={props.actionsReveal as 'always' | 'hover'}
    onValueChange={(value) => dispatch('kai-value-change', { value })}
    onSubmit={(detail) => dispatch('kai-submit', detail)}
    onSuggestionClick={(value) => dispatch('kai-suggestion-click', { value })}
    onModelChange={(modelId) => dispatch('kai-model-change', { modelId })}
    onMessageAction={(detail) => dispatch('kai-message-action', detail)}
    onSearch={() => dispatch('kai-search', {})}
    onVoice={() => dispatch('kai-voice', {})}
    headerStart={seam('header-start')}
    headerEnd={seam('header-end')}
    headerFull={seam('header')}
    sidebar={seam('sidebar')}
    empty={seam('empty')}
    composer={seam('composer')}
    composerActions={seam('composer-actions')}
    footer={seam('footer')}
  />
  );
});
