// src/elements/cards.tsx
// <kai-cards> — the web-component list dispatcher. Renders one child kai-* element per
// envelope (by type→tag), propagates its theme, and routes children's bubbling
// `kai-card` events through an optional `policy`. The raw events keep bubbling past
// <kai-cards> (composed) so document-level listeners still work. Unknown types render
// the Solid CardFallback inline and emit a contract `error`.
import { For, Show, createEffect, createSignal, on, onCleanup, onMount, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { defineWebComponent } from './define';
import type { CardEnvelope, CardEvent, CardPolicy, CardResolution } from '../primitives/card-contract';
import { CARD_EVENT_NAME, emitCardEvent, routeCardEvent } from '../primitives/card-routing';
import { mergeCardTags } from '../primitives/card-registry';
import { CardFallback } from '../components/card-fallback';
// Register the built-in child card elements so that importing <kai-cards> is self-contained.
import './form';
import './confirm-card';
import './tasks';
import './choice';
import './link-preview';
import './embed';

interface Props extends Record<string, unknown> {
  /** The stream of card envelopes to render. Set as a JS PROPERTY: `el.cards = [...]`. */
  cards?: CardEnvelope[];
  /** Optional type→tag overrides/additions (merged over the built-ins). Property: `el.types`.
   *  Typed as a plain string map (not the `CardTagMap` alias) so the generated React
   *  wrapper inlines it instead of emitting an unresolved named type. */
  types?: Record<string, string>;
  /** Optional CardPolicy handling child events. Property: `el.policy`. */
  policy?: CardPolicy;
}

/** Events fired by `<kai-cards>`. */
interface Events {
  /** A child card transitioned to a resolved/deferred state (an action was chosen,
   *  a form/tasks submission landed, or it was dismissed) — re-emitted off the host
   *  as a non-bubbling convenience event so a consumer can observe resolution
   *  centrally without diffing the cards array. `detail` = `{ cardId, resolution }`.
   *  (A `reopen` un-resolves a card and has no `CardResolution`, so it does NOT fire
   *  this — observe reopen via the underlying bubbling `kai-card` event.) */
  'kai-card-resolved': { cardId: string; resolution: CardResolution };
}

/** Map a terminal/deferred child CardEvent to the CardResolution it produces. Returns
 *  `undefined` for events that don't resolve a card (ready/error/etc.) and for
 *  `reopen` (which clears resolution → no CardResolution to convey). */
function resolutionFromEvent(e: CardEvent): CardResolution | undefined {
  switch (e.kind) {
    case 'action':
      return { kind: 'action', action: e.action, payload: e.payload };
    case 'submit':
      return { kind: 'submit', data: e.data };
    case 'dismiss':
      return { kind: 'dismissed' };
    default:
      return undefined;
  }
}

/** A single resolved child: a known kai-* tag (props set imperatively) or the fallback. */
function CardSlot(props: { envelope: CardEnvelope; tag?: string; theme: string; emit: (e: CardEvent) => void }): JSX.Element {
  let ref: HTMLElement | undefined;
  // Set object/string props as DOM properties on the custom element (reactive).
  createEffect(() => {
    if (!ref) return;
    (ref as unknown as { data: unknown }).data = props.envelope.data;
    (ref as unknown as { cardId: string }).cardId = props.envelope.id;
    if (props.envelope.title != null) (ref as unknown as { heading: string }).heading = props.envelope.title;
    (ref as unknown as { resolution: unknown }).resolution = props.envelope.resolution;
    ref.setAttribute('theme', props.theme);
    // Stable, queryable id so the host's getCard()/resolve() can find this child
    // node without relying on the (private, scalar-only) cardId property reflecting.
    ref.setAttribute('data-card-id', props.envelope.id);
  });
  // Hoist the unknown-type error emit to onMount to avoid side-effect-in-JSX lint issue
  // and to ensure exactly one error fires.
  onMount(() => {
    if (!props.tag) {
      props.emit({ kind: 'error', cardId: props.envelope.id, message: `Unsupported card type: ${props.envelope.type}` });
    }
  });
  return (
    <Show
      when={props.tag}
      fallback={<CardFallback type={props.envelope.type} cardId={props.envelope.id} />}
    >
      {(tag) => <Dynamic component={tag()} ref={ref} />}
    </Show>
  );
}

defineWebComponent<Props, Events>(
  'kai-cards',
  { cards: undefined, types: undefined, policy: undefined },
  (props, { element, dispatch, expose }) => {
    // Local working copy of the card list. The `cards` PROP still drives rendering
    // (a new prop array re-seeds this), but holding a settable copy lets the
    // imperative resolve()/dismiss() methods flip one envelope's resolution and
    // re-render the matching child — the imperative twin of a consumer cloning +
    // reassigning the whole cards array. `on(..., { defer: true })` re-seeds only on
    // a genuine prop change (mount uses the createSignal seed below), preserving any
    // pending imperative resolution until the consumer supplies a new prop array.
    const [cards, setCards] = createSignal<CardEnvelope[]>(props.cards ?? []);
    createEffect(on(() => props.cards, (next) => setCards(next ?? []), { defer: true }));

    // Route children's bubbling kai-card events through the policy. Attached to the host
    // element so composed events from each child's shadow root are caught as they bubble.
    // The handler reads `props.policy` at EVENT time (not mount time) so setting
    // `el.policy` after the element is in the DOM — the standard host pattern — works.
    onMount(() => {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent<CardEvent>).detail;
        routeCardEvent(props.policy ?? {}, detail);
        // Additionally re-emit the non-bubbling convenience event when a child
        // transitions to a resolved/deferred state — alongside (not instead of) the
        // existing policy routing + the raw bubbling kai-card event.
        const resolution = resolutionFromEvent(detail);
        if (resolution) dispatch('kai-card-resolved', { cardId: detail.cardId, resolution });
      };
      element.addEventListener(CARD_EVENT_NAME, handler as EventListener);
      onCleanup(() => element.removeEventListener(CARD_EVENT_NAME, handler as EventListener));
    });

    // ── Imperative API (instance methods on the host) ──────────────────────────
    // Pattern B: the methods operate on the facade's own working copy + the rendered
    // child DOM nodes. Resolving an envelope sets its `resolution`, which flows down
    // through CardSlot's effect (sets the child's `resolution` prop) so the child
    // re-renders into its chromed read-only view.
    const resolveCard = (cardId: string, resolution: CardResolution) =>
      setCards((list) =>
        list.some((env) => env.id === cardId)
          ? list.map((env) => (env.id === cardId ? { ...env, resolution } : env))
          : list,
      );
    expose({
      /** Programmatically resolve a child card by id: set that envelope's
       *  `resolution` so the child re-renders into its read-only/resolved view — the
       *  imperative twin of the consumer mutating the cards array. No-op for an
       *  unknown id. */
      resolve: (cardId: string, resolution: CardResolution) => resolveCard(cardId, resolution),
      /** Collapse a card to its re-openable stub from the host side — convenience for
       *  `resolve(cardId, { kind: 'dismissed' })`. */
      dismiss: (cardId: string) => resolveCard(cardId, { kind: 'dismissed' }),
      /** Return the live child element node for a card id (or null) so consumers can
       *  call that card's own methods (focus/expand/…) without a shadow-DOM query. */
      getCard: (cardId: string): HTMLElement | null =>
        element.shadowRoot?.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(cardId)}"]`) ?? null,
    });

    // Read the facade's REACTIVE `theme` prop, not element.getAttribute (which is
    // not a tracked dependency) — otherwise a theme change on <kai-cards> after the
    // children first render never propagates, leaving each child card stuck on its
    // initial 'auto' (which follows the OS, so cards looked "always dark").
    const theme = () => ((props as { theme?: string }).theme ?? 'auto');
    const tags = () => mergeCardTags(props.types);
    return (
      <div class="flex flex-col gap-3">
        <For each={cards()}>
          {(env) => (
            <CardSlot
              envelope={env}
              tag={tags()[env.type]}
              theme={theme()}
              emit={(e) => emitCardEvent(element, e)}
            />
          )}
        </For>
      </div>
    );
  },
);
