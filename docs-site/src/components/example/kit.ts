// Load the kit bundle once (idempotent) — shared by every island that mounts a
// kc-* element or the kc-code-block highlighter.
let p: Promise<unknown> | undefined;
export function loadKit(): Promise<unknown> {
  if (!p) p = import(/* @vite-ignore */ `${import.meta.env.BASE_URL}kitn/kitn-chat.es.js`);
  return p;
}
