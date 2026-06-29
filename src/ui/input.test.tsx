import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { Input } from './input';

afterEach(cleanup);

describe('Input', () => {
  it('renders an input with the given placeholder and value', () => {
    const { getByPlaceholderText } = render(() => <Input placeholder="Search projects" value="hello" />);
    const input = getByPlaceholderText('Search projects');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('hello');
  });

  it('fires onValueInput per keystroke with the new value', () => {
    const onValueInput = vi.fn();
    const { getByRole } = render(() => <Input onValueInput={onValueInput} />);
    const input = getByRole('textbox');
    fireEvent.input(input, { target: { value: 'abc' } });
    expect(onValueInput).toHaveBeenCalledWith('abc');
  });

  it('fires onValueChange on blur with the current value', () => {
    const onValueChange = vi.fn();
    const { getByRole } = render(() => <Input value="committed" onValueChange={onValueChange} />);
    const input = getByRole('textbox');
    fireEvent.blur(input);
    expect(onValueChange).toHaveBeenCalledWith('committed');
  });

  it('associates the label with the input via for/id', () => {
    const { getByLabelText, getByRole } = render(() => <Input label="Full name" />);
    const labelled = getByLabelText('Full name');
    expect(labelled).toBe(getByRole('textbox'));
    expect(labelled.id).toBeTruthy();
  });

  it('marks an errored field aria-invalid and links the error text via aria-describedby', () => {
    const { getByRole } = render(() => <Input error="Required field" />);
    const input = getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy as string);
    expect(errorEl).toHaveTextContent('Required field');
  });

  it('propagates disabled to the input', () => {
    const { getByRole } = render(() => <Input disabled />);
    expect(getByRole('textbox')).toBeDisabled();
  });

  it('renders leading and trailing content inside the field row', () => {
    const { getByTestId, getByRole } = render(() => (
      <Input
        leading={<span data-testid="lead">$</span>}
        trailing={<button data-testid="trail">Go</button>}
      />
    ));
    expect(getByTestId('lead')).toBeInTheDocument();
    expect(getByTestId('trail')).toBeInTheDocument();
    // the input still renders alongside the affixes
    expect(getByRole('textbox')).toBeInTheDocument();
  });
});
