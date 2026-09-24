import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { readSlots, CONVERSATION_ITEM_SLOTS } from '../slots/slots';
import { SlottedConversationItem, type ConversationRowDensity } from '../../components/conversation/conversation-item';
import { isStandaloneConversationItem, readConversationItemId } from '../../components/conversation/conversation-list';

interface Props extends Record<string, unknown> {
  // Inside `<kai-conversations>` it is handed to the container's selection contract
  // (`kai-conversation-select`); standalone it is the `id` in this element's own
  // `kai-select` detail.
  /** The row's identity: the `conversation-id` attribute, else the host `id`. */
  conversationId?: string;
  /** Selected state, reflected as `aria-current` and a `data-active` styling hook. Inside a container the container drives it. */
  active?: boolean;
  /** Dense single-line row padding. */
  compact?: boolean;
  // `panel` is the widget-panel presentation, matching the facade panel's measured row
  // box (12px/10px padding, a 40px single-line row). Previously that box was a private
  // interior class a composition could only approximate by smuggling padding through
  // slotted spans. An explicit density
  // wins over `compact`.
  /** Row density: `default`, `compact` (same as the `compact` flag), or `panel` (the widget-panel row box). */
  density?: ConversationRowDensity;
  // Drive it from `isConversationUnread` (exported from the package root and from
  // `dist/stores.js`). The dot sits inside the activation surface and before the `menu`
  // region.
  /** Show the unread indicator dot at the row's trailing edge, with a screen-reader "Unread" label. */
  unread?: boolean;
}

interface Events {
  // Inside a container this never fires: activation surfaces once, as
  // `kai-conversation-select` on the container. `id` is the row's identity, the same one
  // `conversationId` resolves.
  /** STANDALONE activation of the row (click, Enter or Space on its body). Never fires inside `<kai-conversations>`. */
  'kai-select': { id: string };
}

/**
 * One selectable row of a conversation list; `kai-conversations` is the container
 * that gives its rows selection and keyboard traversal.
 */
defineWebComponent<Props, Events>('kai-conversation-item', {
  conversationId: undefined,
  active: undefined,
  compact: undefined,
  density: undefined,
  unread: undefined,
}, (props, { element, flag, reflectFlag, dispatch }) => {
  // Which named regions the consumer has filled; drives the conditional
  // wrappers so an empty region leaves no stray box behind.
  const [slots, setSlots] = createSignal<Record<string, boolean>>({});
  // Standalone vs container-managed, decided at mount (an item is not
  // reparented in practice; the activation handler re-checks at event time so
  // a row moved INTO a container can never double-fire).
  const [standalone, setStandalone] = createSignal(false);
  onMount(() => {
    const read = () => setSlots(readSlots(element, CONVERSATION_ITEM_SLOTS));
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());

    // The HOST is the row LISTITEM:
    // it wraps the activation body AND the consumer's tabbable menu, so it must
    // never be the activation control itself — axe nested-interactive bans
    // focusable descendants of a control. The button role, aria-current and the
    // tabindex live on the shadow BODY (`data-kai-item-body`): inside a
    // container its controller stamps them; standalone the component renders
    // them itself. An authored role wins.
    if (!element.hasAttribute('role')) element.setAttribute('role', 'listitem');

    setStandalone(isStandaloneConversationItem(element));
  });

  // Standalone activation → the per-item `kai-select` event. The re-check at
  // event time keeps this dead the moment the item becomes a container's direct
  // child, so the container's `kai-conversation-select` stays the only event.
  const activate = () => {
    if (!isStandaloneConversationItem(element)) return;
    dispatch('kai-select', { id: readConversationItemId(element) });
  };

  // Property and attribute stay in agreement for `active`; the body's
  // aria-current follows it reactively (nothing is written to the host).
  reflectFlag('active');

  return (
    <SlottedConversationItem
      conversationId={props.conversationId as string | undefined}
      active={flag('active')}
      compact={flag('compact')}
      density={props.density as ConversationRowDensity | undefined}
      unread={flag('unread')}
      hostSemantics
      onActivate={standalone() ? activate : undefined}
      leading={slots().leading ? <slot name="leading" /> : undefined}
      meta={slots().meta ? <slot name="meta" /> : undefined}
      menu={slots().menu ? <slot name="menu" /> : undefined}
    >
      <slot />
    </SlottedConversationItem>
  );
});
