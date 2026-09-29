// src/web-components/resizable/resizable.globals.d.ts
//
// DELIBERATELY DECLARATION-FREE, and kept as the pointer for the cross-element maximize
// PROTOCOL: the two raw composed CustomEvents `<kai-artifact>` and
// `<kai-resizable>`/`<kai-resizable-item>` exchange.
//
// This file used to hand-author their two HTMLElementEventMap entries. The generator
// emits both now: gen-web-component-types.mjs gives every element a typed listener
// overload plus an `<ClassName>EventMap`, and adds a global HTMLElementEventMap entry
// for every event name whose payload is the same on every element that DECLARES it —
// which `kai-maximize-intent` (declared in artifact.tsx) and `kai-maximize-state`
// (declared in resizable.tsx) both are. The payloads they carry are the ones the
// events declare: `{ requested: boolean }` and `{ maximized: boolean }`, matching the
// exported `KaiMaximizeIntentDetail` / `KaiMaximizeStateDetail`.
//
// The hand-authored copies are gone rather than left beside the generated ones because
// two declarations of the same member name are a second source of truth, and the copy
// that loses fails SILENTLY under the `skipLibCheck: true` every pass sets (TS2717).
// Not hypothetical: this file also used to declare a global `KaiResizableElement`, a
// hand-written interface cannot win against the generated one of the same name, and
// the generated one won. Anything a consumer reads here is generated now.
//
// What pins the two entries is tests/web-components/element-event-map.test.ts, which
// compiles `addEventListener('kai-maximize-intent', e => e.detail.requested)` and the
// `kai-maximize-state` equivalent against the generated declarations — from inside this
// protocol's own consumer position.
//
// THE FILENAME IS STILL LOAD-BEARING if a declaration ever comes back here. TypeScript
// drops a .d.ts when a same-named .ts/.tsx sits beside it, and `resizable.tsx` does, so
// under the old name every declaration in this file was in NO tsc program.

export {};
