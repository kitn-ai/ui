import { describe, it, expect } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { Message, MessageAvatar, MessageContent } from '../../src/components/message';

describe('Message', () => {
  it('renders user message', () => {
    render(() => <Message role="user"><MessageContent>Hello world</MessageContent></Message>);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('renders assistant message with avatar', () => {
    render(() => (
      <Message role="assistant">
        <MessageAvatar fallback="AI" />
        <MessageContent>I can help</MessageContent>
      </Message>
    ));
    expect(screen.getByText('AI')).toBeTruthy();
    expect(screen.getByText('I can help')).toBeTruthy();
  });

  it('renders message with flex layout', () => {
    const { container } = render(() => <Message role="user"><MessageContent>Test</MessageContent></Message>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('flex');
  });
});
