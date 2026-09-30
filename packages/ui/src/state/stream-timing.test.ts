// Timing stamping: `createAssistantStream` reads an injectable clock and the pure folds only merge
// the field. Every clock here is a fake, so no assertion depends on real time.
import { describe, it, expect } from 'vitest';
import type { ChatMessage, MessagePart } from '../web-components/chat/chat-types';
import { createAssistantStream } from './stream';
import { appendReasoningPart, upsertToolPart } from './parts';

function rig() {
  let current: ChatMessage[] = [];
  let t = 0;
  const set = (u: (p: ChatMessage[]) => ChatMessage[]) => { current = u(current); };
  const stream = createAssistantStream(set, { id: 'a1', now: () => t });
  return {
    stream,
    at: (ms: number) => { t = ms; },
    parts: () => current[0].parts,
    message: () => current[0],
    get: () => current,
  };
}
const timingOf = (p: MessagePart | undefined) =>
  p && (p.type === 'reasoning' ? p.timing : p.type === 'tool' ? p.tool.timing : undefined);

describe('createAssistantStream timing', () => {
  it('does not leak the clock option into the message', () => {
    const r = rig();
    expect(Object.keys(r.message()).sort()).toEqual(['id', 'parts', 'role']);
  });

  it('stamps a reasoning part on its FIRST delta and keeps startedAt across later ones', () => {
    const r = rig();
    r.at(0); r.stream.appendReasoning('a');
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 0 });
    r.at(3); r.stream.appendReasoning('b');
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 0 });
  });

  it('ends reasoning when text starts', () => {
    const r = rig();
    r.at(0); r.stream.appendReasoning('thinking');
    r.at(5); r.stream.appendText('answer');
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 0, endedAt: 5 });
    r.at(9); r.stream.appendText(' more');
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 0, endedAt: 5 });
  });

  it('ends reasoning when a tool, a card, a source or a file opens after it', () => {
    const opens: Array<(s: ReturnType<typeof rig>['stream']) => void> = [
      (s) => s.upsertTool('t', { type: 'web_search', state: 'input-available' }),
      (s) => s.addCard({ type: 'confirm', id: 'c', data: {} }),
      (s) => s.addSource({ url: 'https://a' }),
      (s) => s.addFile({ id: 'f', type: 'file', name: 'x.txt' } as never),
    ];
    for (const open of opens) {
      const r = rig();
      r.at(1); r.stream.appendReasoning('x');
      r.at(4); open(r.stream);
      expect(timingOf(r.parts()[0]), String(open)).toEqual({ startedAt: 1, endedAt: 4 });
    }
  });

  it('ends a reasoning block when the next reasoning block opens, not on its own deltas', () => {
    const r = rig();
    r.at(0); r.stream.appendReasoning('a', { index: 0 });
    r.at(2); r.stream.appendReasoning('a2', { index: 0 });
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 0 });
    r.at(6); r.stream.appendReasoning('b', { index: 1 });
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 0, endedAt: 6 });
    expect(timingOf(r.parts()[1])).toEqual({ startedAt: 6 });
  });

  it('stamps a tool at its first announce and ends it when upsertTool settles it', () => {
    const r = rig();
    r.at(10); r.stream.upsertTool('t1', { type: 'web_search', state: 'input-streaming', rawInput: '{"q' });
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 10 });
    r.at(12); r.stream.upsertTool('t1', { state: 'input-available', input: { q: 'x' } });
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 10 });
    r.at(20); r.stream.upsertTool('t1', { state: 'output-available', output: { hits: 1 } });
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 10, endedAt: 20 });
    r.at(30); r.stream.upsertTool('t1', { output: { hits: 2 } });
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 10, endedAt: 20 });
  });

  it('ends a tool on output-error as well', () => {
    const r = rig();
    r.at(1); r.stream.upsertTool('t1', { type: 'read_file', state: 'input-available' });
    r.at(2); r.stream.upsertTool('t1', { state: 'output-error', errorText: 'ENOENT' });
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 1, endedAt: 2 });
  });

  it('a tool that arrives already settled gets startedAt and endedAt together', () => {
    const r = rig();
    r.at(7); r.stream.upsertTool('t1', { type: 'x', state: 'output-available', output: {} });
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 7, endedAt: 7 });
  });

  it('parallel tools time independently', () => {
    const r = rig();
    r.at(0); r.stream.upsertTool('a', { type: 'web_search', state: 'input-available' });
    r.at(1); r.stream.upsertTool('b', { type: 'read_file', state: 'input-available' });
    r.at(5); r.stream.upsertTool('b', { state: 'output-available', output: {} });
    r.at(9); r.stream.upsertTool('a', { state: 'output-available', output: {} });
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 0, endedAt: 9 });
    expect(timingOf(r.parts()[1])).toEqual({ startedAt: 1, endedAt: 5 });
  });

  it('an unsettled tool stays open while text streams after it', () => {
    const r = rig();
    r.at(0); r.stream.upsertTool('a', { type: 'web_search', state: 'input-available' });
    r.at(3); r.stream.appendText('waiting');
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 0 });
  });

  it('done() ends every open reasoning part and tool at the stream end', () => {
    const r = rig();
    r.at(0); r.stream.appendReasoning('x');
    r.at(1); r.stream.upsertTool('a', { type: 'web_search', state: 'input-available' });
    r.at(8); r.stream.done();
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 0, endedAt: 1 });
    expect(timingOf(r.parts()[1])).toEqual({ startedAt: 1, endedAt: 8 });
  });

  it('done() on a turn with nothing open emits nothing', () => {
    const r = rig();
    r.stream.appendText('hi');
    const before = r.get();
    r.stream.done();
    expect(r.get()).toBe(before);
  });

  it('abort() ends the timing of the tools it fails and of open reasoning', () => {
    const r = rig();
    r.at(0); r.stream.appendReasoning('x');
    r.at(2); r.stream.upsertTool('a', { type: 'web_search', state: 'input-available' });
    r.at(6); r.stream.abort('Connection lost.');
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 0, endedAt: 2 });
    expect(timingOf(r.parts()[1])).toEqual({ startedAt: 2, endedAt: 6 });
  });

  it('a consumer-supplied timing is respected', () => {
    const r = rig();
    r.at(50);
    r.stream.upsertTool('a', { type: 'x', state: 'output-available', timing: { startedAt: 1, endedAt: 2 } });
    r.stream.appendReasoning('r', { timing: { startedAt: 3, endedAt: 4 } });
    expect(timingOf(r.parts()[0])).toEqual({ startedAt: 1, endedAt: 2 });
    expect(timingOf(r.parts()[1])).toEqual({ startedAt: 3, endedAt: 4 });
  });

  it('defaults the clock to Date.now', () => {
    let current: ChatMessage[] = [];
    const s = createAssistantStream((u) => { current = u(current); });
    const before = Date.now();
    s.appendReasoning('x');
    const p = current[0].parts[0];
    const started = p.type === 'reasoning' ? p.timing?.startedAt : undefined;
    expect(started).toBeGreaterThanOrEqual(before);
    expect(started).toBeLessThanOrEqual(Date.now());
  });
});

