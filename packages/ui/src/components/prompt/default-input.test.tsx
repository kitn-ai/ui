/**
 * The composer's `+` trigger is the file input's only entry point now, and it is the
 * one control whose visible HINT is a tooltip while its accessible NAME is its
 * `aria-label`. Those are two different things, and the failure mode this file exists
 * for is the tooltip becoming the name (a `title` attribute, or a tooltip wrapper that
 * swallows the button's label) — a screen reader then announces the tip instead of the
 * control. The trigger must also stay keyboard reachable and keep opening the tip on
 * focus, or the hint exists for pointers only.
 *
 * These cases were the PAPERCLIP's until the file item replaced it, and they were
 * re-pointed rather than deleted: a tooltip becoming the accessible name is a class of
 * defect rather than one button's, and the kit has shipped it once already.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent, within, screen, waitFor } from '@solidjs/testing-library';
import { DefaultPromptInput, buildComposerTools } from './default-input';
import { PromptInput, PromptInputTextarea, PromptInputActions } from './prompt-input';

afterEach(cleanup);

const noop = () => {};
// `onAttachmentsChange` is what makes `canAttach()` true (the attach button and the
// previews are opt-in), so every case here provides it.
const baseProps = {
  value: '',
  onValueChange: noop,
  onSubmit: noop,
  onSuggestionClick: noop,
  onAttachmentsChange: noop,
};

// The tooltip renders through a Portal onto document.body, outside the render
// container.
const tooltip = () => within(document.body).queryByRole('tooltip');

describe('DefaultPromptInput tools menu trigger', () => {
  it('carries the tooltip as its hint without the name changing', () => {
    const { getByRole, getByLabelText } = render(() => <DefaultPromptInput {...baseProps} />);
    // The accessible name is the aria-label, unchanged.
    const button = getByRole('button', { name: 'More tools' });
    expect(button).toHaveAttribute('aria-label', 'More tools');
    // And it is not hidden behind a title attribute, the hand-rolled version the
    // tooltip replaces.
    expect(button).not.toHaveAttribute('title');
    expect(getByLabelText('More tools')).toBe(button);

    // Nothing is announced twice: the tip is not in the tree until it is opened.
    expect(tooltip()).not.toBeInTheDocument();
    fireEvent.focusIn(button);
    expect(tooltip()).toHaveTextContent('More tools');
    // The name is STILL the label with the tip open (the tip is a description).
    expect(getByRole('button', { name: 'More tools' })).toBe(button);
  });

  it('stays keyboard reachable and opens the tip on focus, not on hover only', () => {
    const { getByRole } = render(() => <DefaultPromptInput {...baseProps} />);
    const button = getByRole('button', { name: 'More tools' }) as HTMLButtonElement;
    expect(button.tagName).toBe('BUTTON');
    expect(button).not.toHaveAttribute('tabindex', '-1');
    expect(button).not.toBeDisabled();
    expect(button.tabIndex).toBe(0);

    button.focus();
    expect(document.activeElement).toBe(button);
    expect(tooltip()).toHaveTextContent('More tools');
  });

  it('is absent when the composer can neither attach nor offer anything', () => {
    // The tree is DERIVED, so the file item goes with `attach` and an empty tree renders
    // NO trigger: a control that opens nothing is worse than no control.
    const { queryByRole } = render(() => <DefaultPromptInput {...baseProps} attach={false} />);
    expect(queryByRole('button', { name: 'More tools' })).not.toBeInTheDocument();
  });

  it('is present for the host items even when the built-in file item is off', () => {
    const { getByRole, queryByRole } = render(() => (
      <DefaultPromptInput
        {...baseProps}
        attach={false}
        tools={[{ id: 'github', label: 'Add from GitHub' }]}
      />
    ));
    fireEvent.click(getByRole('button', { name: 'More tools' }));
    // `attach` gates the BUILT-IN item, not the menu: the host's tree renders on its own.
    expect(screen.getByRole('menuitem', { name: 'Add from GitHub' })).toBeInTheDocument();
    expect(queryByRole('menuitem', { name: 'Add files or photos' })).not.toBeInTheDocument();
  });

  it('reports a chosen toggle with its NEW state, so the host can store the event alone', async () => {
    const onToolSelect = vi.fn();
    const { getByRole } = render(() => (
      <DefaultPromptInput
        {...baseProps}
        tools={[{ id: 'web-search', label: 'Web search', checked: false }]}
        onToolSelect={onToolSelect}
      />
    ));
    fireEvent.click(getByRole('button', { name: 'More tools' }));
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Web search' }));
    expect(onToolSelect).toHaveBeenCalledWith({ id: 'web-search', checked: true });
  });

  it('does not report the built-in file item as a host tool', () => {
    const onToolSelect = vi.fn();
    const { getByRole } = render(() => (
      <DefaultPromptInput {...baseProps} onToolSelect={onToolSelect} />
    ));
    fireEvent.click(getByRole('button', { name: 'More tools' }));
    // The file item opens the picker, which is the composer's own business: reporting it
    // as a tool would make every host handle an id it never declared.
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add files or photos' }));
    expect(onToolSelect).not.toHaveBeenCalled();
  });

  it('forwards the disabled state to the trigger', () => {
    const { getByRole } = render(() => <DefaultPromptInput {...baseProps} disabled />);
    expect(getByRole('button', { name: 'More tools' })).toBeDisabled();
  });
});

describe('buildComposerTools', () => {
  it('puts the built-in file item first and the host tree after it', () => {
    const items = buildComposerTools({
      attach: true,
      tools: [{ id: 'github', label: 'Add from GitHub' }],
    });
    expect(items[0]).toMatchObject({ id: 'files', label: 'Add files or photos' });
    // The separator is DERIVED from the tree, so a host cannot be left with a
    // divider that has nothing above it.
    expect(items[1]).toMatchObject({ separator: true });
    expect(items[2]).toMatchObject({ id: 'github' });
  });

  it('derives no second divider when the host tree already opens with one', () => {
    const items = buildComposerTools({
      attach: true,
      tools: [{ separator: true }, { id: 'github', label: 'Add from GitHub' }],
    });
    // A host that asks for a divider after the file item must not get the derived one
    // as well: two dividers in a row is the same defect as a divider with nothing
    // above it, for exactly the input the derivation exists to guard.
    expect(items.filter((i) => i.separator === true)).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'files' });
    expect(items[1]).toMatchObject({ separator: true });
    expect(items[2]).toMatchObject({ id: 'github' });
  });

  it('is empty when attachments are off and the host declared nothing', () => {
    expect(buildComposerTools({ attach: false })).toEqual([]);
  });

  it('adds no trailing separator after the file item alone', () => {
    expect(buildComposerTools({ attach: true }).map((i) => i.id)).toEqual(['files']);
  });
});

/**
 * The box's two layouts, by their classes. jsdom measures nothing, so this cannot
 * assert a rendered pixel — which is exactly why the CLASSES are the contract here:
 * the numbers were measured from the reference screenshots (the send button is 28px
 * in each, so they are 1x and real CSS pixels), and "approximately padded" is what
 * the previous attempt at this look shipped. The two layouts are pinned separately
 * because they reach the one shared left edge by different means.
 */
