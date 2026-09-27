import { For, Show } from 'solid-js';
import { PromptInput, PromptInputTextarea } from './prompt-input';
import { ComposerChips, chipItems } from './composer-chips';
import type { TriggerDef, ComposerChange } from '../composer/composer';
import { type ComposerDoc, normalizeValue, serializeToText } from '../../primitives/composer-model';
import { PromptSuggestion } from './prompt-suggestion';
import { Button } from '../button/button';
import { Tooltip } from '../tooltip/tooltip';
import { Globe, Mic, Plus, Square } from 'lucide-solid';
import { Dropdown, DropdownTrigger, DropdownContent } from '../dropdown/dropdown';
import { DropdownItems } from '../dropdown/dropdown-items';
import type { KaiMenuItem } from '../../web-components/web-component/web-component-data-types';
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
  type AttachmentData,
} from '../attachments/attachments';
import { actionIcon } from '../action-icons/action-icons';
import type { CustomAction } from '../../web-components/chat/chat-types';
// The LEAF module, deliberately not the `../wire` barrel: this needs the media
// declaration, and importing the barrel would pull the whole stream adapter into
// the web-components bundle for a table of strings. Sharing the module itself (rather
// than copying the list into the composer) is the entire point -- a second list
// here is the drift this design exists to prevent.
import { resolveMediaPolicy, type MediaTypeFilter } from '../../wire/media-types';
// Also a leaf, and imported for the same reason: when the browser cannot name a
// file, the question "can this be sent?" is answered by decoding its bytes, and
// this module is where that decode already lives. Asking IT rather than growing
// a second decoder here is what keeps the composer's answer and the encoder's
// answer the same answer, byte for byte, instead of two that agree today.
import { classifyAttachment } from '../../wire/files';

/** One file the composer refused, as facts rather than as a message. The kit
 *  says what happened; the application decides what the user reads. */
export interface RejectedAttachment {
  filename: string;
  // An empty one is not by itself why a file was rejected: an unnamed file is decided by
  // decoding its bytes, so `''` here means the decode is what said no (binary), or that
  // the `accept` filter left no text type for it to land in.
  /** The browser's media type for the file, or `''` when it could not tell. */
  mediaType: string;
  /** Why the file was refused: excluded by your `accept` filter, or a type no API accepts as message content. */
  reason: 'filtered' | 'unsupported';
}

/** A tool the host declares for the composer's `+` menu. `chip` is the ONE field
 *  `<kai-menu>` does not read: the composer's chip row reads it to decide whether an
 *  active item also shows as a chip in the control row, and the menu ignores it. It lives
 *  here rather than on `KaiMenuItem` so the menu's own item type does not carry a field
 *  that only one caller reads. */
export interface ComposerToolItem extends KaiMenuItem {
  /** Ask the composer to also show this item's state as a removable chip in the
   *  control row. Ignored by `<kai-menu>`. */
  chip?: boolean;
}

// Reported once per process, like `resolveThreadDensity`'s latch: the mistake is a static
// authoring one, and a component that re-renders per keystroke must not repeat itself.
const reportedTools = new Set<string>();

/** The `tools` tree, with the untyped boundary handled the way the kit handles its other
 *  array props.
 *
 *  WHY THIS EXISTS AT ALL. `tools` is declared on the elements so it is observable, and
 *  that declaration is what lets an ATTRIBUTE reach it, where an array cannot travel, so
 *  what arrives is a string. Nothing downstream would notice: `buildComposerTools` would
 *  spread that string's characters into the menu, and `chipItems` would walk them. The
 *  result is a nonsense menu rather than a missing one, which is exactly the silent
 *  wrong-ness a boundary check is for. Not an array means reported once, then absent. */
function resolveTools(value: unknown): ComposerToolItem[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value as ComposerToolItem[];
  if (!reportedTools.has('tools')) {
    reportedTools.add('tools');
    console.error(
      'tools: expected an array of items; rendering the built-in rows only. An array cannot travel as an attribute, so set the property instead (`el.tools = [...]`).',
    );
  }
  return undefined;
}

