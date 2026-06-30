import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { Status, STATUS_BG } from './status';

afterEach(cleanup);

describe('STATUS_BG mapping', () => {
  it('maps new to the blue tool hue (the default)', () => {
    expect(STATUS_BG.new).toBe('bg-tool-blue');
  });
  it('maps the presence states to their hues', () => {
    expect(STATUS_BG.online).toBe('bg-tool-green');
    expect(STATUS_BG.busy).toBe('bg-tool-red');
    expect(STATUS_BG.away).toBe('bg-tool-amber');
    expect(STATUS_BG.offline).toBe('bg-muted-foreground');
  });
});

describe('Status', () => {
  it('renders a pulsing ring when pulse is set', () => {
    const { container } = render(() => <Status pulse status="new" />);
    expect(container.querySelector('.animate-ping')).toBeInTheDocument();
  });
  it('omits the ring when pulse is unset', () => {
    const { container } = render(() => <Status status="new" />);
    expect(container.querySelector('.animate-ping')).toBeNull();
  });
  it('is decorative (aria-hidden) without a label', () => {
    const { container } = render(() => <Status status="online" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
  it('exposes a status role + accessible name when given a label', () => {
    const { container } = render(() => <Status status="online" label="Online" />);
    expect(container.firstChild).toHaveAttribute('role', 'status');
    expect(container.firstChild).toHaveAttribute('aria-label', 'Online');
  });
});
