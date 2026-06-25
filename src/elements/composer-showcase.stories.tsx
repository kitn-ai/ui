import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side-effect: registers kai-prompt-input, kai-menu, kai-model-switcher, etc.
import type { KaiMenuItem } from './menu';
import type { ModelOption } from '../types';

// Declare custom element tags used in this story for Solid JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-prompt-input': JSX.HTMLAttributes<HTMLElement> & {
        theme?: string;
        placeholder?: string;
        loading?: boolean;
        disabled?: boolean;
        voice?: boolean;
        search?: boolean;
        attach?: boolean;
        submit?: string;
        'suggestion-mode'?: string;
      };
      'kai-menu': JSX.HTMLAttributes<HTMLElement> & { theme?: string; 'trigger-icon'?: string; 'trigger-label'?: string; 'trigger-icon-trailing'?: string; label?: string };
      'kai-model-switcher': JSX.HTMLAttributes<HTMLElement> & { theme?: string; 'current-model'?: string };
      'kai-button': JSX.HTMLAttributes<HTMLElement> & { variant?: string; size?: string; icon?: string; 'icon-trailing'?: string; label?: string; disabled?: boolean };
      'kai-suggestions': JSX.HTMLAttributes<HTMLElement> & { variant?: string; size?: string; block?: boolean | string; highlight?: string };
    }
  }
}


interface MenuEl extends HTMLElement {
  items?: KaiMenuItem[];
}

interface ModelSwitcherEl extends HTMLElement {
  models?: ModelOption[];
}

interface PromptInputEl extends HTMLElement {
  // no suggestions — the chips below the card are a separate <kai-suggestions>
}

interface SuggestionsEl extends HTMLElement {
  suggestions?: { label: string; value?: string; icon?: string }[];
}

