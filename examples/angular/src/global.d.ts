/**
 * Ambient module declaration for the side-effect-only registration import:
 *
 *   import '@kitn.ai/chat/elements';
 *
 * The `/elements` entry's real type module re-exports from the kit's SolidJS
 * source, which Angular's tsc build can't type-check.  Since we only import
 * it for its side effect (registering the custom elements), we declare it here
 * as an opaque module so the build doesn't pull in the Solid sources.
 */
declare module '@kitn.ai/chat/elements';

/** Allow plain `.css` side-effect imports (e.g. `import '@kitn.ai/chat/theme.css'`). */
declare module '*.css';
