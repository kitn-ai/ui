// src/elements/cards.tsx
// <kc-cards> — the web-component list dispatcher. Renders one child kc-* element per
// envelope (by type→tag), propagates its theme, and routes children's bubbling
// `kc-card` events through an optional `policy`. The raw events keep bubbling past
// <kc-cards> (composed) so document-level listeners still work. Unknown types render
// the Solid CardFallback inline and emit a contract `error`.
import { For, Show, createEffect, onCleanup, onMount, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { defineWebComponent } from './define';
import type { CardEnvelope, CardEvent, CardPolicy } from '../primitives/card-contract';
import { CARD_EVENT_NAME, emitCardEvent, routeCardEvent } from '../primitives/card-routing';
import { mergeCardTags } from '../primitives/card-registry';
import { CardFallback } from '../components/card-fallback';
// Register the built-in child card elements so that importing <kc-cards> is self-contained.
import './form';
import './confirm-card';
import './tasks';
import './link-card';
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

/** A single resolved child: a known kc-* tag (props set imperatively) or the fallback. */
function CardSlot(props: { envelope: CardEnvelope; tag?: string; theme: string; emit: (e: CardEvent) => void }): JSX.Element {
  let ref: HTMLElement | undefined;
  // Set object/string props as DOM properties on the custom element (reactive).
  createEffect(() => {
    if (!ref) return;
    (ref as unknown as { data: unknown }).data = props.envelope.data;
    (ref as unknown as { cardId: string }).cardId = props.envelope.id;
    if (props.envelope.title != null) (ref as unknown as { heading: string }).heading = props.envelope.title;
    ref.setAttribute('theme', props.theme);
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

defineWebComponent<Props>(
  'kc-cards',
  { cards: undefined, types: undefined, policy: undefined },
  (props, { element }) => {
    // Route children's bubbling kc-card events through the policy. Attached to the host
    // element so composed events from each child's shadow root are caught as they bubble.
    // The handler reads `props.policy` at EVENT time (not mount time) so setting
    // `el.policy` after the element is in the DOM — the standard host pattern — works.
    onMount(() => {
      const handler = (e: Event) =>
        routeCardEvent(props.policy ?? {}, (e as CustomEvent<CardEvent>).detail);
      element.addEventListener(CARD_EVENT_NAME, handler as EventListener);
      onCleanup(() => element.removeEventListener(CARD_EVENT_NAME, handler as EventListener));
    });
    const theme = () => (element.getAttribute('theme') ?? 'auto');
    const tags = () => mergeCardTags(props.types);
    return (
      <div class="flex flex-col gap-3">
        <For each={props.cards ?? []}>
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
