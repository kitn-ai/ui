import { createSignal, onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from './define';
import { Artifact, type ArtifactFile, type ArtifactTab } from '../components/artifact';

interface Props extends Record<string, unknown> {
  /** URL the preview iframe frames. Consumer-controlled. */
  src?: string;
  /** Files for the Code tab tree + each file's preview `url`. Set as a JS property (array). */
  files: ArtifactFile[];
  /** Active tab: `preview` (default) or `code`. */
  tab?: ArtifactTab;
  /** Selected file path — syncs the tree highlight, Code source, and preview. */
  activeFile?: string;
  /** iframe `sandbox` override. Secure default `allow-scripts allow-forms` (NOT `allow-same-origin`). */
  sandbox?: string;
  /** Accessible title for the preview iframe. */
  iframeTitle?: string;
  /** Reflects the artifact's own maximized view-state (usually driven by the protocol). */
  maximized?: boolean;
  /** Show the expand-to-fill button (OPT-IN). */
  expandable?: boolean;
  /** Show the open-in-new-tab button (OPT-IN). */
  openInTab?: boolean;
  /** Hide back/forward. */
  noNav?: boolean;
  /** Hide reload. */
  noReload?: boolean;
  /** Hide home. */
  noHome?: boolean;
  /** Hide the address field. */
  noPathField?: boolean;
  /** Hide the Preview|Code toggle. */
  noTabs?: boolean;
  /** Standalone chrome: rounded corners + border (else square, borderless in-panel). */
  standalone?: boolean;
  /** Show the address but make it read-only (visible, nav-tracking, non-editable). */
  readonlyPath?: boolean;
}

interface Events extends Record<string, unknown> {
  /** Fired when the preview navigates. `detail.url` = the new location. */
  'kai-navigate': { url: string };
  /** Fired when the Preview|Code tab changes. `detail.tab`. */
  'kai-tab-change': { tab: ArtifactTab };
  /** Fired when a file is selected. `detail.path`. */
  'kai-file-select': { path: string };
  /** Artifact's own maximize button toggled (consumer-observable; non-bubbling). */
  'kai-maximize-change': { maximized: boolean };
}

/**
 * `<kai-artifact>` — a framed, switchable generated-artifact viewer: a sandboxed
 * preview iframe with a functional nav toolbar (back · forward · reload · home +
 * editable path field) and a Preview|Code toggle; the Code tab shows a file tree
 * (`<kai-file-tree>`) + the active file's source via `<kai-code-block>`. The
 * component self-navigates the iframe and emits `kai-navigate` / `kai-tab-change` /
 * `kai-file-select`. Designed to FILL its container (e.g. a `<kai-resizable>` panel).
 */
defineWebComponent<Props, Events>('kai-artifact', {
  src: undefined,
  files: [],
  tab: 'preview',
  activeFile: undefined,
  sandbox: 'allow-scripts allow-forms',
  iframeTitle: undefined,
  maximized: false,
  expandable: false,
  openInTab: false,
  noNav: false,
  noReload: false,
  noHome: false,
  noPathField: false,
  noTabs: false,
  standalone: false,
  readonlyPath: false,
}, (props, { element, dispatch, flag }) => {
  const [maximized, setMaximized] = createSignal(flag('maximized'));

  const onMaximizeChange = (next: boolean) => {
    setMaximized(next);
    // 1) The PROTOCOL intent — raw, bubbling + composed (NOT via dispatch()).
    element.dispatchEvent(
      new CustomEvent('kai-maximize-intent', { detail: { requested: next }, bubbles: true, composed: true }),
    );
    // 2) The PUBLIC observable event (non-bubbling, on the host).
    dispatch('kai-maximize-change', { maximized: next });
  };

  // Authoritative reconcile: the resizable tells us the effective state.
  onMount(() => {
    const onState = (e: Event) => setMaximized((e as CustomEvent<{ maximized: boolean }>).detail.maximized);
    element.addEventListener('kai-maximize-state', onState);
    onCleanup(() => element.removeEventListener('kai-maximize-state', onState));
  });

  return (
    <>
      {/* The artifact fills its container; the internal column flex (toolbar
          flex-shrink:0, body flex:1/min-height:0) is in the Solid component. Wrap
          in a definite `1fr` grid cell (NOT :host) so the facade's sibling
          portal-mount div can't steal a grid track — see resizable.tsx. */}
      <style>{':host{display:block;height:100%;min-height:0}'}</style>
      <div
        style={{
          display: 'grid',
          'grid-template-rows': 'minmax(0, 1fr)',
          'grid-template-columns': 'minmax(0, 1fr)',
          height: '100%',
          'min-height': '0',
        }}
      >
        <Artifact
          src={props.src}
          files={props.files}
          tab={props.tab}
          activeFile={props.activeFile}
          sandbox={props.sandbox}
          iframeTitle={props.iframeTitle}
          maximized={maximized()}
          expandable={flag('expandable')}
          openInTab={flag('openInTab')}
          showNav={!flag('noNav')}
          showReload={!flag('noReload')}
          showHome={!flag('noHome')}
          showPathField={!flag('noPathField')}
          showTabs={!flag('noTabs')}
          standalone={flag('standalone')}
          readonlyPath={flag('readonlyPath')}
          onMaximizeChange={onMaximizeChange}
          onNavigate={(url) => dispatch('kai-navigate', { url })}
          onTabChange={(tab) => dispatch('kai-tab-change', { tab })}
          onFileSelect={(path) => dispatch('kai-file-select', { path })}
        />
      </div>
    </>
  );
});
