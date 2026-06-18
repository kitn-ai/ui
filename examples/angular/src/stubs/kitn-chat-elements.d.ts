/**
 * Type stub for `@kitn.ai/ui/elements`.
 *
 * The kit ships its full SolidJS source in the package (including `.tsx` files)
 * which TypeScript would try to compile — but Angular's tsconfig has no `jsx`
 * setting, so that errors.  This stub redirects the type resolution away from
 * the package source.
 *
 * At runtime / in the Vite build, the real bundle is used via the alias in
 * vite.config.ts:
 *   `@kitn.ai/ui/elements` → `../../dist/kitn-chat.es.js`
 *
 * This import is side-effect only (registers custom elements globally) so the
 * opaque declaration is all TypeScript needs.
 */
declare module '@kitn.ai/ui/elements' {}
