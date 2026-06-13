/**
 * Ambient module declaration for the side-effect-only registration import:
 *
 *   import '@kitnai/chat/elements';
 *
 * This example uses the typed React wrappers from `@kitnai/chat/react`, so it
 * renders <KitnChat /> etc. (real React components) rather than raw custom-
 * element JSX tags — no JSX.IntrinsicElements augmentation is needed.
 *
 * The `/elements` entry's real type module re-exports from the kit's SolidJS
 * source, which a React-JSX `tsc` build can't type-check. Since we only import
 * it for its side effect (registering the custom elements), we declare it here
 * as an opaque module so the build doesn't pull in the Solid sources.
 */
declare module '@kitnai/chat/elements';

/** Allow plain `.css` side-effect imports (e.g. `import './App.css'`). */
declare module '*.css';
