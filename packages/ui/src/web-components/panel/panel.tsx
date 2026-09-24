import { Panel, PanelBody, PanelFooter, PanelHeader } from '../../components/panel/panel';
import { defineWebComponent } from '../define/define';

interface PanelElementProps extends Record<string, unknown> {
  // Off (the default), the panel inherits its container's radius and clips to it, the
  // right posture inside an already-framed container such as `kai-dock`'s floating panel.
  /** Standalone widget-box chrome: border, radius and shadow on the panel itself. */
  frame?: boolean;
}

// The host is the sized box and the panel fills it: a block host with no intrinsic height, so an
// unsized parent means an invisible panel. Without `frame` the panel inherits its container's
// radius and clips to it, which is the right posture inside an already-framed container such as
// `kai-dock`'s floating panel.
/**
 * The frame a widget-panel composition sits on.
 */
defineWebComponent<PanelElementProps>('kai-panel', {
  frame: false,
}, (props, { flag, reflectFlag }) => {
  void props;
  // Reflect so `[frame]` is styleable/inspectable on the host and the
  // property reads back what an attribute write set.
  reflectFlag('frame');
  return (
    <>
      {/* The host is the sized box; the panel fills it. `height:100%` would be
          wrong on the shadow content alone, so the flex column carries h-full
          against a stretched host block. */}
      {/* Default-slot children are the view content (a kai-thread, a home
          screen): stretch them to fill the body region. The named slots are
          exempt on purpose, so header/footer content keeps its natural
          height. */}
      <style>{':host{display:block}slot:not([name])::slotted(*){flex:1 1 0%;min-height:0}'}</style>
      <Panel frame={flag('frame')} part="panel">
        <div part="header" class="shrink-0"><slot name="header" /></div>
        <PanelBody part="body"><slot /></PanelBody>
        <PanelFooter part="footer"><slot name="footer" /></PanelFooter>
      </Panel>
    </>
  );
});

// The exact chrome the `kai-chat` facade paints for its own built-in header: a 56px row with a
// bottom border. Back arrows and close buttons are slotted CONTENT, never props.
/**
 * The header row of a panel.
 */
defineWebComponent<Record<string, unknown>>('kai-panel-header', {}, () => (
  <>
    <style>{':host{display:block}'}</style>
    <PanelHeader part="header" start={<slot name="start" />} end={<slot name="end" />}>
      <slot />
    </PanelHeader>
  </>
));
