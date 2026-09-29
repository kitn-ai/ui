// tests/components/markdown-block-spacing.test.tsx
//
// The DOM SHAPE that `.chat-markdown`'s spacing model depends on, plus the one
// behaviour the shape could break silently. The gaps themselves are pixels, and jsdom
// computes no layout, so the numbers are measured in a real chromium by
// `scripts/probe-markdown-spacing.mjs` — this file pins what a browser cannot: whether
// the markup still has the shape the stylesheet's child rules need, and whether a block
// still re-renders when its content changes.
//
// The model (theme.css): the CONTAINER owns the gap between the blocks it holds, and no
// block carries a vertical margin of its own. It only works while each block is a DIRECT
// child of the container — a wrapper per token puts one element in between, and then the
// container's `> * + *` rule has nothing to select.
//
// Every SHAPE test here fails with the per-token wrapper restored (checked by putting it
// back); the two that only read class strings do not.
import { render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, test } from 'vitest';
import { Markdown } from '../../src/components/markdown/markdown';

afterEach(() => {
  document.body.innerHTML = '';
});

/** The `.chat-markdown` container, which is the element every rule below targets. */
function mount(content: string) {
  const { container } = render(() => <Markdown content={content} />);
  const markdown = container.querySelector('.chat-markdown');
  if (!markdown) throw new Error('no .chat-markdown container in the render');
  return markdown as HTMLElement;
}

const tags = (el: HTMLElement) => [...el.children].map((c) => c.tagName);

describe('markdown blocks are direct children of the container', () => {
  test('two paragraphs render as two children, with no wrapper around either', () => {
    // The shape `p:last-child` used to break: inside a per-token wrapper it matched
    // the only paragraph there, so both paragraphs lost the gap between them.
    const el = mount('First.\n\nSecond.');
    expect(tags(el)).toEqual(['P', 'P']);
    expect(el.textContent).toBe('First.Second.');
  });

  test('a trailing blank line adds no child at all', () => {
    // A whitespace token renders nothing, so it cannot become the container's last
    // child and hide the block in front of it from whatever follows the content.
    const el = mount('Here is the fix:\n\n```ts\nconst x = 1;\n```\n\n');
    expect(tags(el)).toEqual(['P', 'DIV']);
    expect(el.lastElementChild?.classList.contains('not-prose')).toBe(true);
  });

  test('a whitespace-only message renders no blocks', () => {
    expect(tags(mount('\n\n'))).toEqual([]);
  });

  test('the container carries no per-block margin utility of its own', () => {
    // `[&>div:first-child>p:first-child]:mt-0`-style corrections are exactly the
    // per-wrapper patching the container-owned model replaces.
    const el = mount('Text.');
    expect(el.className).not.toMatch(/\[&/);
    for (const child of el.children) {
      expect(child.className).not.toMatch(/(^|\s)-?m[ytb]-/);
    }
  });

  test('the fence carries the class the container keys its wider gap on', () => {
    // `.chat-markdown > * + .not-prose` in theme.css reads this class off CodeBlock's
    // root, so deleting it here silently drops the fence back to the prose gap.
    const el = mount('```ts\nconst x = 1;\n```');
    const fence = el.firstElementChild;
    expect(fence?.classList.contains('not-prose')).toBe(true);
    expect(fence?.classList.contains('my-4')).toBe(false);
  });
});

describe('an update to a block reaches the DOM', () => {
  // An end-to-end check on the update path a stream drives, not on WHICH read made it
  // reactive: `blocks()` rebuilds its block objects on every content change, so `<For>`
  // recreates the row and the text assertion alone would pass from a one-shot read. The
  // tag list beside it is the half with teeth — it is what fails if a wrapper comes back
  // between the container and its blocks.
  test('replacing the content of an existing block updates the text', () => {
    const [content, setContent] = createSignal('First.');
    const { container } = render(() => <Markdown content={content()} />);
    expect(container.textContent).toBe('First.');

    setContent('Changed.');
    expect(container.textContent).toBe('Changed.');
    expect(tags(container.querySelector('.chat-markdown') as HTMLElement)).toEqual(['P']);
  });

  test('appending a block to a settled message adds it, in order', () => {
    const [content, setContent] = createSignal('First.');
    const { container } = render(() => <Markdown content={content()} />);

    setContent('First.\n\nSecond.\n\n```ts\nconst x = 1;\n```');
    const el = container.querySelector('.chat-markdown') as HTMLElement;
    expect(tags(el)).toEqual(['P', 'P', 'DIV']);
    expect(el.textContent).toBe('First.Second.const x = 1;');
  });
});
