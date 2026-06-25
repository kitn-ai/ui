// src/state/stream.test.ts
import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '../elements/chat-types';
import { createAssistantStream, onStreamSettled } from './stream';

/** A fake setter that records each emitted array + applies it. */
function makeSink(initial: ChatMessage[] = []) {
  let current = initial;
  const emissions: ChatMessage[][] = [];
  const set = (updater: (p: ChatMessage[]) => ChatMessage[]) => {
    current = updater(current);
    emissions.push(current);
  };
  return { set, get: () => current, emissions };
}

describe('createAssistantStream', () => {
  it('appends an empty assistant message on construction', () => {
    const sink = makeSink();
    const s = createAssistantStream(sink.set, { id: 'a1' });
    expect(s.id).toBe('a1');
    expect(sink.get()).toEqual([{ id: 'a1', role: 'assistant', content: '' }]);
  });

  it('appendText accretes content, emitting a new array + new object each time', () => {
    const sink = makeSink();
    const s = createAssistantStream(sink.set, { id: 'a1' });
    s.appendText('He').appendText('llo');
    expect(sink.get()[0].content).toBe('Hello');
    // every emission is a distinct array reference
    expect(new Set(sink.emissions).size).toBe(sink.emissions.length);
  });

  it('appendReasoning builds the { text, label } shape', () => {
    const sink = makeSink();
    const s = createAssistantStream(sink.set, { id: 'a1' });
    s.appendReasoning('thinking', 'Reasoning');
    expect(sink.get()[0].reasoning).toEqual({ text: 'thinking', label: 'Reasoning' });
  });

  it('upsertTool adds then replaces by toolCallId; updateTool patches', () => {
    const sink = makeSink();
    const s = createAssistantStream(sink.set, { id: 'a1' });
    s.upsertTool({ type: 'search', state: 'input-streaming', toolCallId: 't1', input: { q: 'x' } });
    s.upsertTool({ type: 'search', state: 'input-available', toolCallId: 't1', input: { q: 'xy' } });
    expect(sink.get()[0].tools).toHaveLength(1);
    expect(sink.get()[0].tools![0].state).toBe('input-available');
    s.updateTool('t1', { state: 'output-available', output: { hits: 3 } });
    expect(sink.get()[0].tools![0].output).toEqual({ hits: 3 });
  });

  it('done applies a final patch; abort() drops the in-flight message', () => {
    const sink = makeSink([{ id: 'u1', role: 'user', content: 'hi' }]);
    const s = createAssistantStream(sink.set, { id: 'a1' });
    s.appendText('partial').done({ content: 'final' });
    expect(sink.get()[1].content).toBe('final');
    const s2 = createAssistantStream(sink.set, { id: 'a2' });
    s2.appendText('oops').abort();
    expect(sink.get().map((x) => x.id)).toEqual(['u1', 'a1']);
  });

  it('abort(reason) marks the message tools output-error instead of dropping', () => {
    const sink = makeSink();
    const s = createAssistantStream(sink.set, { id: 'a1' });
    s.upsertTool({ type: 'search', state: 'input-streaming', toolCallId: 't1' });
    s.abort('network down');
    expect(sink.get()[0].tools![0].state).toBe('output-error');
    expect(sink.get()[0].tools![0].errorText).toBe('network down');
  });

  it('onStreamSettled fires onSettle on done and on abort, preserving chaining', () => {
    const sink = makeSink();
    let settled = 0;
    const s = onStreamSettled(createAssistantStream(sink.set, { id: 'a1' }), () => { settled++; });
    s.appendText('x').appendText('y');
    expect(sink.get()[0].content).toBe('xy');
    s.done();
    expect(settled).toBe(1);
    let settledOnAbort = 0;
    const s2 = onStreamSettled(createAssistantStream(sink.set, { id: 'a2' }), () => { settledOnAbort++; });
    s2.appendText('x').abort('boom');
    expect(settledOnAbort).toBe(1);
  });
});
