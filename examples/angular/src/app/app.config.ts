import { type ApplicationConfig, provideZoneChangeDetection } from '@angular/core';

// Minimal standalone bootstrap config. No router/HTTP needed for the demo; the kit
// elements register in main.ts before bootstrap. `eventCoalescing` is the Angular 18
// default from `ng new`.
export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true })],
};
