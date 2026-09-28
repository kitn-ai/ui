/**
 * assistant, the composer's chrome.
 *
 * WHAT IT HOLDS, and it is one concern: the two shapes the composer binds - an
 * `EntityTrigger` (`/` for skills, `@` for agents) and a `ComposerTool` (one
 * entry of the `+` menu) - the sample trigger list a consumer deletes, the
 * projection that builds that menu from the two capability flags State carries,
 * and `toolInsertText`, which reads a chosen row's id back through the SAME
 * trigger list so a `/` pill and a menu row cannot disagree about what a skill
 * expands to. It was split out of assistant.controller.ts for size alone: the
 * controller was the block's one two-thousand-line file, and the composer's menu
 * and triggers are the seam a consumer replacing the composer meets first.
 * Nothing here changed except the `export` the three declarations the controller
 * now imports had to gain - the same code, in a file named for what it holds.
 *
 * WHY IT IMPORTS NOTHING FROM ITS IMPORTER AT RUNTIME. This module is inlined
 * into the single-file paste form at the second level (the entry, then what the
 * entry imports), and the inliner REFUSES a relative import from there by name:
 * a module graph rebuilt by concatenation works until it does not. So everything
 * this module would otherwise reach back for travels IN: the two capability
 * flags arrive as `projectTools`' one argument. The `import type` below is a
 * type import on purpose, and it is not a loophole being leaned on: esbuild
 * erases it before the inliner ever reads this file, so the emitted module
 * imports nothing from the controller at all.
 */
import type { AssistantState } from './assistant.controller';

/** One entry of an entity trigger's menu. Mirrors the kit's TriggerItem
 *  (`@kitn.ai/ui`'s composer) structurally, declared here as the block's own
 *  shape: State carries it, and the kit's composer prop is typed structurally,
 *  so the two agree without the block reaching into the kit's internals. */
export interface EntityTriggerItem {
  id: string;
  label: string;
  /** An IMAGE SOURCE for a chip-kind item: a URL or data URI, because the kit
   *  renders it as `<img src>`. A skill or agent needs none -- those pills carry
   *  their kind's sigil and the menu row its kind's glyph. */
  icon?: string;
  /** Muted second line in the trigger menu. */
  description?: string;
  /** What the pill EXPANDS to on submit, when that differs from the label. */
  promptText?: string;
}

/** A `char`-triggered entity menu in the composer: `/` for skills, `@` for
 *  agents (the kit's own convention: `kindSigil` maps `skill` to `/` and
 *  `agent` to `@`). */
export interface EntityTrigger {
  char: string;
  kind: string;
  items?: EntityTriggerItem[];
}

// SAMPLE DATA, THREE OF EACH, AND DELETE THEM: a consumer's real skills and
// agents come from their own registry, and these exist so the trigger menus
// have something to demonstrate. The `promptText` on a skill is the interesting
// half: the pill reads `/summarize` in the composer and the SENT message carries
// the expansion (the composer flattens an entity to `promptText ?? label`).
//
// THE TWO KINDS ARE THE KIT'S, and that is what makes the pills read: `skill`
// is the `/` kind and `agent` is the `@` kind, and each has a "light" pill with
// its own sigil and a built-in glyph in the trigger menu (composer-dom.ts's
// `kindSigil` / `kindGlyph`). A kind outside that vocabulary gets the richer
// CHIP branch instead, which resolves an icon: the item's own `icon` first,
// and that prop is an IMAGE SOURCE (an <img src>), never an icon name. So the
// items below carry no `icon` at all -- a Lucide name there renders a broken
// image, and the kind's own glyph is the better signal anyway.
export const TRIGGERS: EntityTrigger[] = [
  {
    char: '/',
    kind: 'skill',
    items: [
      { id: 'sample-summarize', label: 'summarize', description: 'Summarize the open document', promptText: 'Summarize the document we are reading.' },
      { id: 'sample-outline', label: 'outline', description: 'Outline a document', promptText: 'Outline the main sections of the document.' },
      { id: 'sample-answer', label: 'answer', description: 'Answer from the attached files', promptText: 'Answer using only the attached files.' },
    ],
  },
  {
    char: '@',
    kind: 'agent',
    items: [
      { id: 'sample-metrics', label: 'q3-metrics.pdf', description: 'Sample file, three pages' },
      { id: 'sample-board-deck', label: 'board-deck.md', description: 'Sample file' },
      { id: 'sample-handbook', label: 'team-handbook.md', description: 'Sample file' },
    ],
  },
];

