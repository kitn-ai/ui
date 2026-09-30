import { createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { readSlots, THREAD_SLOTS } from '../slots/slots';
import { Thread, type ThreadController } from '../../components/thread/thread';
import { cardComponentsFromTags } from '../message/message';
import { createMessagesGuard } from '../message/validate-messages';
import type { ChatMessage } from '../chat/chat-types';
import type { ProseSize } from '../../primitives/chat-config';
import type { ThreadDensity } from '../../components/chat/thread-density';

interface Props extends Record<string, unknown> {
  // Each entry carries its role, ordered `parts`, and optional
  // actions/avatar/feedback; mutating an entry in place does not re-render. Re-declared
  // from `ChatAppProps` so the element's own prop table carries its own description,
  // matching `<kai-chat>`.
  /** The message thread to render, newest last. JS property; pass a NEW array per chunk. Ignored while `<kai-message>` children exist. */
  messages?: ChatMessage[];
  /** Show a typing indicator on the pending assistant turn. Set it while
   *  awaiting the assistant's reply. */
  loading?: boolean;
  /** Body/prose font scale for rendered markdown (`'xs' | 'sm' | 'base' | 'lg'`).
   *  Defaults to `'sm'`. */
  proseSize?: ProseSize;
  /** Shiki theme name for syntax-highlighted code blocks (e.g.
   *  `'github-dark-dimmed'`). */
  codeTheme?: string;
  /** Enable Shiki syntax highlighting in code blocks. Turn off to render plain
   *  `<pre>` blocks (lighter, no highlighter load). Default true. */
  codeHighlight?: boolean;
  // Inert for non-image tiles.
  /** How an image tile reveals its full size. Default is the pointer-only hover card; the modal on click
   *  is the only one keyboard and touch reach. */
  imagePreview?: 'hover' | 'lightbox';
  /** Whether each row's action bar is visible at rest or on pointer-over; omitted keys it to
   *  the turn, so a user row reveals and an assistant row does not. */
  actionsReveal?: 'always' | 'hover';
  /** Show the scroll-to-bottom button inside the scroll area. Default true. */
  scrollButton?: boolean;
  // A scalar string, so it works as an ATTRIBUTE (`density="compact"`) as well as a
  // property, like `imagePreview`/`actionsReveal` above. Only the message slice is
  // affected: this element has no composer band (pair it with `<kai-prompt-input>`
  // for the whole surface, or use `<kai-chat>`, where the axis covers both).
  /** How much air the message list has: `'default'` (shipped) or `'compact'` (a desktop-panel rhythm: 8px between turns, a tighter band). */
  density?: ThreadDensity;
  /** Extra classes applied to the thread's inner root. */
  class?: string;
  // Typed as a plain string map (not the `CardTagMap` alias) so the generated React
  // wrapper inlines it instead of emitting an unresolved named type.
  /** Card type → custom-element tag overrides/additions, merged over the built-ins. JS property: `el.cardTypes`. */
  cardTypes?: Record<string, string>;
  // The companion of `cardTypes`: `cardTypes` says what DRAWS a card, this says what
  // a VALID one looks like. `createCardRegistry(...).validationSchemas` is this shape.
  // Without it the kit validates its own seven built-ins and leaves the consumer's own
  // card type -- the one that actually matters -- the only unchecked thing on screen.
  // A schema here WINS over a built-in of the same name.
  //
  // Typed `Record<string, object>` rather than `Record<string, JsonSchema>`
  // deliberately: an imported `.json` schema widens `"type"` to `string`, and an
  // authored one carries `$schema`/`title`/`description`/`additionalProperties`, so
  // the tighter type would reject both normal ways to supply one.
  /** Card-type JSON Schemas keyed by envelope type; validates each card's `data`. JS property: `el.cardSchemas`. */
  cardSchemas?: Record<string, object>;
}

/** Events fired by `<kai-thread>`. */
interface Events extends Record<string, unknown> {
  // `action` is the built-in name (`copy` / `like` / `dislike` / `regenerate` / `edit`) or
  // a custom id. `state` is present only for the toggleable feedback votes: `'on'` when a
  // like/dislike is set, `'off'` when re-tapped to clear.
  /** An action button on a message was clicked. `action` is the built-in name or a custom id. */
  'kai-message-action': { messageId: string; action: string; state?: 'on' | 'off' };
}
// Fills the height its parent gives it and scrolls internally (`:host{display:block;height:100%}`).
// The rows are the app's own `<kai-message>` children when it supplies them; `messages` is the
// data-driven preset over the same row component. Either way the thread owns the scroller, stick-to-bottom, the
// live region, the pending indicator and the empty state.
// No composer, header, suggestions or sidebar: pair it with `<kai-prompt-input>` and your own
// layout, or reach for the batteries-included `<kai-chat>`.
/**
 * The scrolling message list of a chat.
 */
defineWebComponent<Props, Events>('kai-thread', {
  messages: undefined,
  loading: false,
  proseSize: 'sm',
  codeTheme: 'github-dark-dimmed',
  codeHighlight: true,
  imagePreview: 'hover',
  // No default, deliberately: an omitted value keys the reveal to each message's own role
  // (see `resolveActionsReveal`), which a default here would override with an explicit one.
  actionsReveal: undefined,
  scrollButton: true,
  // Cast so the literal cannot narrow this prop's published type to `'default'` alone in
  // the generated artifacts — the same reason `theme` above carries one.
  density: 'default' as ThreadDensity,
  class: undefined,
  cardTypes: undefined,
  cardSchemas: undefined,
}, (props, { element, dispatch, flag, expose }) => {
  let controller: ThreadController | undefined;

  // `messages` is an untyped boundary: a consumer can hand it anything at
  // runtime (a pre-0.20.0 `{ id, role, content }` array, in particular). Skip
  // the invalid entries rather than let `groupMessageParts` throw deep inside a
  // render pass, which would blank the whole element instead of one message.
  const validMessages = createMessagesGuard('kai-thread');

  // Detect whether the consumer projected `slot="empty"` content, so the built-in
  // default only renders when they did NOT.
  const [slots, setSlots] = createSignal<Record<string, boolean>>({});
  // Item mode: any visible light-DOM child that is not assigned to a NAMED slot is one of the
  // app's own rows (`<kai-message>`, or a wrapper around one). The app then owns the loop and
  // the thread stops rendering `messages`. Hidden children fill nothing, the same rule
  // `readSlots` applies to the named slots, so a row toggled with `hidden` behaves the same in
  // both shapes.
  const [composed, setComposed] = createSignal(false);
  const readComposed = () =>
    [...element.children].some((c) => !c.hasAttribute('slot') && !c.hasAttribute('hidden'));
  onMount(() => {
    const read = () => {
      setSlots(readSlots(element, THREAD_SLOTS));
      setComposed(readComposed());
    };
    read();
    const observer = new MutationObserver(read);
    // `attributes` and `subtree`, matching the four other readSlots callers.
    // The read is a function of an ATTRIBUTE as well as of the child list:
    // readSlots reports a `hidden` assigned node as filling nothing, so a
    // child authored hidden and later un-hidden would otherwise never
    // re-trigger it and the region would stay collapsed for good. `subtree`
    // is required for the same reason -- an attribute mutation on a CHILD is
    // not delivered by observing the host alone.
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  // Two competing sources of rows: children win, and the data is dropped WITH a message,
  // once per element (a streaming consumer sets a fresh array per chunk).
  let warnedBoth = false;
  createEffect(() => {
    if (!composed() || warnedBoth) return;
    if (Array.isArray(props.messages) && props.messages.length > 0) {
      warnedBoth = true;
      console.warn(
        "<kai-thread>: it has message children, so the 'messages' property is ignored. Render your rows as children OR set 'messages', not both.",
      );
    }
  });

  // Imperative method API — forward the thread's scroll control onto the host.
  expose({
    /** Scroll the message list to the bottom (default `'smooth'`). */
    scrollToBottom: (behavior?: ScrollBehavior) => controller?.scrollToBottom(behavior),
  });

  return (
    <>
      {/* Fill the height the parent gives us and scroll internally, like
          <kai-resizable>. Consumers only need to give a parent (or the element) a
          height. */}
      <style>{':host{display:block;height:100%}'}</style>
      <Thread
        class={props.class as string | undefined}
        messages={composed() ? [] : validMessages(props.messages)}
        composed={composed()}
        loading={flag('loading')}
        proseSize={props.proseSize as ProseSize}
        codeTheme={props.codeTheme as string}
        codeHighlight={flag('codeHighlight')}
        imagePreview={(props.imagePreview as 'hover' | 'lightbox' | undefined) ?? 'hover'}
        actionsReveal={props.actionsReveal as 'always' | 'hover' | undefined}
        density={props.density as ThreadDensity}
        scrollButton={props.scrollButton !== false}
        cardTypes={cardComponentsFromTags(props.cardTypes as Record<string, string> | undefined, (props as { theme?: string }).theme)}
        cardSchemas={props.cardSchemas as Record<string, object> | undefined}
        /* Card parts emit off THIS element as the bubbling `kai-card` event. */
        cardHostElement={element}
        empty={slots()['empty'] ? <slot name="empty" /> : undefined}
        onMessageAction={(detail) => dispatch('kai-message-action', detail)}
        controllerRef={(c) => (controller = c)}
      />
    </>
  );
});
