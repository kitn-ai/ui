// `__MCP_VERSION__`: the `@kitn.ai/mcp` server's OWN version. `serverInfo` names the kit on
// purpose (that is the API the tools describe), so the server's own version is reported in
// the MCP `instructions` (./server.ts), and this is the only place it can come from.
//
// SUBSTITUTED AT BUILD TIME, never read at runtime: `@kitn.ai/mcp` has no `exports` map to
// self-resolve through, and this module runs at two depths (`packages/ui/mcp/mcp/` under
// vitest, `packages/mcp/dist/` in the bundle). Two substitutions feed it, both reading
// `packages/mcp/package.json`: packages/mcp/config/vite/node.ts for the bundle and this
// package's vitest.config.ts for the unit suite.
//
// Rename the define key on one side only and tsc stays green, while the bundle keeps a bare
// identifier and the server dies with `[kitn-mcp] fatal: ReferenceError: __MCP_VERSION__ is not
// defined`. packages/mcp/scripts/verify-bundle-shape.mjs reads the substitution back out of
// the artifact so the build leg catches it; docs/coupling-map.md §3 has the long form.
declare const __MCP_VERSION__: string;
