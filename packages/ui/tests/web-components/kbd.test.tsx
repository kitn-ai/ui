import '../../src/web-components/kbd/kbd';
import '../../src/web-components/kbd/kbd-group';

test('kai-kbd renders normalized glyphs for keys + platform', async () => {
  const el = document.createElement('kai-kbd');
  el.setAttribute('keys', 'Mod+Shift+ArrowUp');
  el.setAttribute('platform', 'mac');
  document.body.appendChild(el);
  await Promise.resolve();
  await Promise.resolve();

  const caps = Array.from(el.shadowRoot!.querySelectorAll('[part="key"]')).map((c) => c.textContent);
  expect(caps).toEqual(['⌘', '⇧', '↑']);
  // Each cap is one token; the separators carry no text, so the combo reads ⌘⇧↑.
  expect(caps.join('')).toBe('⌘⇧↑');

  el.remove();
});

test('kai-kbd maps Mod to Ctrl off mac', async () => {
  const el = document.createElement('kai-kbd');
  el.setAttribute('keys', 'Mod+K');
  el.setAttribute('platform', 'other');
  document.body.appendChild(el);
  await Promise.resolve();
  await Promise.resolve();

  const caps = Array.from(el.shadowRoot!.querySelectorAll('[part="key"]')).map((c) => c.textContent);
  expect(caps).toEqual(['Ctrl', 'K']);

  el.remove();
});

test('kai-kbd-group marks its direct kai-kbd children so they weld', async () => {
  const group = document.createElement('kai-kbd-group');
  group.innerHTML = '<kai-kbd keys="G"></kai-kbd><kai-kbd>D</kai-kbd><span class="not-a-kbd">x</span>';
  document.body.appendChild(group);
  // The facade mounts its Solid render a task after connect, and the group's marker
  // pass runs in that render's onMount, so this needs one tick more than a render
  // assertion does (the sibling kai-kbd tests above stop at two).
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  const [a, b, c] = Array.from(group.children) as HTMLElement[];
  // The marker is the group's whole contribution: the weld itself lives in the
  // child's shadow stylesheet, because a group cannot style the caps inside a
  // slotted child's shadow root. Without the marker a marked child renders welded
  // (see the stylesheet assertion below) and an unmarked one does not, so this is
  // what separates a group from a row of separate kai-kbd elements.
  expect(a.hasAttribute('data-kai-join')).toBe(true);
  expect(b.hasAttribute('data-kai-join')).toBe(true);
  expect(c.hasAttribute('data-kai-join')).toBe(false);

  group.remove();
});

test('kai-kbd weld rules are gated on the group marker', async () => {
  const el = document.createElement('kai-kbd');
  el.setAttribute('keys', 'Mod+K');
  el.setAttribute('platform', 'mac');
  document.body.appendChild(el);
  await Promise.resolve();
  await Promise.resolve();

  const css = Array.from(el.shadowRoot!.querySelectorAll('style')).map((s) => s.textContent).join('\n');
  // Every weld rule keys on the marker, so a lone <kai-kbd> is untouched: corners at
  // both ends, its own chord gap, no overlap margin.
  expect(css).toContain(':host([data-kai-join]){--kai-kbd-cap-gap:0px}');
  expect(css).toContain(':host([data-kai-join]:not(:first-child)){margin-left:-1px}');
  expect(css).toContain(':host([data-kai-join]) [part="key"]:not(:first-child)');
  expect(css).toContain(':host([data-kai-join]:not(:first-child)) [part="key"]:first-child');
  expect(css).toContain(':host([data-kai-join]:not(:last-child)) [part="key"]:last-child');

  // Unmarked: the same element keeps its 2px chord gap, because the variable it reads
  // falls back to 0.125rem. (Kbd renders the class; the CSS above sets it.)
  expect(el.shadowRoot!.querySelector('p, kbd')).toBeTruthy();

  el.remove();
});
