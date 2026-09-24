// `CardEnvelope.type` -> the Solid component that renders it, as a TYPE.
//
// TYPES ONLY, AND THAT IS THE WHOLE FILE. `BUILTIN_CARD_COMPONENTS` and
// `mergeCardComponents` stay in card-registry.tsx because they ARE JSX, so this is not
// the split card-tags.ts made: only the type moves, and do not "finish" the symmetry.
// WHY: `@kitn.ai/ui/schemas` is the server-safe entry, and src/schemas/registry.ts
// declares `CustomCardSpec.component` and `CardRegistry.components` as `CardComponentMap`.
// A type import erases at runtime but still has to RESOLVE, and while these types lived in
// a `.tsx` it resolved to one, which tsconfig.mcp.json (no `jsx`, on purpose) reported as
// TS6142 on any unbuilt tree. Moving them here takes that pass to 0; relaxing that config
// is not an option, measured rather than recalled: `jsx: "preserve"` +
// `jsxImportSource: "solid-js"` takes it from 1 error to 130, mostly `TS2304: Cannot find
// name 'HTMLDivElement'`, because a `jsx` setting drags the Solid tree into a Node-only
// pass (this file's narrower set; card-tags.ts measures the wider one).
//
// It changes nothing at runtime: the module is types only, and `verify:ssr` /
// `verify:schemas` read the BUILT entry and cannot tell the two arrangements apart. The
// boundary is compile-time, and `tsc --noEmit -p tsconfig.mcp.json` on an UNBUILT tree is
// the only evidence for it. The `solid-js` type import below is safe: it resolves to a
// `.d.ts`, and TS6142 is about resolving a `.tsx` SOURCE file.

import type { Component } from 'solid-js';
import type { CardEnvelope, CardHost } from './card-contract';

/** Solid renderer for one envelope. `host` is the resolved CardHost so each wrapper
 *  can bridge its card's emit convention (form/confirm/tasks take `host`;
 *  link/embed take `onEmit`). */
export type CardComponent = Component<{ envelope: CardEnvelope; host?: CardHost }>;

/** Solid layer: envelope type → the component that draws it. */
export type CardComponentMap = Record<string, CardComponent>;
