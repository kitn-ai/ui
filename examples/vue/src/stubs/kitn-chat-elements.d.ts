/**
 * Type stub for `@kitnai/chat/elements`.
 *
 * The kit ships its full SolidJS source in the package (including `.tsx` files)
 * which TypeScript would try to compile — but vue-tsc's tsconfig has no `jsx`
 * setting for SolidJS, so that errors.  This stub redirects the type resolution
 * away from the package source.
 *
 * At runtime / in the Vite build, the real bundle is used via the alias in
 * vite.config.ts:
 *   `@kitnai/chat/elements` → `../../dist/kitn-chat.es.js`
 *
 * This import is side-effect only (registers custom elements globally) so the
 * opaque declaration is all TypeScript needs.
 */
declare module '@kitnai/chat/elements' {}
