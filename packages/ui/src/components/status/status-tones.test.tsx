import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { Status, STATUS_BG, type StatusKind } from './status';

afterEach(cleanup);

const AGENT: Record<string, string> = {
  working: 'bg-tool-blue',
  idle: 'bg-muted-foreground',
  done: 'bg-tool-green',
  error: 'bg-tool-red',
  blocked: 'bg-tool-amber',
};

describe('agent status tones', () => {
  for (const [tone, hue] of Object.entries(AGENT)) {
    it(`${tone} renders the ${hue} dot with a default accessible name`, () => {
      const { container } = render(() => <Status status={tone as StatusKind} />);
      const root = container.firstChild as HTMLElement;
      expect(root).toHaveAttribute('role', 'status');
      expect(root).toHaveAttribute('aria-label', tone[0].toUpperCase() + tone.slice(1));
      expect(root).not.toHaveAttribute('aria-hidden');
      expect(root.querySelector('.rounded-full')!.className).toContain(hue);
      expect(STATUS_BG[tone as StatusKind]).toBe(hue);
    });
    it(`${tone} lets an explicit label win`, () => {
      const { container } = render(() => <Status status={tone as StatusKind} label="Custom" />);
      expect(container.firstChild).toHaveAttribute('aria-label', 'Custom');
    });
  }
});

// Class strings captured from the tree BEFORE the tones were added.
const PRESENCE_BEFORE: Record<string, { root: string; dot: string }> = {
  new: { root: 'relative inline-flex', dot: 'relative inline-block rounded-full bg-tool-blue size-2' },
  online: { root: 'relative inline-flex', dot: 'relative inline-block rounded-full bg-tool-green size-2' },
  busy: { root: 'relative inline-flex', dot: 'relative inline-block rounded-full bg-tool-red size-2' },
  away: { root: 'relative inline-flex', dot: 'relative inline-block rounded-full bg-tool-amber size-2' },
  offline: { root: 'relative inline-flex', dot: 'relative inline-block rounded-full bg-muted-foreground size-2' },
};

describe('presence kinds are unchanged', () => {
  for (const [kind, before] of Object.entries(PRESENCE_BEFORE)) {
    it(`${kind}: same classes, still decorative without a label`, () => {
      const { container } = render(() => <Status status={kind as StatusKind} />);
      const root = container.firstChild as HTMLElement;
      expect(root.className).toBe(before.root);
      expect(root.querySelector('.rounded-full')!.className).toBe(before.dot);
      expect(root).toHaveAttribute('aria-hidden', 'true');
      expect(root).not.toHaveAttribute('aria-label');
      expect(root).not.toHaveAttribute('role');
    });
  }
});
