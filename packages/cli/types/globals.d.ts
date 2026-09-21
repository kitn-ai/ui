/**
 * Build-time constants for this package, substituted by the `define` in config/vite/node.ts.
 * Declared rather than imported from a generated module so `tsc --noEmit` works on a clean
 * checkout, before anything has been built (the create-kai `types/globals.d.ts` pattern).
 */

/**
 * The `@kitn.ai/ui` version THIS CHECKOUT of the CLI was built against, e.g. `0.33.0`.
 *
 * A BUILD-TIME fact, and `kai doctor` is the only reader. The CLI has no runtime
 * dependency on the kit (measured: its bundle imports nothing from it), so without this
 * constant the one useful half of a doctor report -- "your CLI is older than the kit this
 * app has" -- would need either a network call or a dependency the package must not have.
 *
 * Its counterpart is the kit version INSTALLED in the project being diagnosed, read from
 * that project's node_modules at run time. They are different facts about different trees
 * and the report keeps them apart.
 */
declare const __KIT_VERSION__: string;
