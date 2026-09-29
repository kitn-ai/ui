// tests/components/prompt-suggestion.test.tsx
//
// Matched-substring highlight is CONTENT, not a control — used to carry
// `text-primary`, the BRAND token. Cheap jsdom pin on the class list only; the
// real computed-color proof lives in tests/e2e/content-brand-bleed.spec.ts.
import { describe, it, expect } from 'vitest';
import { render } from '@solidjs/testing-library';
import { PromptSuggestion } from '../../src/components/prompt/prompt-suggestion';

describe('PromptSuggestion highlight token', () => {
  it('never emits text-primary on the matched substring; uses text-foreground', () => {
    const { container } = render(() => (
      <PromptSuggestion highlight="lang">SolidJS is a reactive language.</PromptSuggestion>
    ));
    const matched = Array.from(container.querySelectorAll('span')).find((s) => s.textContent === 'lang');
    expect(matched).toBeTruthy();
    const classes = (matched!.getAttribute('class') ?? '').split(/\s+/);
    expect(classes).not.toContain('text-primary');
    expect(classes).toContain('text-foreground');
  });
});

// The pill's box. `h-8 px-3` is not two literals picked by hand: it is the button size
// scale's `sm` variant, so the pill follows --kai-density and the radius knob with every
// other button. The `text-xs` that variant also carries is deliberately NOT taken (the
// pill keeps the 14px type `lg` gave it), so the type size is pinned here too.
describe('PromptSuggestion pill box', () => {
  const classesOf = (container: HTMLElement) =>
    (container.querySelector('button')!.getAttribute('class') ?? '').split(/\s+/);

  it('is the size scale\'s 32px box with 12px of inline padding', () => {
    const { container } = render(() => <PromptSuggestion>What is SolidJS?</PromptSuggestion>);
    const classes = classesOf(container);
    expect(classes).toContain('h-8');
    expect(classes).toContain('px-3');
    expect(classes).toContain('rounded-pill');
    expect(classes, 'the shrunk box must not shrink the type with it').toContain('text-sm');
    expect(classes).not.toContain('h-10');
    expect(classes).not.toContain('px-6');
  });
});
