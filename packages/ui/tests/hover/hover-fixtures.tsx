import { userEvent } from 'vitest/browser';
import { render } from 'solid-js/web';
import type { JSX } from 'solid-js';
import compiledCss from '../../src/web-components/compiled.css?inline';
import '../../src/web-components/button/button';
import '../../src/web-components/code-block/code-block';
import '../../src/web-components/file-tree/file-tree';
import '../../src/web-components/embed/embed';
import '../../src/web-components/screen/screen';
import '../../src/web-components/artifact/artifact';
import '../../src/web-components/attachments/attachments';
import '../../src/web-components/checkbox/checkbox-group';
import '../../src/web-components/radio/radio-group';
import '../../src/web-components/choice/choice';
import '../../src/web-components/coachmark/coachmark';
import '../../src/web-components/command/command';
import '../../src/web-components/composer/composer';
import '../../src/web-components/conversation/conversation-list';
import '../../src/web-components/conversation/conversation-item';
import '../../src/web-components/menu/menu';
import '../../src/web-components/dropdown/dropdown';
import '../../src/web-components/editable-label/editable-label';
import '../../src/web-components/form/form';
import '../../src/web-components/lightbox/lightbox';
import '../../src/web-components/dock/dock';
import '../../src/web-components/file-upload/file-upload';
import '../../src/web-components/model-switcher/model-switcher';
import '../../src/web-components/nav/nav';
import '../../src/web-components/notice/notice';
import '../../src/web-components/pane/pane';
import '../../src/web-components/pane/pane-group';
import '../../src/web-components/prompt/prompt-suggestions';
import '../../src/web-components/question/question-panel';
import '../../src/web-components/row/row';
import '../../src/web-components/source/source';
import '../../src/web-components/tasks/tasks';
import '../../src/web-components/toast/toast';
import '../../src/web-components/voice-input/voice-input';
import { Card } from '../../src/components/card/card';
import { ToggleChip } from '../../src/components/toggle/toggle-chip';
import { ConversationPanel } from '../../src/components/conversation/conversation-panel';
import { AppHeader } from '../../src/components/app-header/app-header';
import { UserMenu, CommandPaletteTrigger } from '../../src/components/builder/builder-shell-controls';
import { TagEditor } from '../../src/components/builder/builder-panel';

/**
 * THE HOVER-CONTRAST FIXTURE REGISTRY.
 *
 * `covers` lists the component files (relative to packages/ui) whose `hover:bg-*` sites the fixture
 * exercises. `tests/primitives/hover-coverage.test.ts` scans `src/components` for every file carrying a
 * `hover:bg-` class and fails if one is in neither a `covers` list here nor in WAIVERS, so a new hover
 * site cannot ship unmeasured. COVERAGE IS PER FILE: a fixture must hover the controls that file renders,
 * but the scan cannot know that a fixture reaches every site inside a file, so keep fixtures rich.
 *
 * The scan reads this file as TEXT (the unit project is jsdom and must not import the facades), so keep
 * `covers: [...]` and `WAIVERS` as literal string lists.
 */
export interface Fixture {
  covers: string[];
  make: () => HTMLElement | Promise<HTMLElement>;
  /** Runs once mounted and settled, for a state a property cannot reach (an open trigger popup). */
  after?: (el: HTMLElement) => Promise<void>;
}

/** Files with a hover:bg- class that are deliberately NOT measured, and why. A reason is mandatory. */
export const WAIVERS: Record<string, string> = {};

/** Mount a Solid tree with the shipped shadow stylesheet, scheme carried like a facade's wrapper does. */
function solid(view: () => JSX.Element): HTMLElement {
  const host = document.createElement('div');
  host.dataset.solidFixture = '';
  const root = host.attachShadow({ mode: 'open' });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(compiledCss);
  root.adoptedStyleSheets = [sheet];
  const mountPoint = document.createElement('div');
  mountPoint.style.cssText = 'display:contents;color:var(--color-foreground);font-family:system-ui;';
  root.append(mountPoint);
  render(view, mountPoint);
  return host;
}
const el = (tag: string, props: Record<string, unknown> = {}, html = '', attrs: Record<string, string> = {}) => {
  const e = Object.assign(document.createElement(tag), props);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html; // test-authored markup
  return e;
};
const btn = (variant: string) => el('kai-button', {}, 'Label', { variant });
const now = new Date().toISOString();
const convo = (id: string, title: string) => ({ id, title, messageCount: 3, updatedAt: now, lastMessageAt: now });

