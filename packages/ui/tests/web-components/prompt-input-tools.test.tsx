/**
 * The composer's `+` tools menu, on BOTH elements that carry it.
 *
 * What this file is for: the SURFACE contract. The item tree arrives as a JS
 * PROPERTY (an array cannot be an attribute), a chosen item is reported with its
 * NEW state under one event name shared with `<kai-menu>`, and `expanded` pins the
 * layout through a read that an explicit `="false"` cannot collapse into "absent".
 *
 * What it cannot do: measure. Nothing here renders layout, so the `expanded` cases
 * assert the frame's layout CLASSES rather than a height, and the pixel claims
 * belong to the browser probe. That split is deliberate: a class assertion is
 * honest about what it proves, and the probe is where the geometry is measured.
 *
 * The rows are looked for in the shadow root FIRST: the kit portals overlays into
 * the shadow tree's own mount node when one is provided (which the facade does), so
 * `document.querySelector` alone would miss them inside a custom element.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../../src/web-components/prompt/prompt-input';
import '../../src/web-components/chat/chat';

const flush = () => new Promise((r) => setTimeout(r, 0));

type KaiPromptInput = HTMLElement & { tools?: unknown; expanded?: boolean };

const ROW = '[role="menuitemcheckbox"], [role="menuitem"]';

const root = (el: HTMLElement) => el.shadowRoot!;
const triggerOf = (el: HTMLElement) =>
  root(el).querySelector<HTMLElement>('button[aria-label="More tools"]');
/** The frame has to exist for a layout assertion to mean anything, so a missing one fails
 *  here with a message rather than as an opaque TypeError inside a matcher. */
const frameOf = (el: HTMLElement): HTMLElement => {
  const frame = root(el).querySelector<HTMLElement>('[data-prompt-input]');
  if (!frame) throw new Error('the composer frame did not render');
  return frame;
};

const rowsOf = (el: HTMLElement): HTMLElement[] => {
  const inShadow = [...root(el).querySelectorAll<HTMLElement>(ROW)];
  return inShadow.length ? inShadow : [...document.querySelectorAll<HTMLElement>(ROW)];
};

/** Open the menu and wait for a row to land. BOUNDED on purpose: an unbounded poll
 *  would hang this whole file into the suite timeout instead of failing one case. */
async function openMenu(el: HTMLElement): Promise<HTMLElement[]> {
  const trigger = triggerOf(el);
  expect(trigger, 'no `+` trigger was rendered').toBeTruthy();
  trigger!.click();
  for (let i = 0; i < 20; i++) {
    await flush();
    const rows = rowsOf(el);
    if (rows.length > 0) return rows;
  }
  throw new Error('the `+` menu never rendered a row');
}

afterEach(() => { document.body.innerHTML = ''; });

