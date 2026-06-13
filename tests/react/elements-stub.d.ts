// Typecheck stub for the side-effect-only import `@kitnai/chat/elements` used in
// tests/react/setup.ts. The real `/elements` type module re-exports the kit's
// SolidJS source, which a React-JSX typecheck can't process. tsconfig.react.test.json
// maps `@kitnai/chat/elements` to this empty module so only the wrappers
// (`@kitnai/chat/react`) are type-checked.
export {};
