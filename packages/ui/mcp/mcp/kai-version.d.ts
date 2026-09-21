// `__KAI_VERSION__`: the kai CLI's OWN version. `serverInfo` names the kit on purpose (that is
// the API the tools describe), so the CLI's version is reported in the MCP `instructions`
// (./server.ts), and this is the only place it can come from.
//
// SUBSTITUTED AT BUILD TIME, never read at runtime: `@kitn.ai/kai` has no `exports` map to
// self-resolve through, and this module runs at two depths (`packages/ui/mcp/mcp/` under
// vitest, `packages/kai/dist/` in the bundle). Two substitutions feed it, both reading
// `packages/kai/package.json`: config/vite/node.ts for the bundle and this package's
// vitest.config.ts for the unit suite.
//
// Rename the define key on one side only and tsc stays green, while the bundle keeps a bare
// identifier and the CLI dies with `[kitn-ui-mcp] fatal: ReferenceError: __KAI_VERSION__ is not
// defined`. `packages/kai/scripts/verify-bundle-shape.mjs` reads the substitution back out of
// the artifact so the build leg catches it; docs/coupling-map.md §3 has the long form.
declare const __KAI_VERSION__: string;