describe('DefaultPromptInput geometry', () => {
  const frame = (c: HTMLElement) => c.querySelector('[data-prompt-input]') as HTMLElement;
  const body = (c: HTMLElement) => c.querySelector('[data-composer-body]') as HTMLElement;
  const editable = (c: HTMLElement) => c.querySelector('[data-kai-composer-editable]') as HTMLElement;

  it('renders the control clusters as `contents`, so one DOM order serves both layouts', () => {
    // The load-bearing fact about the composer's clusters, and it is why they are plain
    // divs rather than `PromptInputActions`: as a box a wrapper is a layout participant
    // whose width means something different in each layout, so every hand-composed
    // PromptInput + textarea + actions would have to know which one it was in. With no
    // box its children ARE the frame's flex items, which the frame's `gap` packs and its
    // `justify-between` distributes. A later reader turning these back into
    // `flex items-center gap-2` reintroduces that, and leaves the frame with nothing to
    // place. `data-cluster` is the hook the rest of these cases read.
    const { container } = render(() => <DefaultPromptInput {...baseProps} />);
    for (const cluster of ['leading', 'trailing'] as const) {
      const el = frame(container).querySelector(`[data-cluster="${cluster}"]`) as HTMLElement;
      expect(el.tagName).toBe('DIV');
      expect(el.className).toContain('contents');
      // And the GROUP div each cluster holds — the item the frame actually lays out —
      // holds its own width, on BOTH sides. Pinned per cluster rather than once: an
      // invariant asserted on one side only is the shape that reads as covered while
      // half of it can be dropped unnoticed. What the hold is for is the narrow case,
      // not the expansion rule, and the site comment says which.
      expect((el.querySelector(':scope > div') as HTMLElement).className).toContain('shrink-0');
    }
  });

  it('collapsed: one row, with the frame owning the insets', () => {
    const { container } = render(() => <DefaultPromptInput {...baseProps} />);
    expect(frame(container).className).toContain('flex-row');
    // 10px above and below a 28px control is the 48px row. The horizontal value is
    // DERIVED, not measured: `(rowHeight − controlHeight) / 2` is `(48 − 28) / 2`, so the
    // control sits centred on the pill's arc. Pinned as one value for BOTH ends, because
    // a pair of different ones is what pushed the controls inside the curve and made the
    // row read as inset boxes.
    expect(frame(container).className).toContain('py-2.5');
    expect(frame(container).className).toContain('px-2.5');
    expect(frame(container).className).not.toContain('pl-4.5');
    // 8px between the row's items, which is what the reference's ink gaps come out to
    // once the controls' own padding is taken off.
    expect(frame(container).className).toContain('gap-2');
    // The text carries no inset of its own: the frame's padding is the one edge.
    expect(editable(container).className).not.toMatch(/\bpl-/);
    expect(editable(container).className).not.toMatch(/\bpt-/);
    // Collapsed the text shares the row, so it takes the room that is left.
    expect(body(container).className).toContain('flex-1');
  });

  it('expanded: the text takes the whole line and the controls wrap below it', () => {
    const { container } = render(() => (
      <DefaultPromptInput {...baseProps} attachments={[{ id: 'a', type: 'file', filename: 'a.pdf' }]} />
    ));
    expect(frame(container).className).toContain('flex-wrap');
    expect(frame(container).className).toContain('pt-3.5');
    // The SAME horizontal value as the collapsed row. A different one would make the `+`
    // jump sideways the moment the composer expands, which is worse than any padding it
    // might buy — so the two are pinned against each other rather than each against a
    // literal.
    expect(frame(container).className).toContain('px-2.5');
    expect(frame(container).className).not.toContain('px-4.5');
    // 6px between the text block and the control row, and 10px closing the box — the
    // two numbers a first cut of this layout left out, which is how the rows end up
    // touching. Pinned because an unpinned number is where the next approximation lands.
    expect(frame(container).className).toContain('gap-y-1.5');
    expect(frame(container).className).toContain('pb-2.5');
    // The frame places a hand-composed trailing edge; `justify-content` is per flex
    // LINE, so this is inert for the body and load-bearing for the row below it.
    expect(frame(container).className).toContain('justify-between');
    // The mechanism, and it has to sit on the BODY rather than on the editable: the
    // Composer renders the editable inside a `relative` div of its own, so a
    // flex-child class on the editable lands on a nested block and changes nothing.
    // `order-first` lifts the text above the clusters, `basis-full` claims the line.
    expect(body(container).className).toContain('order-first');
    expect(body(container).className).toContain('basis-full');
    // The clusters stay dumb wrappers: they carry no order, so the whole layout
    // decision lives with the resolver rather than being split across three places.
    expect((frame(container).querySelector('[data-cluster="leading"]') as HTMLElement).className).not.toMatch(/\border-/);
    expect((frame(container).querySelector('[data-cluster="trailing"]') as HTMLElement).className).not.toMatch(/\border-/);
  });

  it('puts the microphone beside SUBMIT, not beside the input affordances', () => {
    // A placement rule with a reason rather than a preference: a microphone MAKES a
    // message the way the send button does, instead of adding something to one, which is
    // why both references put it at the trailing edge. It shipped in the leading cluster
    // because no task carried the move — it is the same `voice` prop either way, so this
    // case pins WHICH cluster renders it rather than that it exists.
    const { container } = render(() => <DefaultPromptInput {...baseProps} voice />);
    const mic = container.querySelector('[aria-label="Voice input"]') as HTMLElement;
    expect(mic).not.toBeNull();
    expect(mic.closest('[data-cluster="trailing"]')).not.toBeNull();
    expect(mic.closest('[data-cluster="leading"]')).toBeNull();
    // And before Send inside that cluster, so the row reads `… mic send` rather than the
    // other way round. A position assertion, because "in the trailing cluster" is
    // satisfied by either order and only one of them matches the references.
    const send = container.querySelector('[data-testid="send"]') as HTMLElement;
    expect(mic.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps Send the only FILLED control in the row', () => {
    // The composer's icon controls are bare glyphs — `subtle`: muted ink with a hover
    // fill — because a resting fill turns each one into a box inside the pill, and three
    // of those is what reads as too much padding. Send keeps `default`'s `bg-primary`,
    // the one filled control both references show.
    //
    // Asserted as a PAIR: `bg-muted/50` is what the wrong variant adds, `hover:bg-accent`
    // is what the right one carries. Checking only the first would pass on any variant
    // that happens not to use that fill, including one that invents a new one.
    const { container } = render(() => (
      <DefaultPromptInput {...baseProps} voice toolbarActions={[{ id: 'a', label: 'Action' }]} />
    ));
    const controls = [
      container.querySelector('[part="tools"]'),
      container.querySelector('[aria-label="Voice input"]'),
      container.querySelector('[data-action="a"]'),
    ] as HTMLElement[];
    for (const control of controls) {
      expect(control).not.toBeNull();
      expect(control.className).not.toContain('bg-muted/50');
      expect(control.className).toContain('hover:bg-accent');
    }
    const send = container.querySelector('[data-testid="send"]') as HTMLElement;
    expect(send.className).toContain('bg-primary');
  });

  describe('PromptInputActions is a box, and the caller owns its distribution', () => {
    // The counterpart to the clusters above, and they are two different answers on
    // purpose. A hand-composed PromptInput wants its own `justify-end` to MEAN something,
    // and that needs a box with a width to distribute across: content-width collapsed so
    // it sits after the `flex-1` body at the trailing edge, the full wrapped line
    // expanded. `contents` here would leave a lone control as the only item on the line,
    // and `space-between` resolves to flex-START for one item — the opposite of the
    // `justify-end` all fifteen of those stories asked for.
    const compose = (expanded: boolean, actionsClass?: string) =>
      render(() => (
        <PromptInput onSubmit={noop} expanded={expanded}>
          <PromptInputTextarea placeholder="Message" />
          <PromptInputActions class={actionsClass}>
            <button type="button">Send</button>
          </PromptInputActions>
        </PromptInput>
      ));

    it('collapsed: content-width, so it rides the row just after the text', () => {
      const { container } = compose(false);
      const wrapper = container.querySelector('[data-prompt-input-actions]') as HTMLElement;
      expect(wrapper.className).toContain('flex');
      expect(wrapper.className).toContain('shrink-0');
      expect(wrapper.className).not.toContain('w-full');
    });

    it('expanded: the whole wrapped line, which is what gives the caller a width', () => {
      const { container } = compose(true);
      const wrapper = container.querySelector('[data-prompt-input-actions]') as HTMLElement;
      expect(wrapper.className).toContain('w-full');
      // The kit's own distribution fills the line, and the merge is last-wins so a
      // caller's class overrides it rather than fighting it.
      expect(wrapper.className).toContain('justify-between');
    });

    it("expanded: the caller's `justify-end` WINS, and the default is dropped", () => {
      const { container } = compose(true, 'justify-end');
      const wrapper = container.querySelector('[data-prompt-input-actions]') as HTMLElement;
      expect(wrapper.className).toContain('justify-end');
      // Not just 'the class is present' — the kit's default must be GONE, or which one
      // applies is decided by the order the generated sheet emits them in. That is why
      // the default is written before `local.class` in the `cn` call.
      expect(wrapper.className).not.toContain('justify-between');
    });
  });

  it('collapsed: the text is centred on the row, not on a taller box of its own', () => {
    // Reported by the owner: with one line, the text rendered closer to the top than to
    // the centre. The cause is arithmetic and it is exact — the editable carried
    // `min-h-6` (24px) against this prose size's ~20px line box, and a line box sits at
    // the TOP of a taller content box, so the spare 4px all landed underneath and lifted
    // the text by half of it. Its centre then sat 2-3px above the centreline the 28px
    // controls are on.
    //
    // The fix moves the height onto the WRAPPER, where it can be the control height
    // rather than a number someone picked: 28px centred around one 20px line puts the
    // text's centre on the row's centre, alongside the buttons. jsdom measures nothing,
    // so these are the classes and the geometry probe owns the pixels.
    const { container } = render(() => <DefaultPromptInput {...baseProps} />);
    expect(body(container).className).toContain('min-h-7');
    expect(body(container).className).toContain('items-center');
    // And the text itself carries no min-height any more: that is what was removed.
    expect(editable(container).className).not.toMatch(/\bmin-h-/);
  });

  it('expanded: the body takes no centring height, so the paragraph starts where the frame puts it', () => {
    // The mirror of the case above: a 28px box under a 20px line would add 8px before
    // the control row and push it below the measured position. Expanded, the frame's
    // `pt-3.5` is the only thing deciding where the paragraph starts.
    const { container } = render(() => (
      <DefaultPromptInput {...baseProps} attachments={[{ id: 'a', type: 'file', filename: 'a.pdf' }]} />
    ));
    expect(body(container).className).not.toContain('min-h-7');
    expect(body(container).className).not.toContain('items-center');
  });

  it('keeps the attachment band above the text', () => {
    // The regression this guards: the body's `order-first` is what puts the text on
    // its own line, and it would equally lift the paragraph ABOVE the chips — the
    // opposite of the reference, which puts them on top. The band carries the same
    // order, and comes first in the DOM, so it stays first.
    const { container } = render(() => (
      <DefaultPromptInput {...baseProps} attachments={[{ id: 'a', type: 'file', filename: 'a.pdf' }]} />
    ));
    const band = frame(container).querySelector('[data-composer-band]') as HTMLElement;
    expect(band).toBeTruthy();
    expect(band.className).toContain('order-first');
    // 14px of margin, and 20px in total once the frame's 6px row gap is added — the
    // measured band-to-text gap.
    expect(band.className).toContain('mb-3.5');
    expect(band.compareDocumentPosition(editable(container)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

/**
 * A click inside the frame focuses the editable — that is the composer's whole point
 * — but NOT when it lands on a control inside it. The `+` trigger opens a menu, and
 * focusing the text on the way in leaves the caret in the composer, so the arrow keys
 * the user reaches for next TYPE into the text instead of walking the menu. (The
 * paperclip did the same and it was harmless: it opened a file dialog.)
 *
 * These assertions discriminate in jsdom because the frame calls `.focus()`
 * EXPLICITLY, and jsdom honours that even though it does not focus on click — so
 * without the fix the second case fails rather than passing vacuously.
 */
describe('DefaultPromptInput click-to-focus', () => {
  const editableEl = (c: HTMLElement) => c.querySelector('[data-kai-composer-editable]') as HTMLElement;
  const frameEl = (c: HTMLElement) => c.querySelector('[data-prompt-input]') as HTMLElement;

  it('focuses the editable when the click lands on the frame itself', () => {
    const { container } = render(() => <DefaultPromptInput {...baseProps} />);
    fireEvent.click(frameEl(container));
    expect(document.activeElement).toBe(editableEl(container));
  });

  it('leaves the caret alone when the click lands on a control inside it', () => {
    const { container, getByRole } = render(() => (
      <DefaultPromptInput {...baseProps} tools={[{ id: 'x', label: 'X' }]} onToolSelect={noop} />
    ));
    editableEl(container).blur();
    fireEvent.click(getByRole('button', { name: 'More tools' }));
    expect(document.activeElement).not.toBe(editableEl(container));
  });
});

/**
 * The surface's trigger ref reaches the real `<button>`.
 *
 * The trigger renders through `as`, so the ref travels `As` -> the function's props ->
 * `Button`'s `rest` -> the inner element. If that hop landed on a wrapper, or on
 * nothing, the surface would have no trigger to position against or to return focus
 * to — and no other gate in this repo can see it, because jsdom has no layout.
 *
 * So the assertion is `document.activeElement` after a selection: the close path
 * focuses `ctx.trigger()`, which only the ref sets. Reading `aria-haspopup` instead
 * would prove nothing, since the spread puts that on the inner element either way.
 */
describe('DefaultPromptInput tools trigger wiring', () => {
  it("the surface's trigger ref reaches the real button", async () => {
    const { getByRole } = render(() => (
      <DefaultPromptInput {...baseProps} tools={[{ id: 'x', label: 'X' }]} onToolSelect={noop} />
    ));
    const trigger = getByRole('button', { name: 'More tools' }) as HTMLButtonElement;
    expect(trigger.tagName).toBe('BUTTON');

    // Toggle it open and closed again. Closing runs the surface's return-focus path,
    // which reads `ctx.trigger()` — the value ONLY the trigger ref ever sets. Nothing
    // else the spread does is ref-dependent in a DOM with no layout, which is why
    // this is the assertion and `aria-haspopup` (which lands either way) is not.
    fireEvent.click(trigger);
    fireEvent.click(trigger);

    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

/**
 * The chips are one view of the same `checked` field the menu renders, so these pin
 * the two facts that keep the two from disagreeing: WHICH items earn a chip, and that
 * removing one leaves through the SAME event a menu selection uses. Anything else
 * would be a second code path that has to agree with the first by luck.
 */
describe('DefaultPromptInput capability chips', () => {
  const chipFor = (name: string) => screen.queryByRole('button', { name });

  it('chips a checked item that opted in, and removes it through the menu\u2019s own event', () => {
    const onToolSelect = vi.fn();
    render(() => (
      <DefaultPromptInput
        {...baseProps}
        tools={[{ id: 'web', label: 'Web search', icon: 'globe', checked: true, chip: true }]}
        onToolSelect={onToolSelect}
      />
    ));

    const button = screen.getByRole('button', { name: 'Web search, turn off' });
    expect(button).toHaveTextContent('Web search');
    fireEvent.click(button);
    // `checked: false` is the NEW state, which is exactly what the menu reports for the
    // same item — so a host's toggle handler serves both.
    expect(onToolSelect).toHaveBeenCalledWith({ id: 'web', checked: false });
  });

  it('leaves a checked item without `chip` to the menu', () => {
    render(() => (
      <DefaultPromptInput {...baseProps} tools={[{ id: 'web', label: 'Web search', checked: true }]} />
    ));
    // The quiet default: the menu shows the state, the control row stays clean.
    expect(chipFor('Web search, turn off')).not.toBeInTheDocument();
  });

  it('does not chip an item that opted in while it is OFF', () => {
    render(() => (
      <DefaultPromptInput {...baseProps} tools={[{ id: 'web', label: 'Web search', checked: false, chip: true }]} />
    ));
    expect(chipFor('Web search, turn off')).not.toBeInTheDocument();
  });

  it('renders the chip inside the leading cluster, which stays ONE item', () => {
    const { container } = render(() => (
      <DefaultPromptInput {...baseProps} tools={[{ id: 'web', label: 'Web search', checked: true, chip: true }]} />
    ));
    const leading = container.querySelector('[data-cluster="leading"]') as HTMLElement;
    const button = screen.getByRole('button', { name: 'Web search, turn off' });

    expect(leading.contains(button)).toBe(true);
    // One group div and nothing else: the frame lays out the GROUP, and a second item
    // here would change what its `justify-between` distributes on the wrapped row.
    expect(leading.querySelectorAll(':scope > div')).toHaveLength(1);
    // And that group holds its width, on both sides: the cluster above contributes no
    // box, so the group IS the item the frame squeezes when the groups alone outgrow the
    // row. See the group's own comment for what the hold is and is not for.
    expect((leading.querySelector(':scope > div') as HTMLElement).className).toContain('shrink-0');
  });

  it('does not force the composer open: a chip competes for width like any control', () => {
    // The overflow boundary, stated where it can be read today: both clusters are
    // controls for this purpose, so as chips multiply the text is what gives. It wraps,
    // the composer expands, and the chips move onto the control row below. Nothing
    // clamps and nothing hides, because a hidden capability is worse than a crowded
    // edge. The remaining case is a row whose chips alone are wider than the composer,
    // and the answer there is to pin `expanded` rather than to have the kit choose
    // which capabilities to hide.
    const { container } = render(() => (
      <DefaultPromptInput {...baseProps} tools={[{ id: 'web', label: 'Web search', checked: true, chip: true }]} />
    ));
    // Assert the chip is THERE first. Without this the case passes for the wrong reason:
    // a composer with no chip is trivially collapsed, so it would stay green if the chip
    // never rendered at all — the vacuous-pass shape this file's other cases avoid.
    expect(screen.getByRole('button', { name: 'Web search, turn off' })).toBeInTheDocument();

    const frame = container.querySelector('[data-prompt-input]') as HTMLElement;
    // Still the collapsed row, on the measured padding. A chip that expanded the
    // composer would be a chip the resolver knew about, and it deliberately does not.
    expect(frame.className).toContain('flex-row');
    expect(frame.className).toContain('py-2.5');
  });
});