describe('kai-prompt-input: the tools menu', () => {
  it('takes the tree as a property and reports a toggle with its NEW state', async () => {
    const el = document.createElement('kai-prompt-input') as KaiPromptInput;
    document.body.appendChild(el);
    await flush();

    const seen: unknown[] = [];
    el.addEventListener('kai-select', (e) => seen.push((e as CustomEvent).detail));
    el.tools = [{ id: 'web', label: 'Web search', checked: false }];

    const rows = await openMenu(el);
    // The built-in file row is always first when attachments are on, so this looks the
    // toggle up by name rather than assuming the tree is the whole menu.
    const toggle = rows.find((r) => r.textContent?.includes('Web search'));
    expect(toggle, 'the host\'s toggle is missing from the menu').toBeTruthy();
    toggle!.click();

    // The NEW state, so a host can set its own field from the event alone.
    expect(seen).toEqual([{ id: 'web', checked: true }]);
  });

  it('reports a command with no `checked` field at all', async () => {
    const el = document.createElement('kai-prompt-input') as KaiPromptInput;
    document.body.appendChild(el);
    await flush();

    const seen: unknown[] = [];
    el.addEventListener('kai-select', (e) => seen.push((e as CustomEvent).detail));
    el.tools = [{ id: 'github', label: 'Add from GitHub' }];

    const rows = await openMenu(el);
    rows.find((r) => r.textContent?.includes('Add from GitHub'))!.click();

    // Absent, not `false`: `checked` present is what marks an item a toggle.
    expect(seen).toEqual([{ id: 'github' }]);
  });

  it('owns the built-in file row, so it is not reported as a host tool', async () => {
    const el = document.createElement('kai-prompt-input') as KaiPromptInput;
    document.body.appendChild(el);
    await flush();

    const seen: unknown[] = [];
    el.addEventListener('kai-select', (e) => seen.push((e as CustomEvent).detail));
    el.tools = [{ id: 'github', label: 'Add from GitHub' }];

    const rows = await openMenu(el);
    const fileRow = rows.find((r) => r.textContent?.includes('Add files or photos'));
    expect(fileRow, 'the built-in file row is missing').toBeTruthy();
    fileRow!.click();

    // It opens the picker instead, so a host never has to handle an id it did not declare.
    expect(seen).toEqual([]);
  });

  it('takes a VALID JSON `tools` attribute, which is the path the guard exists to keep safe', async () => {
    const el = document.createElement('kai-prompt-input');
    el.setAttribute('attach', 'false');
    // The POSITIVE half of the boundary check below. Without it only the malformed
    // branch is pinned, so a later tightening (requiring objects, say) could break the
    // very path the guard's rationale rests on, and nothing would say so.
    el.setAttribute('tools', '[{"id":"github","label":"Add from GitHub"}]');
    document.body.appendChild(el);
    await flush();

    const seen: unknown[] = [];
    el.addEventListener('kai-select', (e) => seen.push((e as CustomEvent).detail));
    const [row] = await openMenu(el);
    expect(row.textContent).toContain('Add from GitHub');
    row.click();
    expect(seen).toEqual([{ id: 'github' }]);
  });

  it('reports a malformed `tools` attribute instead of rendering nonsense', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const el = document.createElement('kai-prompt-input') as KaiPromptInput;
      el.setAttribute('attach', 'false');
      // An attribute CAN reach this prop: the element library JSON-parses any prop whose
      // default is not a string, and on malformed JSON `parseAttributeValue` hands the
      // raw STRING through instead of throwing. So this is the reachable bad case, and
      // without a boundary check `buildComposerTools` would spread the characters into
      // the menu while `chipItems` walked them: a nonsense menu, not a missing one.
      el.setAttribute('tools', 'web-search');
      document.body.appendChild(el);
      await flush();

      expect(triggerOf(el)).toBeNull();
      const said = error.mock.calls.map((call) => call.map(String).join(' ')).join('\n');
      expect(said).toMatch(/tools/i);
    } finally {
      error.mockRestore();
    }
  });

  it('renders no trigger at all when there is nothing to offer', async () => {
    const el = document.createElement('kai-prompt-input') as KaiPromptInput;
    el.setAttribute('attach', 'false');
    document.body.appendChild(el);
    await flush();

    // Paired with the cases above that REQUIRE a trigger: a negative assertion is only
    // meaningful beside a positive one over the same harness, or it proves nothing.
    expect(triggerOf(el)).toBeNull();
  });
});

