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
}

interface Events extends Record<string, unknown> {
  /** Fired when the preview navigates. `detail.url` = the new location. */
  navigate: { url: string };
  /** Fired when the Preview|Code tab changes. `detail.tab`. */
  tabchange: { tab: ArtifactTab };
  /** Fired when a file is selected. `detail.path`. */
  fileselect: { path: string };
}

/**
 * `<kc-artifact>` — a framed, switchable generated-artifact viewer: a sandboxed
 * preview iframe with a functional nav toolbar (back · forward · reload · home +
 * editable path field) and a Preview|Code toggle; the Code tab shows a file tree
 * (`<kc-file-tree>`) + the active file's source via `<kc-code-block>`. The
 * component self-navigates the iframe and emits `navigate` / `tabchange` /
 * `fileselect`. Designed to FILL its container (e.g. a `<kc-resizable>` panel).
 */
defineWebComponent<Props, Events>('kc-artifact', {
  src: undefined,
  files: [],
  tab: 'preview',
  activeFile: undefined,
  sandbox: 'allow-scripts allow-forms',
  iframeTitle: undefined,
}, (props, { dispatch }) => (
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
        onNavigate={(url) => dispatch('navigate', { url })}
        onTabChange={(tab) => dispatch('tabchange', { tab })}
        onFileSelect={(path) => dispatch('fileselect', { path })}
      />
    </div>
  </>
));
