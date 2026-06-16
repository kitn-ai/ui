import { defineWebComponent } from './define';
import { FileTree, type FileTreeFile } from '../components/file-tree';

interface Props extends Record<string, unknown> {
  /** The files to render. Set as a JS property (array of `{ path, url?, code?, language?, type? }`). */
  files: FileTreeFile[];
  /** Selected file path — highlighted in the tree. */
  activeFile?: string;
  /** Folder paths expanded initially. Omit to start with all folders open. */
  defaultExpanded?: string[];
}

interface Events extends Record<string, unknown> {
  /** Fired when a file is selected. `detail.path` = the file's path. */
  'kc-select': { path: string };
}

/**
 * `<kc-file-tree>` — a collapsible, keyboard-navigable file explorer built from a
 * flat list of `/`-delimited paths (folders are derived). ARIA `tree`/`treeitem`.
 * Selecting a file fires a `select` event (`detail.path`). Fills its container.
 */
defineWebComponent<Props, Events>('kc-file-tree', {
  files: [],
  activeFile: undefined,
  defaultExpanded: undefined,
}, (props, { dispatch }) => (
  <>
    {/* Fill the container + own the scroll (see resizable.tsx fill technique:
        a definite `1fr` grid cell scoped to a wrapper, NOT :host, so the facade's
        sibling portal-mount div can't steal a grid track). */}
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
      <div class="overflow-auto scrollbar-thin py-1.5" style={{ 'min-height': '0' }}>
        <FileTree
          files={props.files}
          activeFile={props.activeFile}
          defaultExpanded={props.defaultExpanded}
          onSelect={(path) => dispatch('kc-select', { path })}
        />
      </div>
    </div>
  </>
));
