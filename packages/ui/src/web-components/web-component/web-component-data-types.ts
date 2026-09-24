/**
 * The data shapes a consumer assigns to a `kai-*` element's array/object properties, when
 * that shape has no Solid-layer twin they could import instead.
 *
 * WHY. The generated `.d.ts` for `./web-components` and the React wrappers expand every prop
 * type STRUCTURALLY, so a consumer's tsc never resolves library `.ts` source (see the
 * `IMPORTS = {}` note in `scripts/gen-web-component-api.mjs`). That is right for the generated
 * files, but it leaves a consumer who wants to name the shape writing
 * `NonNullable<KaiCommandElementProps['items']>`. Every named
 * element-prop type is therefore reachable from the ROOT entry, enforced by
 * `tests/web-components/prop-types-exported.test.ts`. They live here rather than in the
 * facades because a facade compiles to a side-effect entry whose declaration is
 * `export {};`; types WITH a Solid twin stay in their own layer's module and are re-exported
 * from `src/index.ts`. Type-only, so the root barrel pays nothing.
 */

/** A single segment of `<kai-segmented>`.
 *
 *  Distinct from the Solid `SegmentedOption`, whose `icon` is a JSX node: on the
 *  element, `icon` is an icon-NAME string (web-component-friendly): a curated
 *  name (e.g. `"code"`), a URL/data-URI, or plain text, resolved to a glyph via
 *  the kit's icon renderer (the same path `kai-button`'s `icon` uses). */
export interface KaiSegmentedOption {
  value: string;
  label: string;
  icon?: string;
}

/** A single row of `<kai-radio-group>`.
 *
 *  Distinct from the Solid `RadioOption`, whose `label` and `description` are JSX
 *  nodes: on the element both are plain strings, because an element property has to
 *  survive being assigned from HTML/React/Vue/Svelte with no framework in between. */
export interface KaiRadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** A single row of `<kai-checkbox-group>`.
 *
 *  Distinct from the Solid `CheckboxOption`, whose `value` is generic and whose
 *  `label` and `description` are JSX nodes: on the element all three are plain
 *  strings, because an element property has to survive being assigned from
 *  HTML/React/Vue/Svelte with no framework in between. Structurally identical to
 *  `KaiRadioOption`, and kept as its own name anyway: the two elements are free to
 *  diverge, and a consumer typing a checkbox list should not have to import the radio
 *  group's type to do it. */
export interface KaiCheckboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** A single choice in `<kai-select>`.
 *
 *  Distinct from the Solid `SelectOption`, whose `value` is generic: on the element
 *  it is a string, because a native `<option>`'s value is a string and an element
 *  property has to survive being assigned from HTML/React/Vue/Svelte with no
 *  framework in between. `label` defaults to `value`. */
export interface KaiSelectOption {
  value: string;
  label?: string;
  disabled?: boolean;
}

/** A single citation in `<kai-sources>`' `sources` property. Also the shape
 *  `<kai-source>` light-DOM children are parsed into. */
export interface KaiSourceItem {
  href: string;
  title?: string;
  description?: string;
  label?: string;
  showFavicon?: boolean;
}

/** Token-usage data for `<kai-context>`' `context` property. */
export interface KaiContextUsage {
  /** Tokens consumed so far in the context window (drives the meter fill). */
  usedTokens: number;
  /** The model's total context-window size in tokens. */
  maxTokens: number;
  /** Tokens attributed to the prompt/input, shown in the breakdown. */
  inputTokens?: number;
  /** Tokens attributed to the generated output, shown in the breakdown. */
  outputTokens?: number;
  /** Tokens attributed to reasoning/thinking, shown when present. */
  reasoningTokens?: number;
  /** Tokens served from prompt cache, shown when present. */
  cacheTokens?: number;
  /** Estimated cost in dollars for this usage, shown in the footer. */
  estimatedCost?: number;
}

/** One item in `<kai-menu>`'s `items` tree. */
export interface KaiMenuItem {
  /** Emitted in `kai-select` for actionable items. */
  id?: string;
  label?: string;
  /** Named icon (e.g. "paperclip"), image URL / data-URI, or plain text. */
  icon?: string;
  /** The shortcut to display, e.g. `'⌘U'`; shown right-aligned and muted. */
  shortcut?: string;
  /** Presence ⇒ a checkbox item (role=menuitemcheckbox). With `radioGroup` set,
   *  marks the SELECTED radio item in that group instead. */
  checked?: boolean;
  // The item with `checked: true` shows the checkmark; selecting one emits
  // `{ id, radioGroup }`, so the consumer moves it (the consumer owns state, like
  // checkbox items).
  /** Membership in a single-select group (role=menuitemradio); items sharing a value are mutually exclusive. */
  radioGroup?: string;
  disabled?: boolean;
  /** A divider (ignores other fields). */
  separator?: boolean;
  /** A non-interactive section label (uses `label`). */
  heading?: boolean;
  /** ⇒ a submenu. */
  items?: KaiMenuItem[];
}

/**
 * A single command/mention item for `<kai-command>`.
 *
 * Set `items` as a JS property (array ref), not an HTML attribute.
 */
export interface KaiCommandItem {
  /** Unique identifier emitted in `kai-select`. */
  id: string;
  /** Display name shown in the list row. */
  label: string;
  /** Named icon (e.g. "search"), image URL / data-URI, or plain text. */
  icon?: string;
  /** Muted supplementary text (e.g. a file path or a short description). */
  description?: string;
  /** Optional keyboard shortcut shown as right-aligned key caps; uses the
   *  kai-kbd `keys` syntax (e.g. "Mod+K", "Alt+1"). */
  shortcut?: string;
  /** Group name that buckets this item under a section header. */
  group?: string;
}
