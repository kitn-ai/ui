import { describe, it, expect } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { Loader } from '../../src/components/loader';

describe('Loader', () => {
  it('renders bars variant', () => {
    const { container } = render(() => <Loader variant="bars" />);
    expect(container.querySelector('.sr-only')).toBeTruthy();
  });
  it('renders text-shimmer with custom text', () => {
    render(() => <Loader variant="text-shimmer" text="Thinking..." />);
    expect(screen.getByText('Thinking...')).toBeTruthy();
  });
  it('renders loading-dots variant', () => {
    const { container } = render(() => <Loader variant="loading-dots" />);
    expect(container.querySelector('.inline-flex')).toBeTruthy();
  });
  it('renders pulse-dot variant', () => {
    const { container } = render(() => <Loader variant="pulse-dot" />);
    expect(container.querySelector('.rounded-full')).toBeTruthy();
  });
});
