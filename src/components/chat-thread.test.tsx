import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { ChatThread } from './chat-thread';

// jsdom doesn't implement Element.scrollTo; the auto-scroll container calls it.
if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};

afterEach(cleanup);

describe('ChatThread header composition', () => {
  it('hides the header with no title, models, context, or header slot', () => {
    const { container } = render(() => <ChatThread messages={[]} />);
    expect(container.querySelector('header')).toBeNull();
  });

  it('shows the header when only header-start content is present', () => {
    const { container } = render(() => <ChatThread messages={[]} headerStart />);
    expect(container.querySelector('header')).toBeTruthy();
  });

  it('renders header-start and header-end slots inside the header', () => {
    const { container } = render(() => <ChatThread messages={[]} headerStart headerEnd />);
    expect(container.querySelector('header slot[name="header-start"]')).toBeTruthy();
    expect(container.querySelector('header slot[name="header-end"]')).toBeTruthy();
  });

  it('still shows the header for a chat title (back-compat)', () => {
    const { container, getByText } = render(() => <ChatThread messages={[]} chatTitle="Assistant" />);
    expect(container.querySelector('header')).toBeTruthy();
    expect(getByText('Assistant')).toBeInTheDocument();
  });
});
