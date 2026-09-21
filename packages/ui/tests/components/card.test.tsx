// tests/components/card.test.tsx
import { render, fireEvent } from '@solidjs/testing-library';
import { Card } from '../../src/components/card/card';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<Card>', () => {
  test('renders the heading as an <h3> with a stable id', () => {
    const { getByRole } = render(() => <Card heading="Share your feedback" />);
    const h = getByRole('heading', { level: 3 });
    expect(h.textContent).toBe('Share your feedback');
    expect(h.id).toBeTruthy();
  });

  test('renders description, body (children), media and actions regions', () => {
    const { getByText, getByTestId } = render(() => (
      <Card
        heading="Title"
        description="A subtitle"
        media={<img data-testid="media" alt="m" src="x.png" />}
        actions={<button data-testid="act">Go</button>}
      >
        <p data-testid="body">body content</p>
      </Card>
    ));
    expect(getByText('A subtitle')).toBeTruthy();
    expect(getByTestId('media')).toBeTruthy();
    expect(getByTestId('act')).toBeTruthy();
    expect(getByTestId('body')).toBeTruthy();
  });

  test('omitted regions are absent', () => {
    const { queryByRole, container } = render(() => <Card>just a body</Card>);
    expect(queryByRole('heading')).toBeNull();
    // no media img, no footer buttons
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  test('errorMessage replaces the body with a role="alert" error', () => {
    const { getByRole, queryByTestId } = render(() => (
      <Card heading="Title" errorMessage="This form couldn't be displayed.">
        <p data-testid="body">should NOT render</p>
      </Card>
    ));
    const alert = getByRole('alert');
    expect(alert.textContent).toContain("This form couldn't be displayed.");
    expect(queryByTestId('body')).toBeNull();
  });

  test('error state hides actions (no broken/partial chrome)', () => {
    const { container } = render(() => (
      <Card heading="Title" errorMessage="Bad" actions={<button>Go</button>}>
        body
      </Card>
    ));
    expect(container.querySelector('button')).toBeNull();
  });

  // --- defaults-off regression guard --------------------------------------
  // The contract cards compose <Card> directly and set none of the new props.
  // With none set, the card must be a plain non-interactive <div>, emit nothing,
  // and render no close control.
  test('with no dismissible/clickable/href: a plain div, no close button, no role/href', () => {
    const onDismiss = vi.fn();
    const onCardClick = vi.fn();
    const { container, queryByRole } = render(() => (
      <Card heading="Title" onDismiss={onDismiss} onCardClick={onCardClick}>
        body
      </Card>
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe('DIV');
    expect(root.getAttribute('role')).toBeNull();
    expect(root.hasAttribute('href')).toBe(false);
    expect(root.hasAttribute('tabindex')).toBe(false);
    // No dismiss control.
    expect(queryByRole('button', { name: 'Dismiss' })).toBeNull();
    expect(container.querySelector('button')).toBeNull();
    // Nothing fired.
    fireEvent.click(root);
    expect(onCardClick).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  // --- dismissible ---------------------------------------------------------
  test('dismissible renders a close control that calls onDismiss and hides the card', () => {
    const onDismiss = vi.fn();
    const { getByRole, queryByRole } = render(() => (
      <Card heading="Promo" dismissible onDismiss={onDismiss}>
        body
      </Card>
    ));
    const close = getByRole('button', { name: 'Dismiss' });
    expect(close).toBeTruthy();
    fireEvent.click(close);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    // Self-hides after dismiss.
    expect(queryByRole('heading', { level: 3 })).toBeNull();
  });

  test('dismiss does not also activate a clickable card (stopPropagation)', () => {
    const onCardClick = vi.fn();
    const onDismiss = vi.fn();
    const { getByRole } = render(() => (
      <Card heading="Card" clickable dismissible onCardClick={onCardClick} onDismiss={onDismiss}>
        body
      </Card>
    ));
    fireEvent.click(getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  // --- clickable -----------------------------------------------------------
  test('clickable: role=button + tabindex, fires onCardClick on click and on Enter', () => {
    const onCardClick = vi.fn();
    const { container } = render(() => (
      <Card heading="Upgrade" clickable onCardClick={onCardClick}>
        body
      </Card>
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe('DIV');
    expect(root.getAttribute('role')).toBe('button');
    expect(root.getAttribute('tabindex')).toBe('0');

    fireEvent.click(root);
    expect(onCardClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(root, { key: 'Enter' });
    expect(onCardClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(root, { key: ' ' });
    expect(onCardClick).toHaveBeenCalledTimes(3);

    // An unrelated key does nothing.
    fireEvent.keyDown(root, { key: 'a' });
    expect(onCardClick).toHaveBeenCalledTimes(3);
  });

  // --- href ----------------------------------------------------------------
  test('href renders the card as an anchor with the href (and wins over clickable)', () => {
    const onCardClick = vi.fn();
    const { container } = render(() => (
      <Card heading="Docs" href="https://kitn.ai" clickable onCardClick={onCardClick}>
        body
      </Card>
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe('A');
    expect(root.getAttribute('href')).toBe('https://kitn.ai');
    // href wins over clickable: no role=button.
    expect(root.getAttribute('role')).toBeNull();
  });

  // --- unsafe-href rule ------------------------------------------------------
  // The same policy on the same sink as `Row` (src/components/row/row.tsx). Before
  // 2026-09-19 `Card` put the raw href on the anchor while `Row` refused an unsafe
  // one, and the pair disagreed silently. No built-in card renderer reaches this
  // sink with model data today, but `CardRenderer`'s `types` map is the sanctioned
  // extension point for a consumer renderer, which is how a model URL would arrive.
  test('a javascript: href renders the inert card: content visible, no anchor, no handler', () => {
    const onCardClick = vi.fn();
    const { container } = render(() => (
      // eslint-disable-next-line no-script-url
      <Card heading="Docs" href="javascript:alert(1)" clickable onCardClick={onCardClick}>
        body
      </Card>
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(container.textContent).toContain('Docs'); // escaping into visibility
    expect(container.textContent).toContain('body');
    expect(root.tagName).not.toBe('A');
    expect(root.hasAttribute('href')).toBe(false);
    // NOT promoted into a button either: an unsafe href must not become an emitter.
    expect(root.tagName).not.toBe('BUTTON');
    expect(root.getAttribute('role')).toBeNull();
    root.click();
    expect(onCardClick).not.toHaveBeenCalled();
  });

  test('a data:text/html href is refused the same way', () => {
    const { container } = render(() => (
      <Card heading="Docs" href="data:text/html,<script>alert(1)</script>">
        body
      </Card>
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.hasAttribute('href')).toBe(false);
    expect(root.tagName).not.toBe('A');
    expect(container.textContent).toContain('Docs');
  });

  test('href target=_blank gets a safe default rel', () => {
    const { container } = render(() => (
      <Card heading="External" href="https://kitn.ai" target="_blank">
        body
      </Card>
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('target')).toBe('_blank');
    expect(root.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
