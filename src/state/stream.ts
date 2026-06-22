// src/state/stream.ts
import type { ChatMessage } from '../elements/chat-types';
import type { ToolPart } from '../components/tool';

/** The one universal contract: a functional-updater setter (React setState shape). */
export type SetMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;

/** A fluent builder for one in-flight assistant message. Owns no state. */
export interface AssistantStream {
  readonly id: string;
  appendText(delta: string): AssistantStream;
  setText(content: string): AssistantStream;
  appendReasoning(delta: string, label?: string): AssistantStream;
  setReasoning(text: string, label?: string): AssistantStream;
  upsertTool(tool: ToolPart): AssistantStream;
  updateTool(toolCallId: string, patch: Partial<ToolPart>): AssistantStream;
  patch(patch: Partial<ChatMessage>): AssistantStream;
  done(final?: Partial<ChatMessage>): void;
  abort(reason?: string): void;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'kai-' + Math.random().toString(36).slice(2);
}

/** Start an assistant message and drive it through `set`. New refs on every mutation. */
export function createAssistantStream(set: SetMessages, init: Partial<ChatMessage> = {}): AssistantStream {
  const id = init.id ?? newId();
  const seed: ChatMessage = { id, role: 'assistant', content: '', ...init };
  set((prev) => [...prev, seed]);

  const mutate = (fn: (m: ChatMessage) => ChatMessage) =>
    set((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));

  const stream: AssistantStream = {
    id,
    appendText(delta) { mutate((m) => ({ ...m, content: m.content + delta })); return stream; },
    setText(content) { mutate((m) => ({ ...m, content })); return stream; },
    appendReasoning(delta, label) {
      mutate((m) => ({ ...m, reasoning: { text: (m.reasoning?.text ?? '') + delta, label: label ?? m.reasoning?.label } }));
      return stream;
    },
    setReasoning(text, label) {
      mutate((m) => ({ ...m, reasoning: { text, label: label ?? m.reasoning?.label } }));
      return stream;
    },
    upsertTool(tool) {
      mutate((m) => {
        const tools = m.tools ? m.tools.slice() : [];
        const i = tool.toolCallId != null
          ? tools.findIndex((t) => t.toolCallId === tool.toolCallId)
          : tools.findIndex((t) => t.type === tool.type);
        if (i === -1) tools.push(tool); else tools[i] = tool;
        return { ...m, tools };
      });
      return stream;
    },
    updateTool(toolCallId, patch) {
      mutate((m) => ({ ...m, tools: (m.tools ?? []).map((t) => (t.toolCallId === toolCallId ? { ...t, ...patch } : t)) }));
      return stream;
    },
    patch(patch) { mutate((m) => ({ ...m, ...patch })); return stream; },
    done(final) { if (final) mutate((m) => ({ ...m, ...final })); },
    abort(reason) {
      if (reason) {
        mutate((m) => ({ ...m, tools: (m.tools ?? []).map((t) => ({ ...t, state: 'output-error' as const, errorText: reason })) }));
      } else {
        set((prev) => prev.filter((m) => m.id !== id));
      }
    },
  };
  return stream;
}

/** Wrap a stream so `onSettle` fires on done/abort (used to toggle a `loading` flag).
 *  Preserves the fluent chain by returning the wrapper from every mutator. */
export function onStreamSettled(inner: AssistantStream, onSettle: () => void): AssistantStream {
  const wrapper: AssistantStream = {
    id: inner.id,
    appendText(d) { inner.appendText(d); return wrapper; },
    setText(c) { inner.setText(c); return wrapper; },
    appendReasoning(d, l) { inner.appendReasoning(d, l); return wrapper; },
    setReasoning(t, l) { inner.setReasoning(t, l); return wrapper; },
    upsertTool(t) { inner.upsertTool(t); return wrapper; },
    updateTool(id, p) { inner.updateTool(id, p); return wrapper; },
    patch(p) { inner.patch(p); return wrapper; },
    done(final) { inner.done(final); onSettle(); },
    abort(reason) { inner.abort(reason); onSettle(); },
  };
  return wrapper;
}
