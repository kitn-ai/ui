// Shared resolution controller for interactive cards. Precedence:
//   props.resolution  (host-driven / re-hydrated)   >   local optimistic flip   >   none
// A new `data` identity clears the local flip (a fresh card definition is interactive
// again), but an explicit prop keeps it resolved. `isOptimistic` is true only for a
// flip made this session (used to announce via role="status"; silent on re-hydrate).
import { createSignal, createMemo, createEffect, on, type Accessor } from 'solid-js';
import type { CardResolution } from '../primitives/card-contract';

export interface ResolutionController {
  resolution: Accessor<CardResolution | undefined>;
  isResolved: Accessor<boolean>;
  isOptimistic: Accessor<boolean>;
  setLocal: (r: CardResolution) => void;
}

export function useCardResolution(opts: {
  prop: Accessor<CardResolution | undefined>;
  data: Accessor<unknown>;
}): ResolutionController {
  const [local, setLocal] = createSignal<CardResolution | undefined>(undefined);
  // Reset the optimistic flip when a NEW data identity arrives (deferred so mount
  // doesn't clobber an initial prop). The prop still wins via the memo below.
  createEffect(on(opts.data, () => setLocal(undefined), { defer: true }));
  const resolution = createMemo(() => opts.prop() ?? local());
  const isResolved = createMemo(() => resolution() !== undefined);
  const isOptimistic = createMemo(() => opts.prop() === undefined && local() !== undefined);
  return { resolution, isResolved, isOptimistic, setLocal };
}
