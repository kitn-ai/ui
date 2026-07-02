import { Component } from '@angular/core';

/**
 * Moon glyph — shown in light mode (tap the toggle -> dark). moon/sun aren't in the
 * kit's icon set, so the example owns them. The host is `display: inline-flex` so
 * the 20x20 svg it wraps drops cleanly into `<kai-button>`'s icon slot (the parent
 * puts `slot="icon"` on this element).
 */
@Component({
  selector: 'app-moon-icon',
  standalone: true,
  template: `
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  `,
  styles: [':host { display: inline-flex; }'],
})
export class MoonIconComponent {}