describe('kai-prompt-input: the pinned layout', () => {
  /** Collapsed is one row; expanded takes the whole line and wraps the controls under
   *  it. The class names are asserted because jsdom measures nothing; the heights are
   *  the probe's job. */
  const collapsed = (el: HTMLElement) => frameOf(el).className.includes('flex-row');
  const expanded = (el: HTMLElement) => frameOf(el).className.includes('flex-wrap');

  it('derives collapsed when the content fits one line', async () => {
    const el = document.createElement('kai-prompt-input') as KaiPromptInput;
    document.body.appendChild(el);
    await flush();
    expect(collapsed(el)).toBe(true);
  });

  it('DERIVES expanded for staged content when `expanded` is absent', async () => {
    const el = document.createElement('kai-prompt-input') as KaiPromptInput & { attachments?: unknown[] };
    document.body.appendChild(el);
    await flush();

    // This is the case that proves the third state exists, and the one `flag()` would
    // get wrong: `flag()` answers `false` for an absent attribute, so a composer with
    // staged content would be pinned shut instead of deriving its way open.
    el.attachments = [{ id: 'a', type: 'file', filename: 'a.pdf' }];
    await flush();
    expect(expanded(el)).toBe(true);
  });

  it('pins with the property, true and false', async () => {
    const el = document.createElement('kai-prompt-input') as KaiPromptInput;
    document.body.appendChild(el);
    await flush();

    el.expanded = true;
    await flush();
    expect(expanded(el)).toBe(true);

    el.expanded = false;
    await flush();
    expect(collapsed(el)).toBe(true);
  });

  it('reads the `expanded` attribute, including an explicit ="false"', async () => {
    const el = document.createElement('kai-prompt-input');
    el.setAttribute('expanded', 'false');
    document.body.appendChild(el);
    await flush();

    // Both halves matter: `="false"` must pin one row rather than read as absent, and
    // the bare attribute must pin two, so the attribute is genuinely read either way.
    expect(collapsed(el)).toBe(true);

    el.setAttribute('expanded', '');
    await flush();
    expect(expanded(el)).toBe(true);
  });
});

describe('kai-chat: the same surface', () => {
  it('carries the tools tree and fires kai-select with the same detail', async () => {
    const el = document.createElement('kai-chat') as KaiPromptInput & { messages?: unknown[] };
    el.messages = [];
    document.body.appendChild(el);
    await flush();

    const seen: unknown[] = [];
    el.addEventListener('kai-select', (e) => seen.push((e as CustomEvent).detail));
    el.tools = [{ id: 'web', label: 'Web search', checked: true }];

    const rows = await openMenu(el);
    rows.find((r) => r.textContent?.includes('Web search'))!.click();

    // NEW state: the item was on, so choosing it turns it off.
    expect(seen).toEqual([{ id: 'web', checked: false }]);
  });
});

/**
 * The suggestions' layout, on the element. The block sets it as an ATTRIBUTE, so
 * this pins the one hop nothing else covers: a kebab attribute has to arrive as the
 * camelCase property the renderer reads. `suggestionMode` and the array props are
 * passed as properties by every in-repo consumer, so a broken attribute hop would
 * otherwise only show up as "the layout silently stayed a pill".
 */
describe('kai-prompt-input: the suggestions layout', () => {
  const suggestionsOf = (el: HTMLElement): HTMLElement[] =>
    [...root(el).querySelectorAll<HTMLElement>('button')].filter((b) =>
      ['Summarize a document', 'Make a task list'].includes(b.textContent?.trim() ?? ''),
    );

  it('renders rows when the attribute asks for them', async () => {
    const el = document.createElement('kai-prompt-input') as KaiPromptInput & { suggestions?: string[] };
    el.setAttribute('suggestions-layout', 'block');
    document.body.appendChild(el);
    await flush();
    el.suggestions = ['Summarize a document', 'Make a task list'];
    await flush();

    const found = suggestionsOf(el);
    expect(found, 'the suggestions did not render').toHaveLength(2);
    // The block variant, reached through the attribute: full width, left aligned.
    expect(found[0].className).toContain('w-full');
    expect(found[0].className).toContain('justify-start');
    expect(found[0].className).not.toContain('rounded-pill');
  });

  it('stays pills without it, so the default is unchanged for every existing consumer', async () => {
    const el = document.createElement('kai-prompt-input') as KaiPromptInput & { suggestions?: string[] };
    document.body.appendChild(el);
    await flush();
    el.suggestions = ['Summarize a document'];
    await flush();

    const found = suggestionsOf(el);
    expect(found).toHaveLength(1);
    expect(found[0].className).toContain('rounded-pill');
  });
});
