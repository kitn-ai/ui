import { Message } from '@kitn.ai/ui/react';
import type { ChatMessage } from '@kitn.ai/ui/react';
import type { Theme } from '../App';
import { useThreadAutoScroll } from '../hooks';

interface ThreadViewProps {
  theme: Theme;
  messages: ChatMessage[];
}

/**
 * The scrolling message list: one `<Message>` element per item, mapped from state,
 * inside a centered fixed-width column. `useThreadAutoScroll` keeps the newest
 * message in view as it streams.
 */
export function ThreadView({ theme, messages }: ThreadViewProps) {
  const threadRef = useThreadAutoScroll(messages);
  return (
    <div className="thread" ref={threadRef}>
      <div className="thread-inner">
        {messages.map((m) => (
          <Message
            key={m.id}
            theme={theme}
            markdown
            // Actions live on the `message` object (the standalone <Message> reads
            // `message.actions`). Only assistant replies get them; user messages
            // render plain. `copy` is a built-in (copies to clipboard); `speak` is a
            // custom action wired to the browser's speech synthesis below.
            message={
              m.role === 'assistant'
                ? { id: m.id, role: m.role, content: m.content, actions: ['copy', { id: 'speak', label: 'Read aloud', icon: 'volume-2' }] }
                : { id: m.id, role: m.role, content: m.content }
            }
            onMessageAction={(e) => {
              if (e.detail.action === 'speak') {
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(new SpeechSynthesisUtterance(m.content));
              }
              // 'copy' is handled internally by the element (copies to clipboard).
            }}
          />
        ))}
      </div>
    </div>
  );
}
