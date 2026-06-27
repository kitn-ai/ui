import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { Nav, type KaiNavItem } from './nav';

afterEach(cleanup);

const ITEMS: KaiNavItem[] = [
  { id: 'a', label: 'Alpha', icon: 'plus' },
  { id: 'b', label: 'Beta', badge: 'New' },
  { id: 'c', label: 'Gamma', disabled: true },
];

describe('Nav', () => {
  it('renders one button per item', () => {
    const { getAllByRole } = render(() => <Nav items={ITEMS} />);
    expect(getAllByRole('button')).toHaveLength(3);
  });
  it('marks the active item with aria-current', () => {
    const { getByText } = render(() => <Nav items={ITEMS} value="b" />);
    expect(getByText('Beta').closest('button')).toHaveAttribute('aria-current', 'page');
    expect(getByText('Alpha').closest('button')).not.toHaveAttribute('aria-current');
  });
  it('fires onItemSelect with the id on click', () => {
    const onItemSelect = vi.fn();
    const { getByText } = render(() => <Nav items={ITEMS} onItemSelect={onItemSelect} />);
    fireEvent.click(getByText('Alpha'));
    expect(onItemSelect).toHaveBeenCalledWith('a');
  });
  it('does not fire for a disabled item', () => {
    const onItemSelect = vi.fn();
    const { getByText } = render(() => <Nav items={ITEMS} onItemSelect={onItemSelect} />);
    fireEvent.click(getByText('Gamma'));
    expect(onItemSelect).not.toHaveBeenCalled();
  });
  it('renders a trailing badge', () => {
    const { getByText } = render(() => <Nav items={ITEMS} />);
    expect(getByText('New')).toBeInTheDocument();
  });
});
