import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import { Plus, Mic, AudioLines, ChevronDown, X } from 'lucide-solid';
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
        'suggestion-mode'?: string;
      };
      'kai-menu': JSX.HTMLAttributes<HTMLElement> & { theme?: string };
      'kai-model-switcher': JSX.HTMLAttributes<HTMLElement> & { theme?: string; 'current-model'?: string };
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
  // no suggestions — we render our own custom chips below the card
}

const meta = {
  title: 'Spikes/Composer (production)',
  parameters: {
    layout: 'fullscreen',
    // Force dark mode for this showcase — the preview.ts MutationObserver syncs
    // all kai-* element theme attributes to match the Storybook toggle, so we
    // use the toggle itself rather than a raw attribute to drive dark.
    darkMode: { current: 'dark' },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ---------------------------------------------------------------------------
// Dark — production-quality composer showcase
// ---------------------------------------------------------------------------

function ComposerDarkDemo() {
  let plusMenuEl: MenuEl | undefined;
  let effortMenuEl: MenuEl | undefined;
  let modelEl: ModelSwitcherEl | undefined;
  let inputEl: PromptInputEl | undefined;
  let noticeEl: HTMLDivElement | undefined;

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
  });

  // Dismiss handler for the notice strip.
  const dismissNotice = () => {
    if (noticeEl) noticeEl.style.display = 'none';
  };

  return (
    <div style={{
      // Force a crisp dark palette via the kit's --kai-color-* consumer hooks.
      // These inherit through the shadow boundary, so the composed kai-* elements
      // render dark + readable regardless of whether Storybook engages theme="dark".
      '--kai-color-background': 'hsl(0 0% 12%)',
      '--kai-color-foreground': 'hsl(0 0% 96%)',
      '--kai-color-card': 'hsl(0 0% 15%)',
      '--kai-color-card-foreground': 'hsl(0 0% 96%)',
      '--kai-color-popover': 'hsl(0 0% 15%)',
      '--kai-color-popover-foreground': 'hsl(0 0% 96%)',
      '--kai-color-muted': 'hsl(0 0% 17%)',
      '--kai-color-muted-foreground': 'hsl(0 0% 60%)',
      '--kai-color-accent': 'hsl(0 0% 20%)',
      '--kai-color-accent-foreground': 'hsl(0 0% 96%)',
      '--kai-color-border': 'hsl(0 0% 22%)',
      '--kai-color-input': 'hsl(0 0% 22%)',
      background: 'hsl(0 0% 8%)',
      'min-height': '100vh',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      padding: '40px 20px',
      'font-family': 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ width: '100%', 'max-width': '720px', display: 'flex', 'flex-direction': 'column', gap: '20px' }}>
        {/* Notice banner — sits ABOVE the composer card as a standalone strip */}
        <div
          ref={(e) => (noticeEl = e as HTMLDivElement)}
          style={{
            display: 'flex',
            'align-items': 'center',
            gap: '8px',
            padding: '9px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            'border-radius': '10px',
            'font-size': '12.5px',
            color: 'rgba(255,255,255,0.78)',
            'line-height': '1.4',
            'margin-bottom': '8px',
          }}
        >
          <span style={{ flex: '1' }}>
            Claude Fable 5 is currently unavailable.{' '}
            <a
              href="#"
              style={{
                color: 'rgba(255,255,255,0.9)',
                'text-decoration': 'underline',
                'text-underline-offset': '2px',
              }}
              onClick={(e) => e.preventDefault()}
            >
              Learn more
            </a>
          </span>
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={dismissNotice}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              'align-items': 'center',
              color: 'rgba(255,255,255,0.45)',
              'border-radius': '4px',
              transition: 'color 0.15s',
              flex: 'none',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)')}
          >
            <X size={13} />
          </button>
        </div>

        {/* Composer card */}
        <kai-prompt-input
          ref={(e) => (inputEl = e as PromptInputEl)}
          theme="dark"
          placeholder="How can I help you today?"
          attach={false}
          style={{ display: 'block', width: '100%' }}
        >
          {/* toolbar-start: cascading + menu */}
          <kai-menu
            slot="toolbar-start"
            theme="dark"
            ref={(e) => (plusMenuEl = e as MenuEl)}
          >
            <span
              slot="trigger"
              style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
              }}
            >
              <Plus size={16} />
            </span>
          </kai-menu>

          {/* trailing: model switcher + effort + mic + waveform */}
          <div
            slot="trailing"
            style={{
              display: 'flex',
              'align-items': 'center',
              gap: '4px',
            }}
          >
            {/* Model switcher */}
            <kai-model-switcher
              theme="dark"
              ref={(e) => (modelEl = e as ModelSwitcherEl)}
              style={{ display: 'inline-flex' }}
            />

            {/* Effort selector — a compact kai-menu with a label trigger */}
            <kai-menu
              theme="dark"
              ref={(e) => (effortMenuEl = e as MenuEl)}
            >
              <span
                slot="trigger"
                style={{
                  display: 'inline-flex',
                  'align-items': 'center',
                  gap: '3px',
                  padding: '3px 8px',
                  'font-size': '12.5px',
                  'font-weight': '500',
                  color: 'rgba(255,255,255,0.65)',
                  cursor: 'pointer',
                  'border-radius': '6px',
                  transition: 'background 0.15s, color 0.15s',
                  'white-space': 'nowrap',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLSpanElement;
                  el.style.background = 'rgba(255,255,255,0.07)';
                  el.style.color = 'rgba(255,255,255,0.9)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLSpanElement;
                  el.style.background = '';
                  el.style.color = 'rgba(255,255,255,0.65)';
                }}
              >
                High
                <ChevronDown size={11} style={{ opacity: '0.5' }} />
              </span>
            </kai-menu>

            {/* Mic button */}
            <button
              type="button"
              aria-label="Voice input"
              style={{
                display: 'inline-flex',
                'align-items': 'center',
                'justify-content': 'center',
                width: '30px',
                height: '30px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.55)',
                'border-radius': '6px',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(255,255,255,0.07)';
                el.style.color = 'rgba(255,255,255,0.8)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = '';
                el.style.color = 'rgba(255,255,255,0.55)';
              }}
            >
              <Mic size={15} />
            </button>

            {/* Waveform / voice mode button */}
            <button
              type="button"
              aria-label="Voice mode"
              style={{
                display: 'inline-flex',
                'align-items': 'center',
                'justify-content': 'center',
                width: '30px',
                height: '30px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.55)',
                'border-radius': '6px',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(255,255,255,0.07)';
                el.style.color = 'rgba(255,255,255,0.8)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = '';
                el.style.color = 'rgba(255,255,255,0.55)';
              }}
            >
              <AudioLines size={15} />
            </button>
          </div>
        </kai-prompt-input>

        {/* Suggestion chips — rendered below the composer card, with lucide-style icons */}
        <div style={{
          display: 'flex',
          'flex-wrap': 'wrap',
          gap: '8px',
          'justify-content': 'center',
        }}>
          {(['Write', 'Learn', 'Code', 'Life stuff'] as const).map((label) => {
            const icons: Record<string, string> = {
              Write: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
              Learn: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
              Code: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
              'Life stuff': `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>`,
            };
            return (
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  'align-items': 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  'border-radius': '9999px',
                  color: 'rgba(255,255,255,0.6)',
                  'font-size': '12.5px',
                  'font-weight': '450',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  'letter-spacing': '0.01em',
                  'font-family': 'inherit',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = 'rgba(255,255,255,0.1)';
                  el.style.borderColor = 'rgba(255,255,255,0.18)';
                  el.style.color = 'rgba(255,255,255,0.85)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = 'rgba(255,255,255,0.05)';
                  el.style.borderColor = 'rgba(255,255,255,0.09)';
                  el.style.color = 'rgba(255,255,255,0.6)';
                }}
                onClick={() => console.log('[suggestion]', label)}
              >
                <span aria-hidden="true" innerHTML={icons[label]} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const Dark: Story = { render: () => <ComposerDarkDemo /> };
