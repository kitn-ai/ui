/** Live demo for "Build a composer" — assembles a Claude-style composer from
 *  <kai-prompt-input>'s slots: a notice above the card, a `+` cascading menu in
 *  slot="toolbar-start", a trailing cluster (model switcher + effort menu + mic /
 *  voice buttons) in slot="toolbar-end", and a row of suggestion chips below.
 *
 *  Ported from src/elements/composer-showcase.stories.tsx. Built like
 *  ComposedShell.tsx: array/object data is set as JS properties in onMount and
 *  events are wired with addEventListener, because Solid's on:/onClick handlers
 *  don't cross the shadow boundary. Theme-aware — mirrors the page theme. */
import { onMount, onCleanup } from 'solid-js';
import { loadKit, syncKaiTheme } from './example/kit';

type AnyEl = HTMLElement & Record<string, unknown>;

export default function ComposerDemo() {
  let plusMenuEl: AnyEl | undefined;
  let effortMenuEl: AnyEl | undefined;
  let modelEl: AnyEl | undefined;
  let inputEl: AnyEl | undefined;
  let suggestionsEl: AnyEl | undefined;
  let noticeEl: HTMLElement | undefined;
  let micEl: HTMLElement | undefined;
  let voiceEl: HTMLElement | undefined;

  const cleanups: Array<() => void> = [];

  onMount(async () => {
    await loadKit();

    // The + menu — context-attach actions, including a nested "Skills" submenu.
    if (plusMenuEl) {
      customElements.upgrade(plusMenuEl);
      plusMenuEl.items = [
        { id: 'add-files', label: 'Add files or photos', icon: 'paperclip', shortcut: '⌘U' },
        { id: 'add-github', label: 'Add from GitHub', icon: 'github' },
        {
          label: 'Skills',
          icon: 'sparkles',
          items: [
            { id: 'skill-creator', label: 'skill-creator', icon: 'sparkles' },
            { id: 'manage-skills', label: 'Manage skills', icon: 'settings' },
            { id: 'add-skill', label: 'Add skill', icon: 'file-text' },
          ],
        },
        { separator: true },
        { id: 'web-search', label: 'Web search', icon: 'globe', checked: false },
      ];
      const onPlusSelect = (e: Event) => {
        const detail = (e as CustomEvent<{ id: string; checked?: boolean }>).detail;
        // Keep the checkbox item in sync by writing a NEW array back.
        if (detail.id === 'web-search' && detail.checked !== undefined) {
          plusMenuEl!.items = (plusMenuEl!.items as Array<Record<string, unknown>>).map((item) =>
            item.id === 'web-search' ? { ...item, checked: detail.checked } : item,
          );
        }
      };
      plusMenuEl.addEventListener('kai-select', onPlusSelect);
      cleanups.push(() => plusMenuEl!.removeEventListener('kai-select', onPlusSelect));
    }

    // The effort menu — a labelled trigger with a select-style chevron.
    if (effortMenuEl) {
      customElements.upgrade(effortMenuEl);
      effortMenuEl.items = [
        { heading: true, label: 'Effort' },
        { id: 'high', label: 'High' },
        { id: 'medium', label: 'Medium' },
        { id: 'low', label: 'Low' },
      ];
      const onEffort = (e: Event) => {
        const id = (e as CustomEvent<{ id: string }>).detail?.id;
        // Reflect the choice back onto the trigger label.
        if (id && effortMenuEl) {
          effortMenuEl.setAttribute('trigger-label', id.charAt(0).toUpperCase() + id.slice(1));
        }
      };
      effortMenuEl.addEventListener('kai-select', onEffort);
      cleanups.push(() => effortMenuEl!.removeEventListener('kai-select', onEffort));
    }

    // The model switcher.
    if (modelEl) {
      customElements.upgrade(modelEl);
      modelEl.models = [
        { id: 'opus-4-8', name: 'Opus 4.8' },
        { id: 'sonnet', name: 'Sonnet' },
        { id: 'haiku', name: 'Haiku' },
      ];
      modelEl.currentModel = 'opus-4-8';
    }

    // The prompt input — listen for kai-submit (value is the flattened text).
    if (inputEl) {
      customElements.upgrade(inputEl);
      const onSubmit = (e: Event) => {
        const text = (e as CustomEvent<{ value: string }>).detail?.value?.trim();
        if (!text) return;
        // A real app would send this to the model; here we just clear the input.
        inputEl!.value = '';
      };
      inputEl.addEventListener('kai-submit', onSubmit);
      cleanups.push(() => inputEl!.removeEventListener('kai-submit', onSubmit));
    }

    // Suggestion chips — each carries a label + an icon name.
    if (suggestionsEl) {
      customElements.upgrade(suggestionsEl);
      suggestionsEl.suggestions = [
        { label: 'Write', icon: 'pencil' },
        { label: 'Learn', icon: 'book-open' },
        { label: 'Code', icon: 'code' },
        { label: 'Life stuff', icon: 'smile' },
      ];
      const onPick = (e: Event) => {
        const detail = (e as CustomEvent<{ value?: string; label?: string }>).detail;
        // Drop the picked starter into the composer.
        if (inputEl) inputEl.value = detail?.value ?? detail?.label ?? '';
      };
      suggestionsEl.addEventListener('kai-select', onPick);
      cleanups.push(() => suggestionsEl!.removeEventListener('kai-select', onPick));
    }

    // Theme-sync every kai-* element to the page theme.
    for (const el of [plusMenuEl, effortMenuEl, modelEl, inputEl, suggestionsEl, noticeEl, micEl, voiceEl]) {
      if (el) cleanups.push(syncKaiTheme(el));
    }

    onCleanup(() => cleanups.forEach((c) => c()));
  });

  return (
    <div class="not-content my-5 flex justify-center">
      <div style={{ display: 'flex', width: '100%', 'max-width': '640px', 'flex-direction': 'column', gap: '0.75rem' } as any}>
        {/* Above the card: a self-dismissing notice. The dev owns its placement;
            the element owns its box, icon, a11y role, and dismiss control. */}
        {/* @ts-expect-error custom element */}
        <kai-notice ref={(el: HTMLElement) => (noticeEl = el)} severity="warning" dismissible>
          A scheduled maintenance window starts at 18:00 UTC.
          <a slot="action" href="#" onClick={(e) => e.preventDefault()} style={{ 'font-weight': '500', 'text-decoration': 'underline', 'text-underline-offset': '2px', color: 'inherit' } as any}>
            Status
          </a>
        </kai-notice>

        {/* The composer card. submit="auto" hides Send until there's text. */}
        {/* @ts-expect-error custom element */}
        <kai-prompt-input
          ref={(el: HTMLElement) => (inputEl = el as AnyEl)}
          placeholder="How can I help you today?"
          attach={false}
          submit="auto"
          style={{ display: 'block', width: '100%' } as any}
        >
          {/* toolbar-start: the + menu, leading the toolbar. Built-in trigger via props. */}
          {/* @ts-expect-error custom element */}
          <kai-menu slot="toolbar-start" trigger-icon="plus" label="Add" ref={(el: HTMLElement) => (plusMenuEl = el as AnyEl)} />

          {/* toolbar-end: the trailing cluster, before Send. A plain wrapper lays
              out the model switcher, the effort menu, and the two voice buttons. */}
          <div slot="toolbar-end" style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' } as any}>
            {/* @ts-expect-error custom element */}
            <kai-model-switcher ref={(el: HTMLElement) => (modelEl = el as AnyEl)} style={{ display: 'inline-flex' } as any} />
            {/* @ts-expect-error custom element */}
            <kai-menu trigger-label="High" trigger-icon-trailing="chevron-down" ref={(el: HTMLElement) => (effortMenuEl = el as AnyEl)} />
            {/* @ts-expect-error custom element */}
            <kai-button ref={(el: HTMLElement) => (micEl = el)} variant="subtle" size="icon-sm" icon="mic" label="Voice input" />
            {/* @ts-expect-error custom element */}
            <kai-button ref={(el: HTMLElement) => (voiceEl = el)} variant="subtle" size="icon-sm" icon="audio-lines" label="Voice mode" />
          </div>
        </kai-prompt-input>

        {/* Below the card: suggestion chips. This is the dev's own light-DOM
            layout — a sibling element, not a slot. */}
        <div style={{ display: 'flex', 'justify-content': 'center' } as any}>
          {/* @ts-expect-error custom element */}
          <kai-suggestions
            ref={(el: HTMLElement) => (suggestionsEl = el as AnyEl)}
            variant="outline"
            size="sm"
            style={{ display: 'inline-flex' } as any}
          />
        </div>
      </div>
    </div>
  );
}
