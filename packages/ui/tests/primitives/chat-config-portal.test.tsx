import { render } from '@solidjs/testing-library';
import { ChatConfig, useChatConfig } from '../../src/primitives/chat-config';

function Probe(props: { onValue: (v: HTMLElement | undefined) => void }) {
  const cfg = useChatConfig();
  props.onValue(cfg.portalMount?.());
  return null;
}

test('portalMount defaults to undefined', () => {
  let seen: HTMLElement | undefined | symbol = Symbol('unset');
  render(() => <Probe onValue={(v) => (seen = v)} />);
  expect(seen).toBeUndefined();
});

test('ChatConfig exposes the provided portalMount node', () => {
  const node = document.createElement('div');
  let seen: HTMLElement | undefined | symbol = Symbol('unset');
  render(() => (
    <ChatConfig portalMount={node}>
      <Probe onValue={(v) => (seen = v)} />
    </ChatConfig>
  ));
  expect(seen).toBe(node);
});