/** The id of the built-in file item, so a host can recognise it in its own tree. */
export const COMPOSER_FILE_ITEM_ID = 'files';

/** The `+` menu's tree: the built-in file item, then the host's items verbatim. Exported
 *  so the assembly is tested without rendering anything. */
export function buildComposerTools(options: {
  attach: boolean;
  tools?: ComposerToolItem[];
}): KaiMenuItem[] {
  const host = options.tools ?? [];
  if (!options.attach) return host;
  const fileItem: KaiMenuItem = {
    id: COMPOSER_FILE_ITEM_ID,
    label: 'Add files or photos',
    icon: 'paperclip',
  };
  // The separator is DERIVED from the tree rather than declared by the host, and derived
  // only when the host's own tree does not already open with one. Two dividers in a row is
  // the same defect as a divider with nothing above it, for exactly the input this rule
  // exists to guard.
  const needsDerivedSeparator = host.length > 0 && host[0].separator !== true;
  return needsDerivedSeparator ? [fileItem, { separator: true }, ...host] : [fileItem, ...host];
}

export interface DefaultPromptInputProps {
  /** String = controlled text mirror; ComposerDoc = a seed that pre-populates pills. */
  value: string | ComposerDoc;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Pins the box's layout: `true` two rows, `false` one row, omitted derives it. */
  expanded?: boolean;
  suggestions?: string[];
  /** Attachments staged in the input. Provide `onAttachmentsChange` to enable
   *  the attach button + removable previews. */
  attachments?: AttachmentData[];
  /** Whether the built-in paperclip attach button renders. On by default. */
  attach?: boolean;
  // NARROWED BY WHAT THE ENCODERS CAN SEND: `'image/*'` resolves to the four image
  // formats both APIs actually accept, not to every image type the OS will offer. The
  // same string, resolved by the same function against the same declaration, that
  // `toOpenAIMessages(msgs, { accept })` uses, so a file the picker allows is a file the
  // wire can carry.
  /** Which attachment media types the user may stage, in HTML `accept` syntax. */
  accept?: MediaTypeFilter;
  /** Fired with the files `accept` excluded, as facts (name, media type, reason); it
   *  renders nothing itself. */
  onAttachmentsRejected?: (rejected: RejectedAttachment[]) => void;
  /** Show a web-search (Globe) button in the left toolbar; calls `onWebSearch`. */
  webSearch?: boolean;
  /** Show a Voice (Mic) button in the left toolbar; calls `onVoice`. */
  voice?: boolean;
  // Hiding it entirely (Enter-only) is pure CSS: `::part(send){display:none}`, no prop
  // needed. The Stop button (stoppable + loading) is unaffected.
  /** Send-button visibility, `'always'` by default. */
  submit?: 'always' | 'auto';
  onValueChange: (v: string) => void;
  onSubmit: () => void;
  onSuggestionClick: (v: string) => void;
  onAttachmentsChange?: (attachments: AttachmentData[]) => void;
  onWebSearch?: () => void;
  onVoice?: () => void;
  /** When `true` and `loading` is also `true`, the send button is replaced by
   *  a Stop button that calls `onStop`. */
  stoppable?: boolean;
  /** Called when the user clicks the Stop button. */
  onStop?: () => void;
  /** Custom toolbar action buttons declared as `<kai-action>` light-DOM children. */
  toolbarActions?: CustomAction[];
  /** Called when a custom toolbar action button is clicked, with the action id. */
  onAction?: (id: string) => void;
  /** Extra items for the `+` menu, appended after the built-in file item. */
  tools?: ComposerToolItem[];
  /** A chosen menu item, carrying its new state when the item is a toggle. */
  onToolSelect?: (detail: { id: string; checked?: boolean }) => void;
  /** Rich entity triggers (`/` skills, `@` agents) passed to the composer. */
  triggers?: TriggerDef[];
  /** Default icon per entity kind (kind → image src) passed to the composer. */
  kindIcons?: Record<string, string>;
  /** Structured change (doc + entities) from the composer, on every edit. */
  onComposerChange?: (change: ComposerChange) => void;
}

