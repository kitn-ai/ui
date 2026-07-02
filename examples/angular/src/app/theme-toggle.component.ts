import { CUSTOM_ELEMENTS_SCHEMA, Component, input, output } from '@angular/core';
import type { Theme } from './types';
import { MoonIconComponent } from './icons/moon-icon.component';
import { SunIconComponent } from './icons/sun-icon.component';

/**
 * Light/dark switch for the top bar. Shows the moon in light mode (tap -> dark) and
 * the sun in dark mode. `<kai-button>` is icon-only, so it carries the accessible
 * `label`; the glyph is decorative (`aria-hidden`) in the `icon` slot. The native
 * click on the shadow-root button bubbles (composed), so a plain `(click)` works.
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MoonIconComponent, SunIconComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <kai-button
      [theme]="theme()"
      variant="ghost"
      size="icon"
      label="Toggle light/dark theme"
      (click)="toggle.emit()"
    >
      @if (theme() === 'light') {
        <app-moon-icon slot="icon" aria-hidden="true"></app-moon-icon>
      } @else {
        <app-sun-icon slot="icon" aria-hidden="true"></app-sun-icon>
      }
    </kai-button>
  `,
})
export class ThemeToggleComponent {
  theme = input.required<Theme>();
  toggle = output<void>();
}
