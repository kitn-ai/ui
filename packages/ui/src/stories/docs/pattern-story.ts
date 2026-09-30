import { onCleanup, onMount } from 'solid-js';

/**
 * Render a pattern's INSTALLED files as a story, so the story is the file a
 * reader copies and not a re-typed copy of it. The page's `<style>` and `<body>`
 * are mounted, and the script is evaluated fresh on each mount.
 *
 * Two things differ from a real install, both forced by Storybook: the
 * `@kitn.ai/ui/web-components` import is dropped because the preview has
 * already registered every element, and `document` listeners the script adds
 * are removed on unmount so a re-render does not stack them.
 */
export function patternStory(html: string, js: string) {
  return function PatternStory() {
    const host = document.createElement('div');
    const page = new DOMParser().parseFromString(html, 'text/html');
    page.querySelectorAll('script').forEach((s) => s.remove());
    host.append(...page.head.querySelectorAll('style'), ...page.body.childNodes);

    onMount(() => {
      const added: [string, EventListenerOrEventListenerObject][] = [];
      const original = document.addEventListener;
      document.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
        added.push([type, fn]);
        original.call(document, type, fn, opts as AddEventListenerOptions);
      }) as typeof document.addEventListener;

      const code = js.replace(/^import\s+['"]@kitn\.ai\/ui\/web-components['"];?$/m, '');
      const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      import(/* @vite-ignore */ url).finally(() => {
        document.addEventListener = original;
        URL.revokeObjectURL(url);
      });
      onCleanup(() => added.forEach(([type, fn]) => document.removeEventListener(type, fn)));
    });
    return host;
  };
}
