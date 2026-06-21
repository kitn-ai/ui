// Load the kit bundle once (idempotent) — shared by every island that mounts a
// kai-* element or the kai-code-block highlighter.
let p: Promise<unknown> | undefined;
export function loadKit(): Promise<unknown> {
  // BASE_URL is '/' (root); strip any trailing slash so the bundle URL is always
  // '/kitn/…' (a missing slash silently 404s the bundle on the deployed site).
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  // The bundle registers the kai-* elements ASYNCHRONOUSLY (it dynamic-imports its
  // impl chunk for SSR-safety), so the import resolving does NOT mean elements are
  // defined. Wait for kai-chat to be defined — with the coarse register-all bundle
  // all elements register together, so this one guard means every element is ready.
  // Without it, islands that set properties right after loadKit() race the upgrade
  // and their data is dropped (empty previews / "card couldn't be displayed").
  if (!p) {
    p = import(/* @vite-ignore */ `${base}/kitn/kitn-chat.es.js`).then(
      () => customElements.whenDefined('kai-chat'),
    );
  }
  return p;
}
