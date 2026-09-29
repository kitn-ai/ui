/**
 * The ATTRIBUTE channel of the React wrapper runtime.
 *
 * React routes a prop through the element's DECLARED prop list, so a prop the
 * element does not declare (`role`, `tabIndex`, any `aria-*`, any `data-*`)
 * never reached the host: a slotted menu row written as
 * `<Dropdown role="menuitem" tabIndex={-1} data-op="pin" aria-label="Pin">` lost
 * all four, silently, and an `aria-label` on any wrapper was a no-op. The runtime
 * now writes those to the host as ATTRIBUTES, a different channel from the
 * declared-prop assignment, and these assert what lands on the ELEMENT (a real
 * DOM read, not the emitted JSX text).
 *
 * Run with `npm run test:react` (vitest.react.config.ts → @vitejs/plugin-react,
 * NOT the global Solid transform). Elements are registered once in
 * tests/react/setup.ts from the prebuilt bundle.
 *
 * The runtime's `// @ts-expect-error` at the foot of this file is the TYPE half:
 * `tsc -p tsconfig.react.test.json` (the fourth pass of `npm run typecheck`) fails
 * with TS2578 the moment a misspelled prop starts compiling, which is what a broad
 * `[key: string]: unknown` on WebComponentProps would do.
 */
import { render, cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import type { ReactElement } from 'react';
import { Badge, Dropdown, Message } from '@kitn.ai/ui/react';

afterEach(cleanup);

const host = (container: HTMLElement, tag: string): HTMLElement => {
  const el = container.querySelector(tag);
  if (!el) throw new Error(`<${tag}> did not render`);
  return el as HTMLElement;
};

test('role, tabIndex, aria-* and data-* reach the host as attributes', () => {
  const { container } = render(
    <Dropdown role="menuitem" tabIndex={-1} aria-label="Pin" data-op="pin" />,
  );
  const el = host(container, 'kai-dropdown');

  // The ATTRIBUTES, by name. `tabindex` is lower-case: it is the DOM attribute,
  // not React's `tabIndex` prop name.
  expect(el.getAttribute('role')).toBe('menuitem');
  expect(el.getAttribute('tabindex')).toBe('-1');
  expect(el.getAttribute('aria-label')).toBe('Pin');
  expect(el.getAttribute('data-op')).toBe('pin');
});

test('an explicit undefined omits the attribute', () => {
  const { container } = render(<Badge aria-label={undefined} data-op={undefined} />);
  const el = host(container, 'kai-badge');

  expect(el.hasAttribute('aria-label')).toBe(false);
  expect(el.hasAttribute('data-op')).toBe(false);
});

test('a prop absent from props leaves an attribute it did not set alone', () => {
  const { container, rerender } = render(<Badge data-op="pin" />);
  const el = host(container, 'kai-badge');
  expect(el.getAttribute('data-op')).toBe('pin');

  // Dropping the key entirely is "leave it alone", not "clear it" — the same
  // absent-vs-undefined split the declared-prop path keeps.
  rerender(<Badge />);
  expect(el.getAttribute('data-op')).toBe('pin');

  // Passing it as `undefined` IS the caller asking for no value, which omits.
  rerender(<Badge data-op={undefined} />);
  expect(el.hasAttribute('data-op')).toBe(false);
});

test('a false data-* flag omits the attribute rather than writing "false"', () => {
  const { container, rerender } = render(<Badge data-op="pin" />);
  const el = host(container, 'kai-badge');
  expect(el.getAttribute('data-op')).toBe('pin');

  rerender(<Badge data-op={false} />);
  // On a flag attribute a present value is the signal, so `data-op="false"` would
  // still read as set — the runtime's own reasoning for normalising `hidden`.
  expect(el.hasAttribute('data-op')).toBe(false);

  rerender(<Badge data-op={true} />);
  expect(el.getAttribute('data-op')).toBe('true');
});

test('an aria-* boolean is written in its string form', () => {
  const { container, rerender } = render(<Badge aria-hidden={true} />);
  const el = host(container, 'kai-badge');
  expect(el.getAttribute('aria-hidden')).toBe('true');

  rerender(<Badge aria-hidden={false} />);
  // ARIA is a string contract and a present-but-false aria-* is meaningful, so
  // unlike data-*, `false` is written rather than omitted.
  expect(el.getAttribute('aria-hidden')).toBe('false');
});

test('a function-valued prop under an attribute name is never written as an attribute', () => {
  // Cast because the type correctly refuses a function on a data-* key; the
  // runtime guard is what this asserts, so the value has to reach it anyway.
  const hostile = { 'data-cb': (() => 'x') as unknown as string };
  const { container } = render(<Badge {...hostile} />);
  const el = host(container, 'kai-badge');

  expect(el.hasAttribute('data-cb')).toBe(false);
});

test('a declared prop keeps the property path, not the attribute path', () => {
  const { container } = render(<Dropdown triggerLabel="Menu" />);
  const el = host(container, 'kai-dropdown') as HTMLElement & { triggerLabel?: string };

  expect(el.triggerLabel).toBe('Menu');
  expect(el.getAttribute('triggerlabel')).toBeNull();
});

test('an event handler prop is never written as an attribute', () => {
  const { container } = render(<Dropdown onOpenChange={() => {}} />);
  const el = host(container, 'kai-dropdown');

  expect(el.hasAttribute('onopenchange')).toBe(false);
  expect(el.hasAttribute('onOpenChange')).toBe(false);
});

test('a name the element DECLARES stays on the property path', () => {
  // `kai-message` declares `role` as its SPEAKER prop (`'user' | 'assistant'`),
  // which is not a valid ARIA role and is lifted off the host by the element.
  // The attribute channel must skip it, so it never fights the declaration.
  const { container } = render(<Message role="assistant" />);
  const el = host(container, 'kai-message') as HTMLElement & { role?: string };

  expect(el.role).toBe('assistant');
  expect(el.getAttribute('role')).toBeNull();
});

// TYPE HALF. `@ts-expect-error` is active under `tsc -p tsconfig.react.test.json`
// (the fourth pass of `npm run typecheck`) and goes TS2578 ("Unused
// '@ts-expect-error' directive") the moment the line compiles — which is exactly
// what a broad `[key: string]: unknown` on WebComponentProps would do to every
// real consumer typo. A recognized `data-*` key still compiles (below), so the
// two together pin the width of the surface.
const _typography: ReactElement = (
  // @ts-expect-error `contnet` is not a prop of a kit wrapper
  <Badge contnet="typo" />
);
const _acceptedDataKey: ReactElement = <Badge data-op="pin" />;

// Referenced so a reader sees they are load-bearing to tsc, not dead code (the
// react-test pass sets neither noUnusedLocals nor noUnusedParameters).
export type AttributeChannelTypeProbes = [typeof _typography, typeof _acceptedDataKey];
