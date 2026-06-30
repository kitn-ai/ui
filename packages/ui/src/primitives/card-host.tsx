// src/primitives/card-host.tsx
// The native transport: a Solid context exposing a CardHost (context() + emit()).
// emit() routes through the contract policy via the shared routeCardEvent. Cards
// inside <kai-chat>/<CardProvider> use this; bare cards fall back to the bubbling
// kai-card event (see card-routing.listenForCardEvents).
import { createContext, useContext, type JSX } from 'solid-js';
import type { CardContext, CardEvent, CardHost, CardPolicy } from './card-contract';
import { routeCardEvent } from './card-routing';

const CardHostContext = createContext<CardHost>();

export interface CardProviderProps {
  /** Ambient context, static or a reactive getter. */
  context: CardContext | (() => CardContext);
  /** Routing policy applied to every emitted event. */
  policy?: CardPolicy;
  children: JSX.Element;
}

export function CardProvider(props: CardProviderProps): JSX.Element {
  // Never destructure props (Solid norm). Resolve context lazily so a getter stays reactive.
  const host: CardHost = {
    context: () =>
      typeof props.context === 'function'
        ? (props.context as () => CardContext)()
        : props.context,
    emit: (event: CardEvent) => routeCardEvent(props.policy, event),
  };
  return <CardHostContext.Provider value={host}>{props.children}</CardHostContext.Provider>;
}

/** Read the current CardHost. `undefined` when no provider is present (bare card). */
export function useCardHost(): CardHost | undefined {
  return useContext(CardHostContext);
}
