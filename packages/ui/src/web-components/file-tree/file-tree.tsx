import { defineWebComponent } from '../define/define';
import { FileTree, type FileTreeFile } from '../../components/file/file-tree';

interface Props extends Record<string, unknown> {
  /** The files to render. Set as a JS property (array of `{ path, url?, code?, language?, type?, additions?, deletions?, status? }`). */
  files: FileTreeFile[];
  /** Selected file path, highlighted in the tree. */
  activeFile?: string;
  /** Folder paths expanded initially. Omit to start with all folders open. */
  defaultExpanded?: string[];
  /** Show a changed-files summary header (file count + summed `+/-` + Collapse-all). Attribute: `summary`. Off by default. */
  summary?: boolean;
}

interface Events extends Record<string, unknown> {
  /** Fired when a file is selected. `detail.path` = the file's path. */
  'kai-select': { path: string };
}

/**
 * A collapsible, keyboard-navigable file explorer built from a flat list of paths.
 */
defineWebComponent<Props, Events>('kai-file-tree', {
  files: [],
  activeFile: undefined,
  defaultExpanded: undefined,
  summary: false,
}, (props, { dispatch, flag }) => (
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
      <div class="overflow-auto kai-scrollbar-thin py-1.5" style={{ 'min-height': '0' }}>
        <FileTree
          files={props.files}
          activeFile={props.activeFile}
          defaultExpanded={props.defaultExpanded}
          summary={flag('summary')}
          onSelect={(path) => dispatch('kai-select', { path })}
        />
      </div>
    </div>
  </>
));
