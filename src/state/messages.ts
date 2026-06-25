import type { ChatMessage } from '../elements/chat-types';

/** Append a message; returns a new array. */
export function appendMessage(messages: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  return [...messages, msg];
}

/** Replace a same-id message, or append when absent. */
export function upsertMessage(messages: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  const i = messages.findIndex((x) => x.id === msg.id);
  if (i === -1) return [...messages, msg];
  const next = messages.slice();
  next[i] = msg;
  return next;
}

/** Patch the matched message (object patch or updater). Untouched items keep their reference. */
export function updateMessage(
  messages: ChatMessage[],
  id: string,
  patch: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage),
): ChatMessage[] {
  return messages.map((x) =>
    x.id === id ? (typeof patch === 'function' ? patch(x) : { ...x, ...patch }) : x,
  );
}

/** Remove the matched message. */
export function removeMessage(messages: ChatMessage[], id: string): ChatMessage[] {
  return messages.filter((x) => x.id !== id);
}

/** Streaming primitive: concatenate `delta` onto the matched message's content. */
export function appendContent(messages: ChatMessage[], id: string, delta: string): ChatMessage[] {
  return messages.map((x) => (x.id === id ? { ...x, content: x.content + delta } : x));
}
