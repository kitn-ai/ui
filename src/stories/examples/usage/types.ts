/**
 * Hand-authored "how you do this" code samples for the Examples / Patterns
 * stories' **Usage** tab. Each Example is a granular SolidJS composition; the
 * snippets teach how to do the same thing — the props you set and the events you
 * handle — in each framework. They are representative, NOT a literal copy of the
 * rendered demo.
 *
 * Keyed per **story** (variant): the Usage tab shows the entry for the story you
 * clicked (eyebrow = example name, title = story name). An example-level
 * `intro`/`snippets` is the fallback for any story without its own entry.
 *
 * Pure data (no imports) so it bundles cleanly into the Storybook manager addon.
 */
export type FrameworkKey = 'html' | 'react' | 'svelte' | 'vue' | 'angular' | 'solid';

/** One story's (or the example's) intro + per-framework snippets. */
export interface StoryUsage {
  /** One-line "how you do this" framing (may use `inline code`). */
  intro: string;
  /** framework key → code snippet. Omit a framework to hide its tab. */
  snippets: Partial<Record<FrameworkKey, string>>;
}

export interface ExampleUsage extends StoryUsage {
  /** Storybook group title this attaches to, e.g. `'Examples/Message Actions'`. */
  title: string;
  /**
   * Per-story overrides, keyed by the story's display **name**
   * (e.g. `'Actions on Hover'`). A story without an entry falls back to the
   * example-level `intro`/`snippets`.
   */
  stories?: Record<string, StoryUsage>;
}