const meta = {
  title: 'Spikes/Composer (production)',
  parameters: {
    layout: 'fullscreen',
    // Theme-driven: the whole showcase follows the Storybook light/dark toggle
    // (preview.ts syncs it onto every kai-* element). We default the toggle to
    // dark so it opens matching the reference, but it's fully theme-aware — flip
    // the toggle for light. No per-element theme, no forced palette.
    darkMode: { current: 'dark' },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ---------------------------------------------------------------------------
// Production-quality composer showcase — theme-driven (light/dark via the toggle)
// ---------------------------------------------------------------------------

function ComposerShowcase() {
  let plusMenuEl: MenuEl | undefined;
  let effortMenuEl: MenuEl | undefined;
  let modelEl: ModelSwitcherEl | undefined;
  let inputEl: PromptInputEl | undefined;
  let noticeEl: HTMLDivElement | undefined;
  let dismissEl: HTMLElement | undefined;
  let suggestionsEl: SuggestionsEl | undefined;

  onMount(() => {
    // Wire the + menu items (realistic context-attach actions).
    if (plusMenuEl) {
      const plusItems: KaiMenuItem[] = [
        {
          id: 'add-files',
          label: 'Add files or photos',
          icon: 'paperclip',
          shortcut: '⌘U',
        },
        {
          id: 'add-github',
          label: 'Add from GitHub',
          icon: 'github',
        },
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
      plusMenuEl.items = [...plusItems];

      plusMenuEl.addEventListener('kai-select', (e) => {
        const detail = (e as CustomEvent<{ id: string; checked?: boolean }>).detail;
        console.log('[kai-menu] kai-select', detail);
        if (detail.id === 'web-search' && detail.checked !== undefined) {
          plusMenuEl!.items = plusMenuEl!.items!.map((item) =>
            item.id === 'web-search' ? { ...item, checked: detail.checked } : item,
          );
        }
      });
    }

    // Wire the effort selector menu.
    if (effortMenuEl) {
      effortMenuEl.items = [
        { heading: true, label: 'Effort' },
        { id: 'high', label: 'High' },
        { id: 'medium', label: 'Medium' },
        { id: 'low', label: 'Low' },
      ];
      effortMenuEl.addEventListener('kai-select', (e) => {
        console.log('[effort-menu] kai-select', (e as CustomEvent).detail);
      });
    }

    // Wire the model switcher.
    if (modelEl) {
      modelEl.models = [
        { id: 'opus-4-8', name: 'Opus 4.8' },
        { id: 'sonnet', name: 'Sonnet' },
        { id: 'haiku', name: 'Haiku' },
      ];
      modelEl.addEventListener('kai-model-change', (e) => {
        console.log('[model-switcher] kai-model-change', (e as CustomEvent).detail);
      });
    }

    // Wire the prompt input submit event only (no suggestions — custom chips rendered below).
    if (inputEl) {
      inputEl.addEventListener('kai-submit', (e) => {
        console.log('[kai-prompt-input] kai-submit', (e as CustomEvent).detail);
      });
    }

    // The dismiss control is a <kai-button>; listen for its kai-click. (Web
    // components emit non-bubbling kai-* CustomEvents — you addEventListener on
    // the element, same as the other controls above. Framework wrappers like
    // @kitn.ai/ui/react expose this as an `onKaiClick` prop.)
    dismissEl?.addEventListener('kai-click', dismissNotice);

    // Suggestion chips — data is a JS property; each item carries an icon name.
    if (suggestionsEl) {
      suggestionsEl.suggestions = [
        { label: 'Write', icon: 'pencil' },
        { label: 'Learn', icon: 'book-open' },
        { label: 'Code', icon: 'code' },
        { label: 'Life stuff', icon: 'smile' },
      ];
      suggestionsEl.addEventListener('kai-select', (e) => {
        console.log('[suggestion]', (e as CustomEvent).detail);
      });
    }
  });

  // Dismiss handler for the notice strip.
  const dismissNotice = () => {
    if (noticeEl) noticeEl.style.display = 'none';
  };

  return (
    // Theme-following page surface — tracks the kit's tokens via the toggle.
    <div class="flex min-h-screen items-center justify-center bg-background px-5 py-10 font-sans">
      <div class="flex w-full max-w-[720px] flex-col">
        {/* Composer group: a plain flow CONTAINER — no absolute / z-index / margin
            tricks. The container carries the recessed (sunken) surface; the notice
            is simply its first child (transparent, so it shows the container's
            color) and the prompt-input — its own opaque surface — sits below. The
            input's focus ring is self-contained, so it can never touch the notice.
            This is only the dev's own layout: stack two elements in a shaded box. */}
        <div class="rounded-xl bg-surface-sunken">
        <div
          ref={(e) => (noticeEl = e as HTMLDivElement)}
          class="flex items-center gap-2 px-[18px] py-[13px] text-xs leading-snug text-muted-foreground"
        >
          <span class="flex-1">
            Claude Fable 5 is currently unavailable.{' '}
            <a
              href="#"
              class="text-foreground underline underline-offset-2"
              onClick={(e) => e.preventDefault()}
            >
              Learn more
            </a>
          </span>
          <kai-button ref={(e) => (dismissEl = e as HTMLElement)} variant="subtle" size="icon-sm" icon="x" label="Dismiss notice" />
        </div>

        {/* Composer card */}
        <kai-prompt-input
          ref={(e) => (inputEl = e as PromptInputEl)}
          placeholder="How can I help you today?"
          attach={false}
          submit="auto"
          class="block w-full"
        >
          {/* toolbar-start: the + menu — built-in trigger via props. */}
          <kai-menu slot="toolbar-start" trigger-icon="plus" label="Add" ref={(e) => (plusMenuEl = e as MenuEl)} />

          {/* toolbar-end: model switcher + effort + mic + waveform */}
          <div slot="toolbar-end" class="flex items-center gap-1">
            {/* Model switcher — follows the theme toggle (no hard-coded theme). */}
            <kai-model-switcher ref={(e) => (modelEl = e as ModelSwitcherEl)} class="inline-flex" />

            {/* Effort selector — built-in label trigger via props. */}
            <kai-menu trigger-label="High" trigger-icon-trailing="chevron-down" ref={(e) => (effortMenuEl = e as MenuEl)} />

            {/* Mic + voice — kit buttons; variant + icon do the styling. */}
            <kai-button variant="subtle" size="icon-sm" icon="mic" label="Voice input" />
            <kai-button variant="subtle" size="icon-sm" icon="audio-lines" label="Voice mode" />
          </div>
        </kai-prompt-input>
        </div>

        {/* Suggestion chips — the kit element; each item carries an icon. The dev
            centers it with their own layout. */}
        <div class="mt-5 flex justify-center">
          <kai-suggestions
            ref={(e) => (suggestionsEl = e as SuggestionsEl)}
            variant="outline"
            size="sm"
            class="inline-flex"
          />
        </div>
      </div>
    </div>
  );
}

export const Composer: Story = { render: () => <ComposerShowcase /> };
