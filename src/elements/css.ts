// Imports the compiled kit CSS as a raw string (Vite `?inline`) so it can be
// injected into custom-element shadow roots. Run `npm run build:css` first.
import compiled from './compiled.css?inline';

export const KITN_CSS: string = compiled;
