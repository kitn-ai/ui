/**
 * Unit tests for HoverCardTrigger.
 *
 * The trigger renders as `<As as="span">` — a bare inline span. When the span
 * is dropped into a flex row (e.g. an attachment chip), an inline box doesn't
 * carry the children's block layout and the row collapses. The fix lets the
 * trigger carry layout classes itself, so callers can make it the flex row
 * instead of wrapping the content in an extra div.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { HoverCardRoot, HoverCardTrigger } from './hover-card';

afterEach(cleanup);

describe('HoverCardTrigger', () => {
  it('applies a forwarded class to the trigger element', () => {
    const { container } = render(() => (
      <HoverCardRoot>
        <HoverCardTrigger class="flex items-center gap-1.5">content</HoverCardTrigger>
      </HoverCardRoot>
    ));

    const trigger = container.querySelector('span');
    expect(trigger).toBeTruthy();
    expect(trigger!.className).toContain('flex');
    expect(trigger!.className).toContain('items-center');
  });
});
