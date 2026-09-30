import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { TagRenderer } from './tag-renderer';

class ProbeEl extends HTMLElement { part2?: unknown }
customElements.define('probe-el', ProbeEl);

describe('TagRenderer', () => {
  it('creates the tag once and assigns data as a PROPERTY, re-assigning on change', async () => {
    const [data, setData] = createSignal({ n: 1 });
    const { container } = render(() => <TagRenderer tag="probe-el" data={data()} prop="part" fallback={<span>fb</span>} />);
    const el = container.querySelector('probe-el') as HTMLElement & { part: unknown };
    expect(el.part).toEqual({ n: 1 });
    expect(el.hasAttribute('part')).toBe(false);
    setData({ n: 2 });
    expect(container.querySelector('probe-el')).toBe(el);
    expect(el.part).toEqual({ n: 2 });
  });
  it('renders the fallback and warns ONCE for an invalid tag', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(() => (<>
      <TagRenderer tag="notvalid" data={1} prop="part" fallback={<span>fb</span>} />
      <TagRenderer tag="notvalid" data={2} prop="part" fallback={<span>fb</span>} />
    </>));
    expect(container.textContent).toBe('fbfb');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
  it('renders the fallback and warns once when a valid tag is never defined within 2s', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(() => <TagRenderer tag="never-defined-el" data={1} prop="part" fallback={<span>fb</span>} />);
    await vi.advanceTimersByTimeAsync(2100);
    expect(container.textContent).toContain('fb');
    expect(warn).toHaveBeenCalledTimes(1);
    vi.useRealTimers(); warn.mockRestore();
  });
});
