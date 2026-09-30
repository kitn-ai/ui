import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import './row';

afterEach(() => { document.body.innerHTML = ''; });

const inner = (el: Element) => el.shadowRoot!.querySelector('[part="row"]')!;

describe('kai-row active', () => {
  it('the property drives aria-current on the inner button, and clearing removes it', async () => {
    await customElements.whenDefined('kai-row');
    const el = document.createElement('kai-row') as HTMLElement & { active?: boolean };
    el.setAttribute('interactive', '');
    el.textContent = 'Planner';
    document.body.append(el);
    await Promise.resolve();
    expect(inner(el)).not.toHaveAttribute('aria-current');
    el.active = true;
    await Promise.resolve();
    expect(inner(el)).toHaveAttribute('aria-current', 'true');
    el.active = false;
    await Promise.resolve();
    expect(inner(el)).not.toHaveAttribute('aria-current');
  });

  it('the attribute works too', async () => {
    await customElements.whenDefined('kai-row');
    const el = document.createElement('kai-row');
    el.setAttribute('active', '');
    el.setAttribute('interactive', '');
    document.body.append(el);
    await Promise.resolve();
    expect(inner(el)).toHaveAttribute('aria-current', 'true');
  });
});
