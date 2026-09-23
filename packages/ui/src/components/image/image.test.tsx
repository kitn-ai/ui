import { afterEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@solidjs/testing-library';
import { Image } from './image';

afterEach(cleanup);

// jsdom has no layout engine, so these assert DOM and attributes only, never geometry.
describe('Image (the resource renderer)', () => {
  it('renders the resource src and the alt', () => {
    const { container } = render(() => (
      <Image src="https://example.com/diagram.png" alt="A sequence diagram" />
    ));

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/diagram.png');
    expect(img).toHaveAttribute('alt', 'A sequence diagram');
    expect(img).toHaveClass('h-auto', 'max-w-full', 'overflow-hidden', 'rounded-md');
  });

  it('applies the caller class alongside the kit chrome', () => {
    const { container } = render(() => (
      <Image src="/diagram.png" alt="A sequence diagram" class="h-24 w-24" />
    ));

    // `h-24` wins the height slot over the chrome's `h-auto` through `cn`; the rest of
    // the chrome survives.
    expect(container.querySelector('img')).toHaveClass(
      'max-w-full',
      'overflow-hidden',
      'rounded-md',
      'h-24',
      'w-24',
    );
  });

  it('passes the remaining img attributes through (loading="lazy")', () => {
    const { container } = render(() => (
      <Image src="/diagram.png" alt="A sequence diagram" loading="lazy" width={320} height={200} />
    ));

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('width', '320');
    expect(img).toHaveAttribute('height', '200');
  });

  it('a data: URI is a resource and reaches src unchanged', () => {
    const uri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"></svg>';

    const { container } = render(() => <Image src={uri} alt="An inline icon" />);
    expect(container.querySelector('img')).toHaveAttribute('src', uri);
  });

  it('an object URL the caller made is not touched', () => {
    const { container } = render(() => <Image src="blob:kai-preview" alt="A staged photo" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:kai-preview');
  });
});
