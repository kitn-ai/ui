// Real-Chromium axe pin for the accessible name a consumer puts on a form facade's HOST.
//
// jsdom's unit twin (`tests/web-components/forwarded-name.test.tsx`) proves the attribute lands
// on the inner control. This proves the outcome the attribute exists for: axe, walking the
// composed tree the way a browser does, finds the control NAMED. `label` (an unnamed form
// control) is the rule that failed before the fix, so it is run explicitly and on its own, and
// the negative control below shows it does fire on an unlabelled facade, which is what keeps a
// green run from being a scan that never saw the control.
import { afterEach, describe, expect, it } from 'vitest';
import axe from 'axe-core';
import '../../src/web-components/input/input';
import '../../src/web-components/search/search';
import '../../src/web-components/select/select';
import '../../src/web-components/slider/slider';
import '../../src/web-components/checkbox/checkbox';
import '../../src/web-components/switch/switch';
import '../../src/web-components/segmented/segmented';

const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));
afterEach(() => { document.body.innerHTML = ''; });

const RULES = ['label', 'aria-input-field-name', 'aria-toggle-field-name'];
const TAGS = ['kai-input', 'kai-search', 'kai-select', 'kai-slider', 'kai-checkbox', 'kai-switch'] as const;

async function scan(html: string) {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  await tick();
  const r = await axe.run(host, { runOnly: { type: 'rule', values: RULES } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' >> ')).join(' | ')}`);
}

describe('a named facade passes axe; an unnamed one does not', () => {
  for (const tag of TAGS) {
    // Only where axe can see the gap: kai-search's placeholder, kai-select's option list and
    // kai-switch's button content each hand axe a fallback name, so no control exists for those.
    if (['kai-input', 'kai-slider', 'kai-checkbox'].includes(tag)) {
      it(`${tag}: NEGATIVE CONTROL, no name -> axe fires`, async () => {
        expect((await scan(`<${tag}></${tag}>`)).length).toBeGreaterThan(0);
      });
    }
    it(`${tag}: aria-label -> named`, async () => {
      expect(await scan(`<${tag} aria-label="Thing"></${tag}>`)).toEqual([]);
    });
    it(`${tag}: aria-labelledby -> named`, async () => {
      expect(await scan(`<span id="lbl">Thing</span><${tag} aria-labelledby="lbl"></${tag}>`)).toEqual([]);
    });
  }

  it('kai-segmented: the group carries the name', async () => {
    const host = document.createElement('div');
    host.innerHTML = '<kai-segmented aria-label="View"></kai-segmented>';
    document.body.append(host);
    const seg = host.firstElementChild as HTMLElement & { options: unknown };
    seg.options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
    await tick();
    expect(seg.shadowRoot!.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('View');
  });
});
