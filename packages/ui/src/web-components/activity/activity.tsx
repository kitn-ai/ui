import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { wireDisclosure } from '../disclosure/disclosure';
import { Activity, activityLine, type ActivityController, type ActivityStatus } from '../../components/activity/activity';
import { classifyTool } from '../../primitives/tool-classify';
import { summarizeActivity, type ActivityStep } from '../../primitives/activity';
import type { RendererMap } from '../../primitives/renderer-registry';

interface Props extends Record<string, unknown> {
  // The preset. Set as a JS property, in the shape `activityStepsFromParts(parts)` returns.
  // `<kai-activity-step>` children switch the element into item mode instead: your own rows win
  // and this array is not rendered (setting both warns once).
  /** Data mode: the steps to show, as `activityStepsFromParts(parts)` returns them. JS property; omit to pass `<kai-activity-step>` children. */
  steps?: ActivityStep[];
  /** A run in progress: the line shows the live step in the present tense and shimmers. */
  streaming?: boolean;
  // Settable and reflected to the `open` attribute, like `kai-reasoning`.
  /** Drive/observe the timeline disclosure: `el.open = true` or the bare `open` attribute. Listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  // `summary` is what `kai-chat`'s `reasoning="compact"` maps to.
  /** Whether the line opens to the timeline (default) or stands alone with no disclosure, as `summary`. */
  detail?: 'full' | 'summary';
  // Typed as a plain string map so the generated React wrapper inlines it. Keys, most specific
  // first: `tool:<toolName>`, `tool`, `reasoning`. The element receives the step as `el.step`.
  /** Step kind → custom-element tag, so an app draws its own row for one tool, all tools or reasoning. JS property: `el.renderers`. */
  renderers?: Record<string, string>;
  /** Replaces the derived summary line. */
  summary?: string;
}

interface Events {
  /** The timeline expanded or collapsed (via the line, an attribute, or `show()`/`hide()`/`toggle()`). */
  'kai-open-change': { open: boolean };
  /** A step's detail opened or closed, in either mode. `id` is the step's id (data mode) or its host `id` (item mode). */
  'kai-step-toggle': { id: string; open: boolean };
}

const STEP_TAG = 'kai-activity-step';

/** The steps of item mode, read off the `<kai-activity-step>` hosts (their mirrored attributes, then their properties). */
function stepsFromHosts(hosts: HTMLElement[]): ActivityStep[] {
  return hosts.map((h, i) => {
    const attr = (name: string) => h.getAttribute(`data-kai-${name}`) ?? '';
    const kind = (attr('kind') || (h as unknown as { kind?: string }).kind) === 'reasoning' ? 'reasoning' : 'tool';
    const ms = attr('duration') !== '' ? Number(attr('duration')) : undefined;
    const status = (attr('status') || 'done') as ActivityStatus;
    const label = attr('label') || (h as unknown as { label?: string }).label || undefined;
    const tool = attr('tool') || undefined;
    return {
      id: h.id || `step-${i}`,
      kind,
      status,
      label,
      ...(tool ? { toolName: tool, toolKind: classifyTool(tool) } : {}),
      ...(ms !== undefined && Number.isFinite(ms) ? { startedAt: 0, endedAt: ms } : {}),
    } satisfies ActivityStep;
  });
}

/**
 * The line for item mode. A step that names its tool (or is reasoning) goes through the same
 * summary as data mode, so "Searched the web" and "Read 3 files" collapse the same way; a step
 * that only has a label contributes that label, verbatim.
 */
export function composedActivityLine(steps: ActivityStep[], streaming: boolean): string {
  const named = (s: ActivityStep) => s.kind === 'reasoning' || !!s.toolName;
  if (streaming) {
    const live = [...steps].reverse().find((s) => s.status === 'running');
    if (live) return named(live) ? summarizeActivity([live], { streaming: true }) : live.label ?? 'Working…';
  }
  const phrases: string[] = [];
  let i = 0;
  while (i < steps.length) {
    if (named(steps[i]!)) {
      let j = i;
      while (j < steps.length && named(steps[j]!)) j++;
      phrases.push(activityLine(steps.slice(i, j)));
      i = j;
    } else {
      const label = steps[i]!.status === 'error' ? `${steps[i]!.label ?? 'step'} failed` : steps[i]!.label ?? '';
      if (label && phrases[phrases.length - 1] !== label) phrases.push(label);
      i++;
    }
  }
  return phrases.join(' · ');
}

