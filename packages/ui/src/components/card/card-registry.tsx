// One source of truth mapping a CardEnvelope.type to a renderer, for both layers:
//   - CardComponentMap drives the Solid <CardRenderer>.
//   - CardTagMap drives the <kai-cards> web component (child kai-* elements).
// Built-ins cover the 7 contract card types; consumers extend/override via a `types`
// prop (merged OVER the built-ins). kai-card (bare shell) is intentionally NOT a target.
//
// The tag half lives in ./card-tags and the component types in ./card-component-types,
// both re-exported below so every existing importer is unchanged. Neither may move back:
// the tag data is imported AS SOURCE by a Node/no-DOM project (the `kai` MCP re-derived
// the map by convention while it could not), and `CardComponent`/`CardComponentMap` are
// named in `@kitn.ai/ui/schemas`' public surface, whose Node/no-DOM consumer reached this
// `.tsx` and hit TS6142. `BUILTIN_CARD_COMPONENTS` and `mergeCardComponents` stay here
// because they are JSX and have nowhere to go.
import type { CardComponentMap } from '../../primitives/card-component-types';
import { Form } from '../form/form';
import { ConfirmCard } from '../confirm-card/confirm-card';
import { TasksCard } from '../tasks/tasks-card';
import { ChoiceCard } from '../choice-card/choice-card';
import { LinkPreview } from '../link-preview/link-preview';
import { Embed } from '../embed/embed';
import { ArtifactCard, type ArtifactCardData } from '../artifact/artifact-card';

// The tag half, re-exported so this module's surface is unchanged. Authored in
// ./card-tags.ts because that file has no Solid below it and can therefore be read
// from a Node process; this one cannot.
export { BUILTIN_CARD_TAGS, mergeCardTags } from '../../primitives/card-tags';
export type { CardTagMap } from '../../primitives/card-tags';

// The component TYPES, re-exported for the same reason. Authored in
// ./card-component-types.ts because resolving a `.tsx` is what a no-`jsx` project
// cannot do; the values below stay here because they are JSX.
export type { CardComponent, CardComponentMap } from '../../primitives/card-component-types';

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
  // artifact owns real chrome of its own (sizing + heading), so like the four
  // above it lives in components/ and gets only a thin wrapper here.
  artifact: (p) => (
    <ArtifactCard data={p.envelope.data as ArtifactCardData} cardId={p.envelope.id}
      heading={p.envelope.title} host={p.host} />
  ),
};

/** Built-ins with the consumer's overrides merged on top (consumer wins). */
export function mergeCardComponents(types?: CardComponentMap): CardComponentMap {
  return types ? { ...BUILTIN_CARD_COMPONENTS, ...types } : { ...BUILTIN_CARD_COMPONENTS };
}
