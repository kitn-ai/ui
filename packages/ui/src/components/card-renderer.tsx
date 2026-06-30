// src/components/card-renderer.tsx
// The Solid single-envelope dispatcher: pick the card for envelope.type and render it
// with the envelope spread onto its props. Routing uses the ambient CardProvider
// (useCardHost). Unknown type → CardFallback + a one-shot contract `error` emit.
import { createMemo, untrack, Show, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { CardEnvelope } from '../primitives/card-contract';
import { useCardHost } from '../primitives/card-host';
import { mergeCardComponents, type CardComponentMap } from '../primitives/card-registry';
import { CardFallback } from './card-fallback';

export interface CardRendererProps {
  envelope: CardEnvelope;
  /** Add/override type→component entries (merged over the built-ins). */
  types?: CardComponentMap;
}

export function CardRenderer(props: CardRendererProps): JSX.Element {
  const host = useCardHost();
  const map = createMemo(() => mergeCardComponents(props.types));
  const entry = createMemo(() => map()[props.envelope.type]);

  return (
    <Show
      when={entry()}
      fallback={<UnknownCard envelope={props.envelope} />}
    >
      {(comp) => <Dynamic component={comp()} envelope={props.envelope} host={host} />}
    </Show>
  );
}

/** Renders the fallback and emits exactly one `error` (untracked, on first render). */
function UnknownCard(props: { envelope: CardEnvelope }): JSX.Element {
  const host = useCardHost();
  untrack(() =>
    host?.emit({
      kind: 'error',
      cardId: props.envelope.id,
      message: `Unsupported card type: ${props.envelope.type}`,
    }),
  );
  return <CardFallback type={props.envelope.type} cardId={props.envelope.id} />;
}

/** Function sugar: renderCard(env) ≡ <CardRenderer envelope={env} />. */
export function renderCard(
  envelope: CardEnvelope,
  opts?: { types?: CardComponentMap },
): JSX.Element {
  return <CardRenderer envelope={envelope} types={opts?.types} />;
}
