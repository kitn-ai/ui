import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { ProgressBar } from './progress-bar';

afterEach(cleanup);

const track = (c: HTMLElement) => c.querySelector('[part="track"]') as HTMLElement;
const fill = (c: HTMLElement) => c.querySelector('[part="fill"]') as HTMLElement;

describe('ProgressBar', () => {
  it('renders the fill width from value/max', () => {
    const { container } = render(() => <ProgressBar value={33} max={66} />);
    expect(fill(container).style.width).toBe('50%');
  });

  it('defaults max to 100', () => {
    const { container } = render(() => <ProgressBar value={30} />);
    expect(fill(container).style.width).toBe('30%');
  });

  it('clamps an over-range value to 100%', () => {
    const { container } = render(() => <ProgressBar value={150} max={100} />);
    expect(fill(container).style.width).toBe('100%');
  });

  it('clamps a negative value to 0%', () => {
    const { container } = render(() => <ProgressBar value={-10} max={100} />);
    expect(fill(container).style.width).toBe('0%');
  });

  it('sets the progressbar aria attributes', () => {
    const { container } = render(() => <ProgressBar value={30} max={100} />);
    const t = track(container);
    expect(t).toHaveAttribute('role', 'progressbar');
    expect(t).toHaveAttribute('aria-valuenow', '30');
    expect(t).toHaveAttribute('aria-valuemin', '0');
    expect(t).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps aria-valuenow to max', () => {
    const { container } = render(() => <ProgressBar value={150} max={100} />);
    expect(track(container)).toHaveAttribute('aria-valuenow', '100');
  });

  it('renders an optional label', () => {
    const { getByText } = render(() => <ProgressBar value={3} max={5} label="Setup" />);
    expect(getByText('Setup')).toBeInTheDocument();
  });

  it('exposes track/fill parts', () => {
    const { container } = render(() => <ProgressBar value={50} />);
    expect(container.querySelector('[part="track"]')).toBeInTheDocument();
    expect(container.querySelector('[part="fill"]')).toBeInTheDocument();
  });

  it('defaults the fill tone to primary', () => {
    const { container } = render(() => <ProgressBar value={50} />);
    expect(fill(container)).toHaveClass('bg-primary');
  });

  it('sets the fill class from tone', () => {
    const tones = [
      ['success', 'bg-tool-green'],
      ['warning', 'bg-tool-amber'],
      ['error', 'bg-tool-red'],
      ['info', 'bg-tool-blue'],
    ] as const;
    for (const [tone, cls] of tones) {
      const { container } = render(() => <ProgressBar value={50} tone={tone} />);
      expect(fill(container)).toHaveClass(cls);
      expect(fill(container)).not.toHaveClass('bg-primary');
      cleanup();
    }
  });
});