export const FIXTURES: Record<string, Fixture> = {
  'kai-code-block': {
    covers: ['src/components/code-block/code-block.tsx'],
    make: () => el('kai-code-block', { code: 'const a = 1;', language: 'ts', copy: true }),
  },
  'kai-file-tree': {
    covers: ['src/components/file/file-tree.tsx'],
    make: () =>
      el('kai-file-tree', {
        summary: true,
        defaultExpanded: ['src'],
        files: [
          { path: 'src/a.ts', code: 'a', additions: 2, deletions: 1, status: 'modified' },
          { path: 'src/b.ts', code: 'b', status: 'added' },
          { path: 'README.md', code: 'r' },
        ],
      }),
  },
  'kai-embed': {
    covers: ['src/components/embed/embed.tsx'],
    make: () => el('kai-embed', { data: { provider: 'youtube', id: 'dQw4w9WgXcQ', title: 'A video' } }),
  },
  'kai-screen': {
    covers: ['src/components/screen/screen.tsx'],
    make: () => {
      const s = el('kai-screen', { open: true, back: true, headline: 'Screen' });
      s.style.cssText = 'position:relative;display:block;height:240px;';
      return s;
    },
  },
  'kai-button ghost': { covers: ['src/components/button/button.tsx'], make: () => btn('ghost') },
  'kai-button subtle': { covers: [], make: () => btn('subtle') },
  'kai-button outline': { covers: [], make: () => btn('outline') },
  'kai-artifact': {
    covers: ['src/components/artifact/artifact.tsx'],
    make: () =>
      el('kai-artifact', {
        files: [
          { path: 'index.html', code: '<h1>hi</h1>', language: 'html', type: 'html' },
          { path: 'app.js', code: 'x', language: 'js' },
        ],
        expandable: true,
        openInTab: true,
      }),
  },
  'kai-attachments': {
    covers: ['src/components/attachments/attachments.tsx'],
    make: () =>
      el('kai-attachments', {
        removable: true,
        items: [
          { id: '1', type: 'file', filename: 'notes.txt', mediaType: 'text/plain', url: 'data:text/plain,hi' },
          { id: '2', type: 'file', filename: 'pic.png', mediaType: 'image/png', url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' },
        ],
      }),
  },
  'kai-checkbox-group': {
    covers: ['src/components/checkbox/checkbox-group.tsx'],
    make: () => el('kai-checkbox-group', { options: [{ value: 'a', label: 'Alpha', description: 'First' }, { value: 'b', label: 'Beta' }] }),
  },
  'kai-radio-group': {
    covers: ['src/components/radio/radio.tsx'],
    make: () => el('kai-radio-group', { options: [{ value: 'a', label: 'Alpha', description: 'First' }, { value: 'b', label: 'Beta' }] }),
  },
  'kai-choice': {
    covers: ['src/components/choice-card/choice-card.tsx'],
    make: () =>
      el('kai-choice', {
        data: { prompt: 'Pick one', options: [{ id: 'a', label: 'Alpha', description: 'First' }, { id: 'b', label: 'Beta', description: 'Second' }] },
      }),
  },
  'kai-coachmark': {
    covers: ['src/components/coachmark/coachmark.tsx'],
    make: () => el('kai-coachmark', { open: true, headline: 'New', tone: 'info', dismissible: true }, '<button slot="anchor">Anchor</button>Body copy'),
  },
  'kai-command': {
    covers: ['src/components/command/command.tsx'],
    make: () => el('kai-command', { items: [{ id: 'a', label: 'Alpha', description: 'First', shortcut: 'A' }, { id: 'b', label: 'Beta' }] }),
  },
  'kai-composer': {
    covers: ['src/components/composer/composer.tsx'],
    make: () =>
      el('kai-composer', {
                triggers: [{ char: '@', kind: 'person', items: [{ id: 'a', label: 'Alice' }, { id: 'b', label: 'Bob' }] }],
      }),
    after: async (host) => {
      const editable = host.shadowRoot?.querySelector('[contenteditable]') as HTMLElement | null;
      if (!editable) return;
      await userEvent.click(editable);
      await userEvent.keyboard('@');
    },
  },
  'kai-conversations': {
    covers: ['src/components/conversation/conversation-list.tsx', 'src/components/conversation/conversation-item.tsx'],
    make: () => el('kai-conversations', { conversations: [convo('a', 'Alpha'), convo('b', 'Beta')], activeId: 'a' }),
  },
  'kai-menu': {
    covers: ['src/components/dropdown/dropdown.tsx', 'src/web-components/menu/menu.tsx'],
    make: () =>
      el('kai-menu', {
        open: true,
        triggerLabel: 'Menu',
        items: [{ id: 'a', label: 'Alpha', icon: 'settings' }, { id: 'b', label: 'Check', checked: true, control: 'check' }, { id: 'c', label: 'Beta', shortcut: 'B' }],
      }),
  },
  'kai-menu icon-only': {
    covers: [],
    make: () => el('kai-menu', { triggerIcon: 'settings', label: 'Options', items: [{ id: 'a', label: 'Alpha' }] }),
  },
  'kai-dropdown': {
    covers: ['src/web-components/dropdown/dropdown.tsx'],
    make: () => el('kai-dropdown', { open: true, triggerLabel: 'Dropdown' }, '<div style="padding:8px">Item</div>'),
  },
  'kai-dropdown icon-only': {
    covers: [],
    make: () => el('kai-dropdown', { triggerIcon: 'settings', label: 'Options' }, '<div style="padding:8px">Item</div>'),
  },
  'kai-file-upload': {
    covers: ['src/web-components/file-upload/file-upload.tsx'],
    make: () => el('kai-file-upload', {}),
  },
  'kai-dock': {
    covers: ['src/components/dock/dock.tsx'],
    // Open, so the panel's close control is on screen (its :hover rule lives in an embedded stylesheet).
    make: () => {
      const d = el('kai-dock', { open: true, label: 'Chat' }, '<div style="padding:24px">Panel content</div>');
      return d;
    },
  },
  'kai-question-panel': {
    covers: ['src/components/question/question-option.tsx', 'src/components/question/question-panel.tsx'],
    // Two questions so the tabs, Back and the outline buttons are all drawn; the options carry
    // descriptions so the row hover sits over both text tiers.
    make: () =>
      el('kai-question-panel', {
        focusOnOpen: false,
        questions: [
          { id: 'a', header: 'Scope', question: 'Which part?', kind: 'choice', required: true, options: [{ label: 'One', description: 'first' }, { label: 'Two', description: 'second' }] },
          { id: 'b', header: 'Tone', question: 'How formal?', kind: 'choice', required: true, options: [{ label: 'Casual' }, { label: 'Formal' }] },
        ],
      }),
  },
  'kai-editable-label': {
    covers: ['src/components/editable/editable-label.tsx'],
    make: () => el('kai-editable-label', { value: 'Rename me' }),
  },
  'kai-form': {
    covers: ['src/components/form/form-widgets.tsx'],
    make: () =>
      el('kai-form', {
        data: {
          type: 'object',
          title: 'Form',
          properties: {
            agree: { type: 'boolean', title: 'Agree to terms' },
            tags: { type: 'array', title: 'Tags', items: { type: 'string' }, default: ['one', 'two'] },
            pick: { type: 'string', title: 'Pick', enum: ['x', 'y'] },
          },
        },
      }),
  },
  'kai-lightbox': {
    covers: ['src/components/lightbox/lightbox.tsx'],
    // Opened through its own trigger, the way a person opens it, so the panel lays out as it does in use.
    make: () =>
      el(
        'kai-lightbox',
        { showClose: true, label: 'Preview' },
        '<img alt="Thumb" width="48" height="32" src="data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22160%22%3E%3Crect width=%22240%22 height=%22160%22 fill=%22%23888%22/%3E%3C/svg%3E"><img slot="content" alt="Full" width="240" height="160" src="data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22160%22%3E%3Crect width=%22240%22 height=%22160%22 fill=%22%23888%22/%3E%3C/svg%3E">',
      ),
    after: async (host) => {
      const trigger = host.querySelector('img:not([slot])') as HTMLElement | null;
      if (trigger) await userEvent.click(trigger);
    },
  },
  'kai-model-switcher': {
    covers: ['src/components/model/model-switcher.tsx'],
    make: () => el('kai-model-switcher', { open: true, currentModel: 'a', models: [{ id: 'a', name: 'Alpha', provider: 'P' }, { id: 'b', name: 'Beta', provider: 'P' }] }),
  },
  'kai-nav': {
    covers: ['src/components/nav/nav.tsx'],
    make: () =>
      el('kai-nav', {
        value: 'a',
        items: [
          { id: 'a', label: 'Alpha', icon: 'home', action: { icon: 'plus', label: 'Add' }, closable: true },
          { id: 'b', label: 'Beta', children: [{ id: 'c', label: 'Child' }] },
        ],
      }),
  },
  'kai-notice': {
    covers: ['src/components/notice/notice.tsx'],
    make: () => el('kai-notice', { severity: 'info', dismissible: true }, 'A notice'),
  },
  'kai-pane': {
    covers: ['src/components/pane/pane.tsx'],
    make: () => el('kai-pane', { headline: 'Pane', showSplit: true, showDock: true }, 'Body'),
  },
  'kai-pane-group': {
    covers: ['src/components/pane/pane-group.tsx'],
    make: () => el('kai-pane-group', { active: 'a', tabs: [{ id: 'a', name: 'One' }, { id: 'b', name: 'Two' }] }),
  },
  'kai-suggestions': {
    covers: ['src/components/prompt/prompt-suggestion.tsx'],
    make: () => el('kai-suggestions', { suggestions: ['Explain this', 'Summarise'], variant: 'ghost', layout: 'list' }),
  },
  'kai-row': {
    covers: ['src/components/row/row.tsx'],
    make: () => el('kai-row', { interactive: true, chevron: true }, 'Row label'),
  },
  'kai-source': {
    covers: ['src/components/source/source.tsx'],
    make: () => el('kai-source', { href: 'https://example.com/a', label: 'example.com', headline: 'A page', description: 'About it' }),
  },
  'kai-tasks': {
    covers: ['src/components/tasks/tasks-card.tsx'],
    make: () =>
      el('kai-tasks', {
        data: { mode: 'select', heading: 'Tasks', tasks: [{ id: 'a', label: 'Alpha', description: 'First' }, { id: 'b', label: 'Beta', checked: true }], selectAll: true },
      }),
  },
  'kai-toast-region': {
    covers: ['src/components/toast/toast.tsx'],
    make: () =>
      el('kai-toast-region', {
        toasts: [{ id: '1', message: 'Saved', variant: 'success', action: { label: 'Undo' }, dismissible: true }],
        appearance: 'card',
      }),
  },
  'kai-voice-input': {
    covers: ['src/components/voice/voice-input.tsx'],
    make: () => el('kai-voice-input', { transcribe: async () => 'hi' }),
  },
  // Solid-only components: no facade renders them, so they mount under the shipped stylesheet directly.
  'Card (solid)': {
    covers: ['src/components/card/card.tsx'],
    make: () => solid(() => <Card heading="Card" description="Body" dismissible clickable onCardClick={() => {}} />),
  },
  'ToggleChip (solid)': {
    covers: ['src/components/toggle/toggle-chip.tsx'],
    make: () =>
      solid(() => (
        <div style="display:flex;gap:8px">
          <ToggleChip pressed={false}>Off</ToggleChip>
          <ToggleChip pressed>On</ToggleChip>
        </div>
      )),
  },
  'ConversationPanel (solid)': {
    covers: ['src/components/conversation/conversation-panel.tsx'],
    make: () =>
      solid(() => (
        <div style="width:360px;height:320px;position:relative">
          <ConversationPanel conversations={[convo('a', 'Alpha'), convo('b', 'Beta')]} activeId="a" onSelect={() => {}} onNewChat={() => {}} />
        </div>
      )),
  },
  'AppHeader (solid)': {
    covers: ['src/components/app-header/app-header.tsx'],
    make: () =>
      solid(() => (
        <AppHeader title="App" showSearch onSearch={() => {}} showThemeToggle dark={false} onToggleDark={() => {}} user={{ name: 'Ada Lovelace', plan: 'Pro' }} onUserMenuSelect={() => {}} />
      )),
  },
  'Builder shell controls (solid)': {
    covers: ['src/components/builder/builder-shell-controls.tsx'],
    make: () =>
      solid(() => (
        <div style="width:260px;display:flex;flex-direction:column;gap:8px">
          <UserMenu name="Ada Lovelace" plan="Pro" />
          <CommandPaletteTrigger onOpen={() => {}} />
        </div>
      )),
  },
  'Builder TagEditor (solid)': {
    covers: ['src/components/builder/builder-panel.tsx'],
    make: () => solid(() => <TagEditor ariaLabel="Tags" tags={['one', 'two']} onChange={() => {}} />),
  },
};
