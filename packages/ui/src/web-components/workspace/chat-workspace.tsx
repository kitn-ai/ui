import { createSignal, onMount, onCleanup, untrack } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { readSlots, WORKSPACE_SLOTS } from '../slots/slots';
import {
  WorkspaceShell,
  type WorkspaceShellController,
  type WorkspaceAsideSide,
  type WorkspaceAsideToggleDetail,
  type WorkspaceAsideResizeDetail,
} from '../../components/workspace/workspace-shell';

interface Props extends Record<string, unknown> {
  // Drive the aside from your app, updating it in response to the `kai-aside-toggle` event.
  /** Controlled collapsed state of the start aside. Omit for uncontrolled (the element manages it). */
  startCollapsed?: boolean;
  /** Initial collapsed state of the start aside when uncontrolled (default
   *  false). Use the `default-start-collapsed` attribute to start collapsed in
   *  plain HTML. */
  defaultStartCollapsed?: boolean;
  // Drive the aside from your app, updating it in response to the `kai-aside-toggle` event.
  /** Controlled collapsed state of the end aside. Omit for uncontrolled (the element manages it). */
  endCollapsed?: boolean;
  /** Initial collapsed state of the end aside when uncontrolled (default
   *  false). Use the `default-end-collapsed` attribute to start collapsed in
   *  plain HTML. */
  defaultEndCollapsed?: boolean;
  // Applies to uncontrolled asides only (it never fights an app-driven collapsed prop);
  // omit to disable. Fires `kai-aside-toggle`.
  /** Auto-collapse both asides when the shell's own width drops below this many px, and re-expand above it. */
  collapseBelow?: number;
  // Escape inside the drawer closes it and returns focus to the element focused before it
  // opened. Omit to disable. Attribute: `drawer-below`.
  /** Below this shell width in px, an expanded aside renders as an overlay drawer over the main region. */
  drawerBelow?: number;
  // Reflected as a `data-compact` hook on the root (and as the `compact` attribute on the
  // element) for your CSS and slotted content; the shell itself keeps no other opinion
  // about density.
  /** Density hint. */
  compact?: boolean;
}

/** Events fired by `<kai-workspace>`. Layout only: every chat event now belongs
 *  to the part that fires it, inside your own markup. */
interface Events {
  /** An aside collapsed or expanded (a method, the breakpoint, the drawer's Escape). */
  'kai-aside-toggle': WorkspaceAsideToggleDetail;
  /** The aside was resized (fires per drag step, keyboard nudge, or a handle double-click reset), width in px. */
  'kai-aside-resize': WorkspaceAsideResizeDetail;
}

// Aside geometry is CSS custom properties read ONCE at upgrade, so setting one later does not
// resize an already-upgraded shell: --kai-workspace-start-width (280px), -start-min-width
// (200px), -start-max-width (480px); --kai-workspace-end-width (320px), -end-min-width (200px),
// -end-max-width (480px).
// 0.24 turned this element from a chat preset into a layout shell: the chat surface
// (conversations, messages, composer, models, chat events) moved onto whatever the consumer
// slots in, and the sidebar* props/methods became the per-aside aside* pair. A full app
// migrates through the `workspace` block scaffold.
// The old `kai-sidebar-toggle` event is `kai-aside-toggle` with a `side` now. The old name is
// named HERE on purpose: guides/use-a-workspace.mdx carries that migration note, and
// scripts/docs-alignment resolves a kai- token in prose against the ones this tree mentions.
/**
 * A resizable app layout shell with collapsible side asides.
 */
defineWebComponent<Props, Events>('kai-workspace', {
  startCollapsed: undefined,
  defaultStartCollapsed: undefined,
  endCollapsed: undefined,
  defaultEndCollapsed: undefined,
  collapseBelow: undefined,
  drawerBelow: undefined,
  compact: undefined,
}, (props, { dispatch, flag, expose, element, reflectFlag }) => {
  // Which slots the consumer has filled. A bare <slot> is always a truthy JSX
  // node, so each optional region renders ONLY when readSlots reports projected
  // light-DOM content (re-read on childList mutation). Main always renders.
  const [slots, setSlots] = createSignal<Record<string, boolean>>({});
  onMount(() => {
    const read = () => setSlots(readSlots(element, WORKSPACE_SLOTS));
    read();
    const observer = new MutationObserver(read);
    // `attributes` and `subtree`, matching the four other readSlots callers.
    // The read is a function of an ATTRIBUTE as well as of the child list:
    // readSlots reports a `hidden` assigned node as filling nothing, so a
    // child authored hidden and later un-hidden would otherwise never
    // re-trigger it and the region would stay collapsed for good. `subtree`
    // is required for the same reason -- an attribute mutation on a CHILD is
    // not delivered by observing the host alone.
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  // Reflect the read-back flags (the G-05 rule: a bare attribute parses to
  // `undefined`, so without this the property would contradict the attribute).
  reflectFlag('compact');
  reflectFlag('defaultStartCollapsed');
  reflectFlag('defaultEndCollapsed');

  // Aside geometry from the element's CSS custom properties, read once at
  // upgrade (inline style first so jsdom, which does not resolve custom
  // properties through getComputedStyle, still honors a direct set).
  const readVar = (name: string, fallback: number): number => {
    const inline = element.style.getPropertyValue(name).trim();
    const computed = inline || getComputedStyle(element).getPropertyValue(name).trim();
    const n = parseFloat(computed);
    return Number.isFinite(n) ? n : fallback;
  };
  const geometry = untrack(() => ({
    startWidth: readVar('--kai-workspace-start-width', 280),
    startMinWidth: readVar('--kai-workspace-start-min-width', 200),
    startMaxWidth: readVar('--kai-workspace-start-max-width', 480),
    endWidth: readVar('--kai-workspace-end-width', 320),
    endMinWidth: readVar('--kai-workspace-end-min-width', 200),
    endMaxWidth: readVar('--kai-workspace-end-max-width', 480),
  }));

  let controller: WorkspaceShellController | undefined;
  expose({
    /** Collapse/expand one aside (fires `kai-aside-toggle`). */
    toggleAside: (side: WorkspaceAsideSide) => controller?.toggleAside(side),
    /** Force one aside collapsed (fires `kai-aside-toggle`). */
    collapseAside: (side: WorkspaceAsideSide) => controller?.collapseAside(side),
    /** Force one aside expanded (fires `kai-aside-toggle`). */
    expandAside: (side: WorkspaceAsideSide) => controller?.expandAside(side),
  });

  return (
    <WorkspaceShell
      header={slots()['header'] ? <slot name="header" /> : undefined}
      start={slots()['start'] ? <slot name="start" /> : undefined}
      end={slots()['end'] ? <slot name="end" /> : undefined}
      footer={slots()['footer'] ? <slot name="footer" /> : undefined}
      startCollapsed={props.startCollapsed as boolean | undefined}
      defaultStartCollapsed={flag('defaultStartCollapsed')}
      endCollapsed={props.endCollapsed as boolean | undefined}
      defaultEndCollapsed={flag('defaultEndCollapsed')}
      collapseBelow={props.collapseBelow as number | undefined}
      drawerBelow={props.drawerBelow as number | undefined}
      compact={flag('compact')}
      {...geometry}
      onAsideToggle={(detail) => dispatch('kai-aside-toggle', detail)}
      onAsideResize={(detail) => dispatch('kai-aside-resize', detail)}
      controllerRef={(c) => (controller = c)}
    >
      <slot name="main" />
      <slot />
    </WorkspaceShell>
  );
});
