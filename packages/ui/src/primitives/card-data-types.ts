// The five built-in card PAYLOAD types (`CardEnvelope.data`, one per card type), authored
// beside the schemas they mirror rather than inside the components that render them.
//
// WHY A SEPARATE MODULE: `tsconfig.mcp.json` is Node-only (`lib: ["ESNext"]`, no `jsx`), and
// a type import still has to RESOLVE even though it erases. While these types lived under
// `components/`, any Node/no-DOM project that named one failed with `TS6142: ... but '--jsx'
// is not set`, so `@kitn.ai/ui/schemas`, the server-safe entry that exists precisely so a
// route can hand a model tool definitions, could not re-export them: Python and Go read
// `./schemas/*.json` and get the full shape, while a TypeScript backend got `data: unknown`.
// Relaxing `tsconfig.mcp.json` is not the alternative and that is measured rather than
// recalled: granting it `jsx: "preserve"` takes it from 0 errors to 130 on this case.
//
// WHY `type` ALIASES AND NOT `interface`s: TypeScript gives an object type alias an implicit
// index signature and gives an interface none, and every card element's `data` prop is a
// `Record<string, unknown>` at some point in the chain, so as interfaces these types were not
// assignable to the very property their own doc tells a consumer to assign them to.
//
// Types only, and only types with no DOM and no Solid below them, because `tsc --noEmit -p
// tsconfig.mcp.json` on a tree with no `dist/` is the evidence the boundary holds.

import type { CardEnvelope } from './card-contract';

// ─────────────────────────────────────────────────────────────────────────────
// confirm (confirm.schema.json)
// ─────────────────────────────────────────────────────────────────────────────

export type ConfirmActionStyle = 'primary' | 'default' | 'destructive';
export type ConfirmTone = 'default' | 'warning' | 'danger';

export type ConfirmAction = {
  id: string;
  label: string;
  style?: ConfirmActionStyle;
  payload?: unknown;
  default?: boolean;
};

export type ConfirmCardData = {
  heading?: string;
  body?: string;
  tone?: ConfirmTone;
  actions: ConfirmAction[]; // 1..4
  dismissible?: boolean;
};

export type ConfirmCardEnvelope = CardEnvelope<'confirm', ConfirmCardData>;

// ─────────────────────────────────────────────────────────────────────────────
// choice (choice.schema.json)
// ─────────────────────────────────────────────────────────────────────────────

export type ChoiceOptionMedia = {
  image?: string;
  imageAlt?: string;
  icon?: string;
};

export type ChoiceOption = {
  id: string; // required, unique within the card
  label: string; // required
  description?: string;
  media?: ChoiceOptionMedia;
  meta?: string; // trailing freeform text (e.g. price/badge)
  recommended?: boolean; // renders a "Recommended" pill
  disabled?: boolean; // not selectable; skipped in keyboard nav
  payload?: unknown; // echoed back in the emitted action
};

export type ChoiceAllowOther = boolean | { label?: string; placeholder?: string };

export type ChoiceCardData = {
  prompt?: string; // optional question/body above the options
  options: ChoiceOption[]; // 1..N
  allowOther?: ChoiceAllowOther; // free-text escape
  submitLabel?: string; // label for the Submit button (default 'Submit')
  dismissible?: boolean; // show a close affordance that emits `dismiss`
};

export type ChoiceCardEnvelope = CardEnvelope<'choice', ChoiceCardData>;

// ─────────────────────────────────────────────────────────────────────────────
// tasks (tasks.schema.json)
// ─────────────────────────────────────────────────────────────────────────────

export type TasksTask = {
  id: string;
  label: string;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
};

export type TasksCardData = {
  // Both modes share one selection model (toggle by id, the `max` gate,
  // `kai-value-change`), and `progress` is purely a presentational variant: it checks a
  // row as the terminal action and renders no confirm button, a header `done / total`
  // count, circular indicators and a per-item title with a muted description.
  /** Whether the card confirms with a button or completes as rows are checked; confirms by default. */
  mode?: 'select' | 'progress';
  heading?: string;
  tasks: TasksTask[]; // >=1
  selectAll?: boolean;
  confirmLabel?: string;
  allowEmpty?: boolean;
  min?: number;
  max?: number;
  dismissible?: boolean; // show a close affordance that emits `dismiss`
};

