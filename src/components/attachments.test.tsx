/**
 * Unit tests for the Attachments SolidJS primitives.
 *
 * Covers two bugs found while dogfooding `kc-attachments` in the docs site:
 *   1. The per-item layout was not reactive to a post-render variant change —
 *      `Attachment` destructured `variant` from context, capturing it once.
 *   2. `AttachmentHoverCardTrigger` could not carry layout, so the hover trigger
 *      collapsed inline/list rows (it forwards a class now).
 */
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import {
  Attachments,
  Attachment,
  AttachmentHoverCard,
  AttachmentHoverCardTrigger,
  type AttachmentData,
  type AttachmentVariant,
} from './attachments';

afterEach(cleanup);

const fileData: AttachmentData = {
  id: '1',
  type: 'file',
  filename: 'spec.pdf',
  mediaType: 'application/pdf',
};

describe('Attachment item layout', () => {
  it('re-lays out items when the container variant changes after first render', () => {
    const [variant, setVariant] = createSignal<AttachmentVariant>('grid');
    const { container } = render(() => (
      <Attachments variant={variant()}>
        <Attachment data={fileData} />
      </Attachments>
    ));

    const item = () => container.querySelector('.group') as HTMLElement;
    expect(item().className).toMatch(/size-24/); // grid tile

    setVariant('inline');
    expect(item().className).not.toMatch(/size-24/); // no longer a grid tile
    expect(item().className).toMatch(/\bh-8\b/); // inline chip height
  });
});

describe('AttachmentHoverCardTrigger', () => {
  it('forwards a class to the underlying hover trigger so it can carry the row layout', () => {
    const { container } = render(() => (
      <AttachmentHoverCard>
        <AttachmentHoverCardTrigger class="flex items-center gap-1.5">
          <span>preview</span>
        </AttachmentHoverCardTrigger>
      </AttachmentHoverCard>
    ));

    const trigger = container.querySelector('span');
    expect(trigger).toBeTruthy();
    expect(trigger!.className).toContain('flex');
  });
});