/** The staged file as a `data:` URI.
 *
 *  NOT `URL.createObjectURL`. An object URL resolves only inside the tab that
 *  minted it, so it renders a perfect thumbnail here and is meaningless to
 *  anything downstream: `toOpenAIMessages` / `toAnthropicMessages` refuse it,
 *  and before they refused it the attachment reached the model as nothing at
 *  all. A data URI previews identically and is the one form both providers
 *  actually take. */
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });

async function fileToAttachment(file: File): Promise<AttachmentData> {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${file.name}-${file.size}-${file.lastModified}`;
  return {
    id,
    type: 'file',
    filename: file.name,
    mediaType: file.type || undefined,
    // EVERY file, not just images. A document used to get no `url` at all,
    // which left it unencodable for exactly the same reason a blob: URL is.
    url: await readAsDataUrl(file),
  };
}

export function DefaultPromptInput(props: DefaultPromptInputProps) {
  let fileInput: HTMLInputElement | undefined;
  const attachments = () => props.attachments ?? [];
  const canAttach = () => !!props.onAttachmentsChange;

  // The SAME resolver the encoders call, on the same declaration. Recomputed
  // reactively so a host that swaps `accept` at runtime moves the picker hint
  // and the filter together.
  const mediaPolicy = () => resolveMediaPolicy({ accept: props.accept });

  const addFiles = async (files: FileList | null) => {
    if (!files?.length || !props.onAttachmentsChange) return;

    // The `accept` ATTRIBUTE below is only a hint — every OS dialog offers an
    // "All Files" escape, and it does not apply to drag-and-drop at all. So the
    // filter that actually holds is this one, in JS, on the files as staged.
    const policy = mediaPolicy();
    const picked = Array.from(files);
    // No `accept` means no filtering, which is what every existing consumer gets
    // today. Opting in is what turns the picker into a guarantee.
    const decisions = picked.map((file) =>
      props.accept === undefined ? undefined : policy.decide(file.type),
    );
    // Read a file when its media type says yes, and ALSO when its media type
    // says nothing at all: `undetermined` means the browser could not name it,
    // and the only honest way to answer is to look at the bytes. Reading is the
    // cost of that answer, so it is spent only on files that could still be
    // staged — a file the filter already rejected is never read.
    const needsBytes = (d: (typeof decisions)[number]): boolean =>
      d === undefined || d.status === 'allowed' || d.status === 'undetermined';
    // One parallel pass, index-aligned with `picked`, so the staged order is the
    // PICK order rather than whichever file finished reading first.
    const read = await Promise.all(
      picked.map((file, i) => (needsBytes(decisions[i]) ? fileToAttachment(file) : undefined)),
    );

    const staged: AttachmentData[] = [];
    const rejected: RejectedAttachment[] = [];
    picked.forEach((file, i) => {
      const decision = decisions[i];
      const attachment = read[i];
      if (decision === undefined || decision.status === 'allowed') {
        if (attachment) staged.push(attachment);
        return;
      }
      if (decision.status === 'undetermined') {
        // The bytes are in hand now, so the encoder can answer for real. Its
        // verdict IS the composer's verdict: staging anything it would refuse is
        // the exact defect (#186) this whole design exists to prevent.
        if (attachment && classifyAttachment(attachment, policy).status === 'encodable') {
          staged.push(attachment);
        } else {
          // Not `filtered`: the kit could not encode this either, so pointing
          // the developer at their own `accept` would send them the wrong way.
          rejected.push({ filename: file.name, mediaType: file.type, reason: 'unsupported' });
        }
        return;
      }
      rejected.push({ filename: file.name, mediaType: file.type, reason: decision.status });
    });

    if (rejected.length > 0) props.onAttachmentsRejected?.(rejected);
    if (staged.length === 0) return;
    // Re-read `attachments()` AFTER the await — a second drop while these were
    // being read would otherwise be overwritten by this call's stale snapshot.
    props.onAttachmentsChange?.([...attachments(), ...staged]);
  };
  const removeAttachment = (id: string) =>
    props.onAttachmentsChange?.(attachments().filter((a) => a.id !== id));

  // `value` may be a string or a seeded ComposerDoc — compute emptiness from the
  // flattened text so a pill-only seed still enables Send.
  const valueText = () => serializeToText(normalizeValue(props.value));
  const sendDisabled = () =>
    props.disabled || props.loading || (!valueText().trim() && attachments().length === 0);

  const showStop = () => !!props.loading && !!props.stoppable;
  const hasContent = () => !!valueText().trim() || attachments().length > 0;
  // Send-button visibility: 'always' (default) or 'auto' (only with content).
  // Full-hide (Enter-only) is CSS: `::part(send){display:none}`.
  const showSend = () => {
    const mode = props.submit ?? 'always';
    return mode === 'always' || (mode === 'auto' && hasContent());
  };

  // The file item and the picker it opens are ONE feature, so the condition that admits
  // them is stated once. `buildComposerTools` takes the same value the `<input>`'s own
  // gate uses, which is what keeps a menu item from existing without a picker behind it.
  const canOfferFiles = () => canAttach() && props.attach !== false;
  const tools = () => resolveTools(props.tools);
  const toolItems = () => buildComposerTools({ attach: canOfferFiles(), tools: tools() });
  // Read from the host's own declaration, NOT from the assembled tree:
  // `buildComposerTools` returns `KaiMenuItem[]`, which is the menu's own vocabulary and
  // does not carry `chip`. The menu renders the tree; the chip row renders the
  // declaration — and both go through `tools()`, so one boundary check covers each.
  const chips = () => chipItems(tools());

  return (
    <>
      <Show when={props.suggestions?.length}>
        <div class="mb-2 flex flex-wrap gap-2">
          <For each={props.suggestions}>
            {(s) => (
              <PromptSuggestion onClick={() => props.onSuggestionClick(s)}>{s}</PromptSuggestion>
            )}
          </For>
        </div>
      </Show>
      <PromptInput
        value={props.value}
        onValueChange={props.onValueChange}
        onSubmit={props.onSubmit}
        isLoading={props.loading}
        disabled={props.disabled}
        expanded={props.expanded}
        attachmentCount={attachments().length}
        class="relative"
      >
        <Show when={canAttach() && attachments().length}>
          {/* `order-first` and first in the DOM: the editable below carries the same
              order so it can claim its own line, and without this the chips would be
              lifted BELOW the paragraph they belong above. The band carries no inset
              of its own — the frame's padding is the box's one left edge.

              `mb-3.5` is 14px, and with the frame's 6px row gap that is the measured
              20px between the chip band and the text's line box: in the reference the
              chips' ink ends at 52 and the text's line box starts at about 71.5, with
              a 21px line advance. A tidier `mb-2` would land 6px tight. */}
          <div data-composer-band class="order-first mb-3.5">
            <Attachments variant="inline">
              <For each={attachments()}>
                {(att) => (
                  <Attachment data={att} onRemove={() => removeAttachment(att.id)}>
                    <AttachmentPreview />
                    <AttachmentInfo />
                    <AttachmentRemove />
                  </Attachment>
                )}
              </For>
            </Attachments>
          </div>
        </Show>
        {/* Consumer-injected content inside the card, above the textarea (e.g. an
            inline status strip). A shadow-internal hole — unreachable from outside.
            Native slot; inert outside a shadow root, projected by the custom element.
            KNOW THIS: in the EXPANDED layout this content renders on the control row,
            below the text, because the editable claims its own line with an `order`
            the slot's assigned nodes cannot join — `order` is not inherited and does
            not reach a slot's projected nodes, and wrapping the slot would cost the
            collapsed row an empty box and its 8px gap. Pin `expanded` on the frame if
            a host needs this content above the text in both layouts. */}
        <slot name="input-top" />
        {/* The LEADING cluster, and it sits BEFORE the editable in the DOM: collapsed
            these controls share the text's row and belong to its left, and expanded the
            editable's own `order-first` is what moves the text onto the line above
            them. Deliberately no order of its own — the ordering lives in one place,
            on the body wrapper, rather than in three class strings that have to agree.

            A plain `div` carrying `contents`, NOT `PromptInputActions`: that component is
            the BOX form, for a caller whose own `justify-*` needs a width to distribute
            across. Nothing here has to state which layout it is in — collapsed the
            body's `flex-1` absorbs the free space ahead of it, expanded the frame's
            `justify-between` places it at the start of the wrapped row. `contents`
            contributes no box, so the item the frame actually lays out is the group div
            below — which is what keeps this cluster ONE item on whichever row it lands. */}
        <div data-cluster="leading" class="contents">
          {/* `shrink-0` belongs HERE, not on the cluster above: a `contents` wrapper has
              no box, so the frame's flex items are these group divs and they are what
              would be squeezed.

              It holds the width for ONE case — when the groups ALONE exceed the frame.
              Then, without it, they shrink and clip their chips; with it, the row
              overflows and the chips stay legible. It is NOT what makes the text wrap:
              the collapsed body is `flex-1`, i.e. `flex-basis: 0%`, so the base sizes
              sum to the groups' widths, free space is positive, and the body takes
              whatever they leave — wrapping on that width whatever they do. */}
          <div class="flex shrink-0 items-center gap-2">
            {/* Consumer-injected leading toolbar controls (e.g. a + menu). display:contents
                ensures an empty slot adds no stray gap; projected nodes lay out as toolbar
                items. Native slot; projected by the custom element. */}
            <slot name="toolbar-start" style={{ display: 'contents' }} />
            <Show when={canOfferFiles()}>
              <input
                ref={fileInput}
                type="file"
                multiple
                class="hidden"
                // Derived from the same policy as the filter above, never spelled
                // out again. `accept="image/*"` narrows to the image formats the
                // wire can actually carry, so the OS dialog greys out the SVG
                // that would otherwise 400 at request time.
                accept={props.accept === undefined ? undefined : mediaPolicy().accept}
                onChange={(e) => {
                  // Reading is async now, so this is deliberately not awaited.
                  // `addFiles` captures the FileList synchronously, before its
                  // first await, so clearing the input below cannot race it.
                  void addFiles(e.currentTarget.files);
                  e.currentTarget.value = ''; // allow re-picking the same file
                }}
              />
            </Show>
            {/* The `+` menu replaced the paperclip that used to sit here, and the tooltip
                cases in this file moved onto it. The tip is a DESCRIPTION: the name stays
                `More tools`, because a tip that becomes the accessible name is a defect the
                kit has already shipped once.

                The trigger goes through `as` so it IS the kit's `Button` rather than a
                native button carrying a copy of its variant classes — a copy silently stops
                matching every other control in this row the day Button is restyled. The
                ref hop this costs (the surface's trigger ref travels `As` -> the function's
                props -> Button's `rest` -> the real `<button>`) is asserted rather than
                assumed: `the surface's trigger ref reaches the real button` in the test
                file fails if it lands on a wrapper or on nothing, because the close path
                focuses `ctx.trigger()` and the assertion reads `document.activeElement`.
                `type` is supplied here because the surface only stamps it when it renders
                the button itself. */}
            <Show when={toolItems().length > 0}>
              <Dropdown disabled={props.disabled}>
                <Tooltip content="More tools">
                  <DropdownTrigger
                    as={(p) => (
                      <Button {...p} type="button" variant="outline" size="icon-sm" class="rounded-full" part="tools" aria-label="More tools" disabled={props.disabled}>
                        <Plus class="size-4" />
                      </Button>
                    )}
                  />
                </Tooltip>
                <DropdownContent>
                  <DropdownItems
                    items={toolItems()}
                    onSelect={(detail) => {
                      // The built-in file item is the composer's own, so it opens the
                      // picker here rather than being reported as a tool the host never
                      // declared and would have to handle.
                      if (detail.id === COMPOSER_FILE_ITEM_ID) {
                        fileInput?.click();
                        return;
                      }
                      props.onToolSelect?.(detail);
                    }}
                  />
                </DropdownContent>
              </Dropdown>
            </Show>
            {/* Active capabilities, one view of the same `checked` field the menu
                renders. Inside the leading group so the cluster stays ONE item on
                whichever row it lands — a sibling would make it two and the frame's
                `justify-between` would spread the wrong things. */}
            <Show when={chips().length > 0}>
              <span class="bg-border h-4 w-px shrink-0" aria-hidden="true" />
              <ComposerChips
                items={chips()}
                disabled={props.disabled}
                // The SAME event the menu fires when the item is chosen, so a chip and a
                // menu row are one code path rather than two that have to agree.
                onRemove={(id) => props.onToolSelect?.({ id, checked: false })}
              />
            </Show>
            <Show when={props.webSearch}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="rounded-pill gap-1"
                aria-label="Search the web"
                disabled={props.disabled}
                onClick={() => props.onWebSearch?.()}
              >
                <Globe class="size-4" />
                Search
              </Button>
            </Show>
            <Show when={props.voice}>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                class="rounded-full"
                aria-label="Voice input"
                disabled={props.disabled}
                onClick={() => props.onVoice?.()}
              >
                <Mic class="size-4" />
              </Button>
            </Show>
            <For each={props.toolbarActions ?? []}>
              {(action) => {
                const Icon = actionIcon(action.icon);
                const label = action.tooltip ?? action.label;
                const btn = (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    class="rounded-full"
                    aria-label={action.label}
                    data-action={action.id}
                    disabled={props.disabled}
                    onClick={() => props.onAction?.(action.id)}
                  >
                    <Show when={Icon} fallback={<span class="px-1 text-xs">{action.label}</span>}>
                      {(I) => { const C = I(); return <C class="size-4" />; }}
                    </Show>
                  </Button>
                );
                return Icon ? <Tooltip content={label}>{btn}</Tooltip> : btn;
              }}
            </For>
          </div>
        </div>
        <PromptInputTextarea placeholder={props.placeholder} aria-label={props.placeholder || 'Message'} triggers={props.triggers} kindIcons={props.kindIcons} onComposerChange={props.onComposerChange} />
        {/* The TRAILING cluster. It reaches the far edge of whichever row it lands on
            without asking for one: collapsed the body's `flex-1` absorbs the free space
            ahead of it, expanded the frame's `justify-between` puts it last. The
            `toolbar-end` slot and the send button live together so they stay adjacent
            at that edge. Native slot; projected by the element.

            `contents` for the same reason as the leading cluster: the frame lays out
            the group div, not this wrapper, and the frame's own distribution is what
            spreads the two clusters. */}
        <div data-cluster="trailing" class="contents">
          {/* `shrink-0` here for the same reason as the leading group — see that site
              for what it is and is not for. The cluster has no box, so this div is the
              item the frame lays out and `justify-between` places. */}
          <div class="flex shrink-0 items-center gap-2">
            <slot name="toolbar-end" />
            <Show
              when={showStop()}
              fallback={
                <Show when={showSend()}>
                  <Button
                    size="icon-sm"
                    class="rounded-full"
                    part="send"
                    data-testid="send"
                    aria-label="Send message"
                    disabled={sendDisabled()}
                    onClick={props.onSubmit}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                    </svg>
                  </Button>
                </Show>
              }
            >
              <Button
                size="icon-sm"
                variant="outline"
                class="rounded-full"
                data-testid="stop"
                aria-label="Stop"
                onClick={props.onStop}
              >
                <Square class="size-3" />
              </Button>
            </Show>
          </div>
        </div>
      </PromptInput>
    </>
  );
}
