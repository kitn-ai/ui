// Typecheck stub for the side-effect-only import `@kitn.ai/chat/elements` used in
// tests/react/setup.ts. The real `/elements` type module re-exports the kit's
// SolidJS source, which a React-JSX typecheck can't process. tsconfig.react.test.json
// maps `@kitn.ai/chat/elements` to this empty module so only the wrappers
// (`@kitn.ai/chat/react`) are type-checked.
export {};
