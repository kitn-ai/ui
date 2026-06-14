// src/primitives/card-registry.tsx
// One source of truth mapping a CardEnvelope.type to a renderer, for both layers:
//   - CardComponentMap drives the Solid <CardRenderer>.
//   - CardTagMap drives the <kc-cards> web component (child kc-* elements).
// Built-ins cover the 5 contract card types; consumers extend/override via a `types`
// prop (merged OVER the built-ins). kc-card (bare shell) is intentionally NOT a target.
import type { Component } from 'solid-js';
import type { CardEnvelope, CardHost } from './card-contract';
import { Form } from '../components/form';
import { ConfirmCard } from '../components/confirm-card';
import { TasksCard } from '../components/tasks-card';
import { ChoiceCard } from '../components/choice-card';
import { LinkPreview } from '../components/link-preview';
import { Embed } from '../components/embed';

/** Solid renderer for one envelope. `host` is the resolved CardHost so each wrapper
 *  can bridge its card's emit convention (form/confirm/tasks take `host`;
 *  link/embed take `onEmit`). */
export type CardComponent = Component<{ envelope: CardEnvelope; host?: CardHost }>;
export type CardComponentMap = Record<string, CardComponent>;

/** Web-component layer: envelope type → kc-* tag name. */
export type CardTagMap = Record<string, string>;

export const BUILTIN_CARD_TAGS: CardTagMap = {
  form: 'kc-form',
  confirm: 'kc-confirm',
  'tasks': 'kc-tasks',
  choice: 'kc-choice',
  link: 'kc-link-preview',
  embed: 'kc-embed',
};

export const BUILTIN_CARD_COMPONENTS: CardComponentMap = {
  form: (p) => (
    <Form data={p.envelope.data as never} cardId={p.envelope.id} heading={p.envelope.title}
      resolution={p.envelope.resolution} host={p.host} />
  ),
  confirm: (p) => (
    <ConfirmCard data={p.envelope.data as never} cardId={p.envelope.id} heading={p.envelope.title}
      resolution={p.envelope.resolution} host={p.host} />
  ),
  'tasks': (p) => (
    <TasksCard data={p.envelope.data as never} cardId={p.envelope.id} heading={p.envelope.title}
      resolution={p.envelope.resolution} host={p.host} />
  ),
  choice: (p) => (
    <ChoiceCard data={p.envelope.data as never} cardId={p.envelope.id} heading={p.envelope.title}
      resolution={p.envelope.resolution} host={p.host} />
  ),
  // link/embed have no `heading` and emit via an onEmit callback (no context).
  link: (p) => (
    <LinkPreview data={p.envelope.data as never} cardId={p.envelope.id} onEmit={(e) => p.host?.emit(e)} />
  ),
  embed: (p) => (
    <Embed data={p.envelope.data as never} cardId={p.envelope.id} onEmit={(e) => p.host?.emit(e)} />
  ),
};

/** Built-ins with the consumer's overrides merged on top (consumer wins). */
export function mergeCardComponents(types?: CardComponentMap): CardComponentMap {
  return types ? { ...BUILTIN_CARD_COMPONENTS, ...types } : { ...BUILTIN_CARD_COMPONENTS };
}

export function mergeCardTags(types?: CardTagMap): CardTagMap {
  return types ? { ...BUILTIN_CARD_TAGS, ...types } : { ...BUILTIN_CARD_TAGS };
}
