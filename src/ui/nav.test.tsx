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

const NESTED: KaiNavItem[] = [
  { id: 'home', label: 'Home', icon: 'plus' },
  {
    id: 'acme',
    label: 'Acme',
    icon: 'folder',
    children: [
      { id: 't1', label: 'Refactor auth' },
      { id: 't2', label: 'Landing page' },
    ],
  },
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

  // Backward-compat: a flat nav with no children/status/meta is unchanged — no
  // disclosure chevron, group, status, or meta markup, and no aria-expanded.
  it('renders a flat nav with no nesting/status/meta markup (unchanged)', () => {
    const { container, getAllByRole } = render(() => <Nav items={ITEMS} />);
    expect(container.querySelector('[part="chevron"]')).toBeNull();
    expect(container.querySelector('[part="group"]')).toBeNull();
    expect(container.querySelector('[part="status"]')).toBeNull();
    expect(container.querySelector('[part="meta"]')).toBeNull();
    for (const btn of getAllByRole('button')) {
      expect(btn).not.toHaveAttribute('aria-expanded');
      expect(btn).not.toHaveAttribute('aria-label');
      expect(btn).not.toHaveAttribute('style');
    }
  });
});

describe('Nav — nested groups', () => {
  it('renders a group parent with aria-expanded and its children, expanded by default', () => {
    const { getByText } = render(() => <Nav items={NESTED} />);
    const parent = getByText('Acme').closest('button')!;
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(getByText('Refactor auth')).toBeInTheDocument();
    expect(getByText('Landing page')).toBeInTheDocument();
  });

  it('renders a disclosure chevron on the group parent only', () => {
    const { container, getByText } = render(() => <Nav items={NESTED} />);
    const chevrons = container.querySelectorAll('[part="chevron"]');
    expect(chevrons).toHaveLength(1);
    expect(getByText('Acme').closest('button')).toContainElement(chevrons[0] as HTMLElement);
  });

  it('collapses and expands the group on click', () => {
    const { getByText, queryByText } = render(() => <Nav items={NESTED} />);
    const parent = getByText('Acme').closest('button')!;
    fireEvent.click(parent);
    expect(parent).toHaveAttribute('aria-expanded', 'false');
    expect(queryByText('Refactor auth')).not.toBeInTheDocument();
    fireEvent.click(parent);
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(queryByText('Refactor auth')).toBeInTheDocument();
  });

  it('honors defaultCollapsed for the initial state', () => {
    const { getByText, queryByText } = render(() => <Nav items={NESTED} defaultCollapsed={['acme']} />);
    expect(getByText('Acme').closest('button')).toHaveAttribute('aria-expanded', 'false');
    expect(queryByText('Refactor auth')).not.toBeInTheDocument();
  });

  it('toggles a collapsed group open with ArrowRight', () => {
    const { getByText, queryByText } = render(() => <Nav items={NESTED} defaultCollapsed={['acme']} />);
    const parent = getByText('Acme').closest('button')!;
    fireEvent.keyDown(parent, { key: 'ArrowRight' });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(queryByText('Refactor auth')).toBeInTheDocument();
  });

  it('selects a leaf child (fires onItemSelect) and does not select the group parent', () => {
    const onItemSelect = vi.fn();
    const { getByText } = render(() => <Nav items={NESTED} onItemSelect={onItemSelect} />);
    fireEvent.click(getByText('Refactor auth')); // leaf: selects
    expect(onItemSelect).toHaveBeenCalledWith('t1');
    onItemSelect.mockClear();
    fireEvent.click(getByText('Acme')); // group: toggles, no select
    expect(onItemSelect).not.toHaveBeenCalled();
  });

  it('marks an active leaf child with aria-current', () => {
    const { getByText } = render(() => <Nav items={NESTED} value="t2" />);
    expect(getByText('Landing page').closest('button')).toHaveAttribute('aria-current', 'page');
  });
});

describe('Nav — status dot', () => {
  const withStatus: KaiNavItem[] = [
    { id: 'run', label: 'Refactor auth', status: { tone: 'info', label: 'Working', pulse: true } },
  ];

  it('renders a tone-colored status dot with a pulse ring', () => {
    const { container } = render(() => <Nav items={withStatus} />);
    const status = container.querySelector('[part="status"]')!;
    expect(status).toBeInTheDocument();
    expect(status.querySelector('.bg-tool-blue')).not.toBeNull();
    expect(status.querySelector('.animate-ping')).not.toBeNull();
  });

  it('folds the status label into the row accessible name', () => {
    const { getByText } = render(() => <Nav items={withStatus} />);
    expect(getByText('Refactor auth').closest('button')).toHaveAttribute('aria-label', 'Refactor auth, Working');
  });

  it('maps each tone to its hue', () => {
    const tones: Array<[KaiNavItem['status'] & object, string]> = [
      [{ tone: 'primary' }, 'bg-primary'],
      [{ tone: 'success' }, 'bg-tool-green'],
      [{ tone: 'warning' }, 'bg-tool-amber'],
      [{ tone: 'error' }, 'bg-tool-red'],
      [{ tone: 'neutral' }, 'bg-muted-foreground'],
    ];
    for (const [status, hue] of tones) {
      const { container } = render(() => <Nav items={[{ id: 'x', label: 'X', status }]} />);
      expect(container.querySelector(`[part="status"] .${hue}`)).not.toBeNull();
      cleanup();
    }
  });
});

describe('Nav — trailing meta', () => {
  const withMeta: KaiNavItem[] = [{ id: 'm', label: 'Landing page', meta: '24d ago' }];

  it('renders the meta text in a meta part', () => {
    const { container, getByText } = render(() => <Nav items={withMeta} />);
    const meta = container.querySelector('[part="meta"]')!;
    expect(meta).toBeInTheDocument();
    expect(meta).toHaveTextContent('24d ago');
    expect(getByText('Landing page').closest('button')).toContainElement(meta as HTMLElement);
  });

  it('folds meta into the row accessible name', () => {
    const { getByText } = render(() => <Nav items={withMeta} />);
    expect(getByText('Landing page').closest('button')).toHaveAttribute('aria-label', 'Landing page, 24d ago');
  });
});