/** One entry of the composer's `+` menu. Declared here for the reason `MenuItem`
 *  is: the block hands the kit its own object and the kit types the prop by
 *  shape, so the two agree without the block importing anything the paste form
 *  cannot inline.
 *
 *  The fields below are the composer menu's whole vocabulary, which is what makes
 *  this list worth reading: `items` makes a submenu, `checked` makes a toggle
 *  (`control: 'switch'` draws it as a switch rather than a checkmark), `heading`
 *  and `separator` are the section label and the divider, `note` is a
 *  non-interactive sentence (a disabled row's reason), `description` is the muted
 *  second line, and `disabled` marks a row that is visibly unavailable. */
export interface ComposerTool {
  id?: string;
  label?: string;
  icon?: string;
  description?: string;
  shortcut?: string;
  checked?: boolean;
  control?: 'check' | 'switch';
  disabled?: boolean;
  separator?: boolean;
  heading?: boolean;
  note?: true;
  items?: ComposerTool[];
  /** Also show this entry's ON state as a removable chip in the composer's row,
   *  so a capability is visible without opening the menu. Off unless asked for,
   *  which is why the kit's default stays quiet. */
  chip?: boolean;
}

/** What a menu row writes into the composer. The id is `skill:<item id>` or
 *  `file:<item id>`, and the payload comes from the SAME `TRIGGERS` list the `/`
 *  and `@` pickers use, so the two cannot drift: a skill expands to its
 *  `promptText` exactly as submitting a `/` pill would, and a file becomes the
 *  `@` mention the agent trigger would have written. */
export function toolInsertText(id: string): string | undefined {
  const at = id.indexOf(':');
  if (at < 0) return undefined;
  const kind = id.slice(0, at);
  if (kind !== 'skill' && kind !== 'file') return undefined;
  const trigger = TRIGGERS.find((t) => t.kind === (kind === 'file' ? 'agent' : 'skill'));
  const item = trigger?.items?.find((i) => i.id === id.slice(at + 1));
  if (!item) return undefined;
  return kind === 'file' ? `@${item.label}` : item.promptText;
}

/** The composer's `+` menu. Tree-shaped rather than a flag per capability,
 *  because the menu is the one surface that can hold sections, submenus and a
 *  toggle's own state together - and this list is meant to be read as much as
 *  used: between them the entries are the menu's whole vocabulary, so a reader
 *  can see each shape, delete what they do not need and add their own.
 *
 *  EVERY ENTRY EITHER DOES SOMETHING OR IS VISIBLY DISABLED WITH ITS REASON. A
 *  row that looked live and did nothing is the one thing a template must never
 *  teach, because a reader copies it. `shortcut` is deliberately absent for the
 *  same reason: nothing here has a key to press, and a shortcut chip that does
 *  nothing is that same lie in smaller type. */
export function projectTools(state: Pick<AssistantState, 'density' | 'codeHighlight'>): ComposerTool[] {
  const skills = TRIGGERS.find((t) => t.kind === 'skill')?.items ?? [];
  const files = TRIGGERS.find((t) => t.kind === 'agent')?.items ?? [];
  return [
    // "Add files or photos" is NOT declared here: the composer prepends its own
    // file item whenever attachments are enabled, so a second one would be a
    // picker wired to nothing.
    {
      id: 'highlighting',
      label: 'Highlighting',
      icon: 'code',
      description: 'Colour code blocks in replies',
      checked: state.codeHighlight,
      chip: true,
    },
    {
      id: 'density',
      label: 'Compact spacing',
      icon: 'sliders-horizontal',
      description: 'Tighter rhythm between turns',
      checked: state.density === 'compact',
      control: 'switch',
    },
    { separator: true },
    { heading: true, label: 'Insert' },
    {
      id: 'skills',
      label: 'Skills',
      icon: 'sparkles',
      description: 'Reusable prompts for this assistant',
      items: skills.map((s) => ({
        id: `skill:${s.id}`,
        label: s.label,
        description: s.description,
      })),
    },
    {
      id: 'files',
      label: 'Files',
      icon: 'file-text',
      description: 'Mention a document in the thread',
      items: files.map((f) => ({
        id: `file:${f.id}`,
        label: f.label,
        description: f.description,
      })),
    },
    { separator: true },
    // The shape for a capability this app does not have yet: a row that cannot
    // act, with its reason in the sentence beneath it rather than in a tooltip.
    {
      id: 'add-url',
      label: 'Add from a URL',
      icon: 'link',
      description: 'Fetch a page into the turn',
      disabled: true,
    },
    {
      id: 'add-url-why',
      note: true,
      label: 'Not in this template: add a fetch step to your transport',
    },
  ];
}