let warnedBoth = false;

/**
 * Reasoning and tool calls as one quiet line that opens to a timeline of steps, each of which opens
 * to its arguments and result. Pass `steps` for the preset, or put `<kai-activity-step>` children
 * inside to render the timeline yourself.
 */
defineWebComponent<Props, Events>('kai-activity', {
  steps: [],
  streaming: false,
  open: undefined,
  defaultOpen: undefined,
  detail: undefined,
  renderers: undefined,
  summary: undefined,
}, (props, ctx) => {
  const { element, dispatch, flag } = ctx;
  let api: ActivityController | undefined;
  wireDisclosure(ctx, () => api, () => props.open);

  // Item mode: `<kai-activity-step>` children mean the app owns the rows.
  const [hosts, setHosts] = createSignal<HTMLElement[]>([]);
  const [hostSteps, setHostSteps] = createSignal<ActivityStep[]>([]);
  let syncTabStop: (() => void) | undefined;
  const stampRoles = (h: HTMLElement[]) => {
    for (const host of h) if (host.getAttribute('role') !== 'listitem') host.setAttribute('role', 'listitem');
  };
  onMount(() => {
    const read = () => {
      const found = [...element.children].filter((c): c is HTMLElement => c.localName === STEP_TAG);
      stampRoles(found);
      setHosts((prev) => (prev.length === found.length && found.every((h, i) => h === prev[i]) ? prev : found));
      const next = stepsFromHosts(found);
      setHostSteps((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      // Re-derive the tab stop on every mutation; it writes on change only, so this cannot loop.
      syncTabStop?.();
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    // `kai-open-change` does not bubble, but capture still passes through this host: it is how a
    // child's own toggle becomes this element's `kai-step-toggle`.
    const onChildToggle = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target === element || target.localName !== STEP_TAG) return;
      dispatch('kai-step-toggle', { id: target.id || `step-${hosts().indexOf(target)}`, open: (e as CustomEvent<{ open: boolean }>).detail.open });
    };
    element.addEventListener('kai-open-change', onChildToggle, true);
    onCleanup(() => { observer.disconnect(); element.removeEventListener('kai-open-change', onChildToggle, true); });
  });

  const itemMode = () => hosts().length > 0;
  createEffect(() => {
    if (itemMode() && Array.isArray(props.steps) && props.steps.length > 0 && !warnedBoth) {
      warnedBoth = true;
      console.warn('[kai] <kai-activity> has both `steps` and <kai-activity-step> children; rendering the children and ignoring `steps`.');
    }
  });

  const triggerOf = (host: HTMLElement) => host.shadowRoot?.querySelector<HTMLElement>('[data-kai-step-trigger]') ?? undefined;
  const summary = () =>
    (props.summary as string | undefined) ?? (itemMode() ? composedActivityLine(hostSteps(), flag('streaming')) : undefined);

  return (
    <Activity
      steps={itemMode() ? undefined : (props.steps as ActivityStep[] | undefined)}
      streaming={flag('streaming')}
      defaultOpen={flag('defaultOpen')}
      detail={props.detail as 'full' | 'summary' | undefined}
      renderers={props.renderers as RendererMap | undefined}
      summary={summary()}
      itemMode={itemMode()}
      controllerRef={(a) => (api = a)}
      onStepToggle={(id, open) => dispatch('kai-step-toggle', { id, open })}
      rovingRows={() => hosts().filter((h) => triggerOf(h))}
      rovingTarget={triggerOf}
      syncRef={(s) => (syncTabStop = s)}
      failed={hostSteps().some((s) => s.status === 'error')}
      interrupted={hostSteps().some((s) => s.status === 'interrupted')}
    >
      {itemMode() ? <slot /> : undefined}
    </Activity>
  );
});