export type TasksCardResult = {
  selected: string[];
};

export type TasksCardEnvelope = CardEnvelope<'tasks', TasksCardData>;

// ─────────────────────────────────────────────────────────────────────────────
// form (form.schema.json)
// ─────────────────────────────────────────────────────────────────────────────

/** A field definition (the JSON Schema subset kai-form renders). */
export type FormField = {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  format?: 'email' | 'uri' | 'url' | 'date' | 'date-time' | 'time';
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  items?: FormField | { enum: unknown[] };
  properties?: Record<string, FormField>;
  required?: string[];
  readOnly?: boolean;
  'x-kai-widget'?:
    | 'textarea'
    | 'slider'
    | 'rating'
    | 'radio'
    | 'select'
    | 'checkbox'
    | 'password'
    | 'switch';
  'x-kai-placeholder'?: string;
  'x-kai-step'?: number;
  // NOT the JSON Schema `format` keyword, and deliberately not an extension of it: `format`
  // has a registered vocabulary with assertion semantics, `widgetFor()` switches on it to pick
  // a widget and `toJsonSchema()` turns it into a validation pattern. This is a UI hint in the
  // `x-kai-*` namespace, and it selects FORMATTING, never a widget.
  //
  // A value arriving from a MODEL is untrusted: `resolveFieldMask()` degrades an unrecognised
  // one to an unmasked text field with a console warning rather than trusting the declaration.
  //
  // SPELLED OUT RATHER THAN IMPORTED, and that is not laziness: `FieldSemanticType` lives in
  // `./field-semantics`, which carries the semantics table and its `console.warn`, and this
  // file exists so a Node/no-DOM backend can name a card payload with `lib: ["ESNext"]` and
  // `types: []`, where `console` does not exist (TS2584, caught by
  // `tests/schemas/card-data-types-node-safe.test.ts`). A type import still has to resolve, so
  // it is a REGISTERED COPY of `FIELD_SEMANTIC_TYPES`, pinned mutually assignable in
  // `tests/components/form-field-formats.test.tsx`.
  //
  // An app cannot pin this on the MODEL today: `cardTools({ require })` narrows by dot-path and
  // no path reaches a form FIELD, so the enum makes it LIKELY rather than guaranteed.
  /** Display format for a string field. Selects formatting, never a widget; the built-in masking types submit digits only. */
  'x-kai-format'?: 'tel' | 'ssn' | 'credit-card' | 'custom';
  // The pattern engine caps the length, not this field.
  /** The mask pattern, read only when the format hint is `custom`: `#` digit, `@`
   *  alphanumeric, `*` obscurable, every other character literal. */
  'x-kai-mask'?: string;
  /** Aligned with the mask pattern; a misaligned one is dropped with a warning.
   *  Derives the guide from the pattern when absent. */
  'x-kai-mask-guide'?: string;
};

/** The form definition = CardEnvelope.data for type:'form'. */
export type FormDefinition = {
  type: 'object';
  title?: string;
  description?: string;
  required?: string[];
  properties: Record<string, FormField>;
  'x-kai-order'?: string[];
  'x-kai-inlineMax'?: number;
  'x-kai-submitLabel'?: string;
  'x-kai-dismissible'?: boolean;
  'x-kai-actions'?: { id: string; label: string; variant?: 'default' | 'ghost' | 'outline' }[];
};

export type FormCardEnvelope = CardEnvelope<'form', FormDefinition>;

