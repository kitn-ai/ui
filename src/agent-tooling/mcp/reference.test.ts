import { describe, it, expect } from 'vitest';
import { reference } from './tools/reference';

describe('component_reference', () => {
  it('returns kai-chat props + events', async () => {
    const out = await reference.handler({ name: 'kai-chat' });
    const text = out.content[0].text;
    expect(text).toMatch(/messages/);
    expect(text).toMatch(/kai-submit/);
    expect(text).toMatch(/set in JavaScript|property/i); // the contract note
  });

  it('lists all element tagNames when name is omitted', async () => {
    const out = await reference.handler({});
    const text = out.content[0].text;
    expect(text).toMatch(/kai-chat/);
    expect(text).toMatch(/kai-artifact/);
    expect(text).toMatch(/kai-prompt-input/);
  });

  it('lists all element tagNames when name is "list"', async () => {
    const out = await reference.handler({ name: 'list' });
    const text = out.content[0].text;
    expect(text).toMatch(/kai-chat/);
    expect(text).toMatch(/kai-artifact/);
  });

  it('returns helpful fallback for unknown tag', async () => {
    const out = await reference.handler({ name: 'kai-nonexistent' });
    const text = out.content[0].text;
    expect(text).toMatch(/unknown/i);
    expect(text).toMatch(/kai-/); // names a valid tag
  });
});
