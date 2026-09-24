/**
 * `BuilderHeader`, the full-width top bar for the `kai dev --builder` page: the title and a
 * "Switch template" button on the left, the canvas light/dark toggle and Save on the right.
 *
 * WHY NOT `AppHeader`: that component's arrangement is a fixed ruling for the WORKSPACE app
 * strip and its doc forbids reconfiguring it. The builder's chrome has different verbs
 * (switch the template, flip the preview canvas's mode, save), so it is a sibling built from
 * the same primitives and at the same scale: an `h-12` strip with a border and its own
 * `bg-background` floor, for the reason `AppHeader` records.
 *
 * "Switch template" is an outline button with an icon and a label rather than the bare ghost
 * button the panel used to render, which did not read as a button at all. The canvas toggle
 * is icon-only, showing the mode you would switch TO, and it is CONTROLLED: the builder page
 * owns what the canvas theme means. The theme-builder entry point lives in the derived
 * panel's Theme section instead, theming being a Theme concern rather than page chrome.
 *
 * Every affordance is gated on its mechanism, the same rule as `AppHeader`: no
 * `onSwitchTemplate` means no Switch button, no `onToggleCanvasDark` no mode toggle, and no
 * `onSave` no Save.
 */
import { type JSX, Show } from 'solid-js';
import { LayoutTemplate, Sun, Moon, House } from 'lucide-solid';
import { cn } from '../../utils/cn';
import { Button } from '../button/button';
import { Separator } from '../separator/separator';
import { Tooltip } from '../tooltip/tooltip';

export interface BuilderHeaderProps {
  /** Fires when the home button is pressed; the button renders only when this is given. */
  onHome?: () => void;

  /** The construct or template name, rendered on the left. */
  title?: string;
  /** Optional small status chip beside the title (e.g. "preview starting..."). */
  status?: string;

  /** Fires from the switch-template button, which renders only when this is given. */
  onSwitchTemplate?: () => void;

  /** Resolved mode of the preview canvas, controlled here; drives the icon and the accessible name. */
  canvasDark?: boolean;
  /** Fires from the canvas theme toggle, which renders only when this is given. */
  onToggleCanvasDark?: () => void;

  /** The primary save action, rightmost. Renders only when given. */
  onSave?: () => void;
  /** Disables save and swaps its label (e.g. mid-write). */
  saving?: boolean;
  // The honest state for a page that autosaves: the builder debounces its POSTs,
  // so save is only ACTIVE while a write is pending, and pressing it flushes the
  // debounce rather than opening a second persistence path.
  /** Every write persisted: disables save and labels it "Saved"; `saving` takes precedence. */
  saved?: boolean;

  class?: string;
}

export function BuilderHeader(props: BuilderHeaderProps): JSX.Element {
  const toggleVisible = (): boolean => !!props.onToggleCanvasDark;
  const utilityVisible = (): boolean => toggleVisible();
  const saveVisible = (): boolean => !!props.onSave;

  const toggleLabel = (): string =>
    props.canvasDark ? 'Preview canvas: switch to light mode' : 'Preview canvas: switch to dark mode';

  return (
    <header
      class={cn(
        'flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4',
        props.class,
      )}
      data-kai-builder-header
    >
      <div class="flex min-w-0 items-center gap-3">
        <Show when={props.onHome}>
          <Tooltip content="Your constructs">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Your constructs"
              onClick={() => props.onHome?.()}
              data-kai-builder-header-home
            >
              <House size={14} aria-hidden="true" />
            </Button>
          </Tooltip>
        </Show>
        <Show when={props.title}>
          <span class="truncate text-sm font-semibold text-foreground" data-kai-builder-header-title>
            {props.title}
          </span>
        </Show>
        <Show when={props.status}>
          <span class="rounded-pill bg-muted px-2 py-0.5 text-xs text-muted-foreground">{props.status}</span>
        </Show>
        <Show when={props.onSwitchTemplate}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => props.onSwitchTemplate?.()}
            data-kai-builder-header-switch
          >
            <LayoutTemplate size={14} aria-hidden="true" />
            Switch template
          </Button>
        </Show>
      </div>

      <div class="flex items-center gap-2">
        <Show when={utilityVisible()}>
          <div class="flex items-center gap-1" data-kai-builder-header-utility>
            <Show when={toggleVisible()}>
              <Tooltip content={toggleLabel()}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={toggleLabel()}
                  onClick={() => props.onToggleCanvasDark?.()}
                  data-kai-builder-header-canvas-toggle
                >
                  {props.canvasDark ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
                </Button>
              </Tooltip>
            </Show>
          </div>
        </Show>

        <Show when={utilityVisible() && saveVisible()}>
          <Separator orientation="vertical" class="h-5" />
        </Show>

        <Show when={saveVisible()}>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={props.saving || props.saved}
            onClick={() => props.onSave?.()}
            data-kai-builder-header-save
          >
            {props.saving ? 'Saving…' : props.saved ? 'Saved' : 'Save'}
          </Button>
        </Show>
      </div>
    </header>
  );
}
