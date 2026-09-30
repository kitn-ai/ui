import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { createControllableSignal } from '../../primitives/controllable';
import { ActivityStepItem, activityStepLabel, type ActivityStatus } from '../../components/activity/activity';
import { formatDuration } from '../../primitives/activity';

interface Props extends Record<string, unknown> {
  // The row's text. Empty falls back to the phrase for `kind` and `status` ("Thought", "Thinking…").
  /** What the step says, e.g. `Searched the web`. Rendered as text. */
  label?: string;
  // `error` turns the row red and shows `note` under it; `interrupted` turns it amber with a fixed
  // "no result" note. Both are set by the app that renders the row.
  /** `running`, `done` (default), `error` or `interrupted`. */
  status?: ActivityStatus;
  /** What the step is. Defaults to a tool call; feeds the fallback label and the container's summary line. */
  kind?: 'reasoning' | 'tool';
  /** The tool's name, e.g. `web_search`. Lets the container's summary line say "Searched the web" instead of repeating the label. */
  tool?: string;
  /** How long the step took, in milliseconds. Shown right-aligned as `1.2s`. */
  duration?: number;
  /** A line under the label; for an `error` step, the reason. Rendered as text. */
  note?: string;
  /** Whether the step's detail is showing. Settable; listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
}

interface Events {
  /** The step's detail expanded or collapsed. */
  'kai-open-change': { open: boolean };
}

/** A step host has detail when it holds anything but whitespace. */
function hasContent(el: HTMLElement): boolean {
  for (const n of Array.from(el.childNodes)) {
    if (n.nodeType === Node.ELEMENT_NODE) return true;
    if (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '') return true;
  }
  return false;
}

/**
 * One row of a `kai-activity` timeline: a status glyph on the rail, a label, a duration and, when
 * you put content inside it, a disclosure that shows that content. Compose the rows yourself
 * inside `<kai-activity>`; the container adds the summary line, the rail and arrow-key traversal.
 */
defineWebComponent<Props, Events>('kai-activity-step', {
  label: undefined,
  status: undefined,
  kind: undefined,
  tool: undefined,
  duration: undefined,
  note: undefined,
  open: undefined,
  defaultOpen: undefined,
}, (props, { element, dispatch, flag, reflectFlag }) => {
  const [expandable, setExpandable] = createSignal(false);
  onMount(() => {
    const read = () => setExpandable(hasContent(element));
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, characterData: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  const status = () => (props.status as ActivityStatus | undefined) ?? 'done';
  const kind = () => (props.kind as 'reasoning' | 'tool' | undefined) ?? 'tool';
  const label = () =>
    (props.label as string | undefined) ||
    activityStepLabel({ id: '', kind: kind(), status: status(), toolName: props.tool as string | undefined });
  const duration = () => {
    const ms = props.duration;
    return typeof ms === 'number' ? formatDuration(ms) || undefined : undefined;
  };

  // The container reads a step through these mirrors: a JS-property write (`el.status = 'error'`)
  // is not a DOM mutation, so without them the summary line could not see it change.
  createEffect(() => {
    const mirror: Record<string, string | undefined> = {
      'data-kai-label': (props.label as string | undefined) ?? '',
      'data-kai-status': status(),
      'data-kai-kind': kind(),
      'data-kai-tool': (props.tool as string | undefined) ?? '',
      'data-kai-duration': typeof props.duration === 'number' ? String(props.duration) : '',
      // Set in the same flush that renders the trigger, so the container re-derives its tab stop after it exists.
      'data-kai-expandable': expandable() ? '' : 'false',
    };
    for (const [k, v] of Object.entries(mirror)) if (element.getAttribute(k) !== v) element.setAttribute(k, v ?? '');
  });

  const [open, setOpen] = createControllableSignal(
    () => (props.open !== undefined || element.hasAttribute('open') ? flag('open') : undefined),
    flag('defaultOpen'),
  );
  reflectFlag('open', open);
  let prev = open();
  createEffect(() => {
    const o = open();
    if (o !== prev) dispatch('kai-open-change', { open: o });
    prev = o;
  });

  return (
    <ActivityStepItem
      as="div"
      label={label()}
      status={status()}
      duration={duration()}
      note={props.note as string | undefined}
      expandable={expandable()}
      open={open()}
      onOpenChange={setOpen}
    >
      <slot />
    </ActivityStepItem>
  );
});
