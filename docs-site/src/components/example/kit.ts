// Load the kit bundle once (idempotent) — shared by every island that mounts a
// kai-* element or the kai-code-block highlighter.
let p: Promise<unknown> | undefined;
export function loadKit(): Promise<unknown> {
  // BASE_URL is '/chat' (no trailing slash) in the production build but '/chat/'
  // in dev — normalise so the bundle URL is always '/chat/kitn/…' (a missing
  // slash silently 404s the bundle on the deployed site).
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!p) p = import(/* @vite-ignore */ `${base}/kitn/kitn-chat.es.js`);
  return p;
}