describe('pure folds and timing', () => {
  it('appendReasoningPart carries timing forward and only sets it when given', () => {
    const a = appendReasoningPart([], 'a', { timing: { startedAt: 1 } });
    const b = appendReasoningPart(a, 'b');
    expect(timingOf(b[0])).toEqual({ startedAt: 1 });
    const c = appendReasoningPart(b, '', { timing: { startedAt: 1, endedAt: 4 } });
    expect(timingOf(c[0])).toEqual({ startedAt: 1, endedAt: 4 });
  });

  it('a change to ONLY timing yields a new array and a new part (the reactivity rule), and an equal one keeps the reference', () => {
    const a = upsertToolPart([], 't', { type: 'x', state: 'input-available', timing: { startedAt: 1 } });
    const same = upsertToolPart(a, 't', { timing: { startedAt: 1 } });
    expect(same).toBe(a);
    const ended = upsertToolPart(a, 't', { timing: { startedAt: 1, endedAt: 2 } });
    expect(ended).not.toBe(a);
    expect(ended[0]).not.toBe(a[0]);
    const r1 = appendReasoningPart([], 'a', { timing: { startedAt: 1 } });
    const r2 = appendReasoningPart(r1, '', { timing: { startedAt: 1, endedAt: 3 } });
    expect(r2).not.toBe(r1);
    expect(r2[0]).not.toBe(r1[0]);
  });

  it('parts with no timing (saved threads) flow through the folds untouched', () => {
    const saved: MessagePart[] = [{ type: 'reasoning', text: 'old', index: 0 }, { type: 'tool', tool: { type: 'x', kind: 'generic', state: 'output-available', toolCallId: 't', output: {} } }];
    const next = upsertToolPart(saved, 't', { output: {} });
    expect(next).toBe(saved);
    expect(timingOf(next[0])).toBeUndefined();
    expect(timingOf(next[1])).toBeUndefined();
  });
});
