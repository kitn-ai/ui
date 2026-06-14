// tests/components/card.test.tsx
import { render } from '@solidjs/testing-library';
import { Card } from '../../src/components/card';

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
});
