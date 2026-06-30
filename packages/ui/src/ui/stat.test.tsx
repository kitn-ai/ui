import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { Stat } from './stat';

afterEach(cleanup);

describe('Stat', () => {
  it('renders the label and value', () => {
    const { getByText } = render(() => <Stat label="Sessions" value="408" />);
    expect(getByText('Sessions')).toBeInTheDocument();
    expect(getByText('408')).toBeInTheDocument();
  });

  it('renders an optional hint when provided', () => {
    const { getByText } = render(() => <Stat label="Tokens" value="181.5M" hint="+12% this week" />);
    expect(getByText('+12% this week')).toBeInTheDocument();
  });

  it('omits the hint when absent', () => {
    const { queryByText } = render(() => <Stat label="Tokens" value="181.5M" />);
    expect(queryByText('+12% this week')).not.toBeInTheDocument();
  });

  it('omits the label when absent', () => {
    const { container } = render(() => <Stat value="17d" />);
    expect(container.querySelector('[part="label"]')).toBeNull();
    expect(container.querySelector('[part="value"]')).toHaveTextContent('17d');
  });

  it('lets children override value for rich content', () => {
    const { getByText, queryByText } = render(() => (
      <Stat label="Favorite model" value="ignored"><strong>Opus 4.8</strong></Stat>
    ));
    expect(getByText('Opus 4.8')).toBeInTheDocument();
    expect(queryByText('ignored')).not.toBeInTheDocument();
  });

  it('exposes stat/label/value parts', () => {
    const { container } = render(() => <Stat label="Streak" value="17d" />);
    expect(container.querySelector('[part="stat"]')).toBeInTheDocument();
    expect(container.querySelector('[part="label"]')).toHaveTextContent('Streak');
    expect(container.querySelector('[part="value"]')).toHaveTextContent('17d');
  });
});