// ─────────────────────────────────────────────────────────────────────────────
// artifact (artifact.schema.json)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One file behind an artifact card: the Code tab's tree row, plus where the
 * preview loads it.
 *
 * The SAME declaration the `FileTree` primitive uses: `components/file/file-tree.tsx`
 * re-exports this as `FileTreeFile` and `components/artifact/artifact.tsx` aliases that to
 * `ArtifactFile`, so there is one shape here and not a copy of one. It is authored
 * in this file rather than in file-tree.tsx for this module's whole reason: it is
 * reachable from `ArtifactCardData`, so leaving it in a `.tsx` would put TS6142
 * back on any Node/no-DOM project that names an artifact card payload, and the
 * extraction would have moved four of five types and quietly failed on the fifth.
 * It mirrors `artifact.schema.json`'s `files[].items`, which carries the same
 * fields with `additionalProperties: false`.
 */
export type ArtifactCardFile = {
  /** Tree label/key. Folders are built from `/`-delimited segments. */
  path: string;
  /** Where the preview loads it (CDN/S3/dev-server/API). */
  url?: string;
  /** Source for the Code tab. */
  code?: string;
  /** Language id for syntax highlighting (e.g. `html`, `css`, `tsx`). */
  language?: string;
  /** Kind, driving the icon and whether Code applies. */
  type?: 'html' | 'pdf' | 'image' | 'other';
  /** Lines added vs the base. Rendered as a trailing `+N` stat (success hue,
   *  tabular-nums). Only shown when present; omit for a plain file row. */
  additions?: number;
  /** Lines removed vs the base. Rendered as a trailing `-N` stat (error hue). */
  deletions?: number;
  // The conventional VCS hue: added=green, modified=amber, deleted=red, renamed=blue,
  // untracked=muted.
  /** Change status vs the base, drawn as a trailing letter. Only shown when present. */
  status?: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';
};

/** Which view an artifact card opens on. */
export type ArtifactCardTab = 'preview' | 'code';

/** The `artifact` card payload: a deliberately NARROW subset of `ArtifactProps`.
 *
 *  A card envelope is written by a model, so the surface it can reach has to be
 *  the part that describes WHAT to show, not how the viewer behaves. Toolbar
 *  composition (`showNav`/`showTabs`/…), view-state (`maximized`), the iframe
 *  `sandbox` and the imperative `controllerRef` are all host concerns and stay
 *  off the wire: a model must not be able to widen its own sandbox or hide the
 *  chrome the user needs to inspect what it built. */
export type ArtifactCardData = {
  /** URL the preview iframe frames. */
  src?: string;
  /** Files for the Code tab's tree (+ each file's preview `url`). */
  files?: ArtifactCardFile[];
  // Seed only, and deliberately so. This card exists to be revised -- `addCard` upserts on
  // `envelope.id` -- and a revision hands the same live component a new envelope. Were this
  // wired to `Artifact`'s CONTROLLED `tab` prop, every revision would re-assert it and yank
  // a user who had switched views back to the model's choice. A model cannot move the user
  // between tabs after the first render; the user's choice wins.
  /** Which view the card opens on. Defaults to `'preview'`. */
  tab?: ArtifactCardTab;
  // Seed only, for the same reason as `tab`, but achieved differently: `Artifact` has a
  // `defaultTab` prop to seed the tab and no `defaultActiveFile` counterpart, so this is
  // read ONCE via `untrack` at setup and handed over as a static value. That leaves
  // `Artifact`'s unconditional `createEffect(() => setActiveFile(local.activeFile))` with
  // nothing reactive to track, so it runs once instead of resetting the user's selection on
  // every revision. Keep it static: passing `props.data.activeFile` straight through would
  // silently restore that bug.
  /** Path of the file selected in the tree when the card first renders. */
  activeFile?: string;
  /** Friendly address shown INSTEAD of the real url. Use when `src` is not
   *  consumer-facing (e.g. a `data:` blob) so a clean address is shown. */
  displayUrl?: string;
  /** Frame height. A bare number is px; a string is any CSS length. Defaults to
   *  `DEFAULT_ARTIFACT_CARD_HEIGHT`. */
  height?: number | string;
};

export type ArtifactCardEnvelope = CardEnvelope<'artifact', ArtifactCardData>;
