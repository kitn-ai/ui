import { Show } from 'solid-js';
import { defineWebComponent } from './define';
import { Tool, type ToolPart } from '../components/tool';

interface Props extends Record<string, unknown> {
  /** The tool-call to display. Set as a JS property. */
  tool?: ToolPart;
  /** Start expanded. */
  open?: boolean;
}

/**
 * `<kc-tool>` — a collapsible tool-call panel (input/output inspection with a
 * state badge). Data via the `tool` property; `open` flag starts it expanded.
 */
defineWebComponent<Props>('kc-tool', {
  tool: undefined,
  open: false,
}, (props, { flag }) => (
  <Show when={props.tool}>
    <Tool toolPart={props.tool!} defaultOpen={flag('open')} />
  </Show>
));
