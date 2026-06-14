import {
  type JSX,
  For,
  Show,
  splitProps,
  createSignal,
  createMemo,
  mergeProps,
} from 'solid-js';
import { cn } from '../utils/cn';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  FileImage,
  FileType,
  File as FileIcon,
} from 'lucide-solid';

/** A single artifact file the tree can show + the preview can load. */
export interface FileTreeFile {
  /** Tree label/key. Folders are built from `/`-delimited segments. */
  path: string;
  /** Where the preview loads it (CDN/S3/dev-server/API). */
  url?: string;
  /** Source for the Code tab. */
  code?: string;
  /** Language id for syntax highlighting (e.g. `html`, `css`, `tsx`). */
  language?: string;
  /** Kind — drives the icon + whether Code applies. */
  type?: 'html' | 'pdf' | 'image' | 'other';
}

/** A folder node in the built tree. */
export interface FileTreeFolderNode {
  kind: 'folder';
  /** Last path segment (the folder's display name). */
  name: string;
  /** Full `/`-joined path to this folder (stable key). */
  path: string;
  children: FileTreeNode[];
}

/** A leaf (file) node in the built tree. */
export interface FileTreeFileNode {
  kind: 'file';
  name: string;
  path: string;
  file: FileTreeFile;
}

export type FileTreeNode = FileTreeFolderNode | FileTreeFileNode;

/**
 * Build a nested folder/file tree from a flat list of `/`-delimited paths.
 *
 * - `a/b/c.html` nests `c.html` under `b` under `a`.
 * - Folders are de-duplicated and reused across files.
 * - Insertion order is preserved per level, with folders sorted before files
 *   and each group sorted alphabetically (case-insensitive) for a stable,
 *   readable tree regardless of input order.
 */
export function buildFileTree(files: FileTreeFile[]): FileTreeNode[] {
  const root: FileTreeFolderNode = { kind: 'folder', name: '', path: '', children: [] };

  for (const file of files) {
    const segments = file.path.split('/').filter((s) => s.length > 0);
    if (segments.length === 0) continue;

    let cursor = root;
    // Walk/create folder nodes for every segment except the last (the file).
    for (let i = 0; i < segments.length - 1; i++) {
      const name = segments[i];
      const folderPath = segments.slice(0, i + 1).join('/');
      let next = cursor.children.find(
        (c): c is FileTreeFolderNode => c.kind === 'folder' && c.name === name,
      );
      if (!next) {
        next = { kind: 'folder', name, path: folderPath, children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    }

    const leafName = segments[segments.length - 1];
    // De-dupe by path: last write wins (a re-declared file updates its node).
    const existing = cursor.children.find(
      (c): c is FileTreeFileNode => c.kind === 'file' && c.name === leafName,
    );
    if (existing) {
      existing.file = file;
    } else {
      cursor.children.push({ kind: 'file', name: leafName, path: file.path, file });
    }
  }

  sortTree(root.children);
  return root.children;
}

/** Folders first, then files; each group alphabetical (case-insensitive). */
function sortTree(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  for (const n of nodes) if (n.kind === 'folder') sortTree(n.children);
}

/** Flatten the visible (expanded-aware) leaves in render order — used for keyboard nav. */
function flattenVisible(
  nodes: FileTreeNode[],
  isOpen: (path: string) => boolean,
  out: FileTreeNode[] = [],
): FileTreeNode[] {
  for (const n of nodes) {
    out.push(n);
    if (n.kind === 'folder' && isOpen(n.path)) flattenVisible(n.children, isOpen, out);
  }
  return out;
}

function iconFor(type: FileTreeFile['type']) {
  switch (type) {
    case 'image':
      return FileImage;
    case 'pdf':
      return FileType;
    case 'html':
      return FileText;
    default:
      return FileIcon;
  }
}

export interface FileTreeProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Flat file list; folders are derived from `/`-delimited paths. */
  files: FileTreeFile[];
  /** Currently-selected file path (highlighted). */
  activeFile?: string;
  /** Called with a file's path when the user selects it. */
  onSelect?: (path: string, file: FileTreeFile) => void;
  /** Folder paths expanded by default. When omitted, all folders start open. */
  defaultExpanded?: string[];
}

/**
 * `FileTree` — a collapsible, keyboard-navigable file explorer built from a flat
 * list of `/`-delimited paths. ARIA `tree`/`treeitem`/`group`. Selecting a file
 * calls `onSelect(path, file)`.
 */
export function FileTree(props: FileTreeProps): JSX.Element {
  const merged = mergeProps({ files: [] as FileTreeFile[] }, props);
  const [local, rest] = splitProps(merged, [
    'files',
    'activeFile',
    'onSelect',
    'defaultExpanded',
    'class',
  ]);

  const tree = createMemo(() => buildFileTree(local.files));

  // Open-state semantics differ by mode so the default is robust to files that
  // arrive AFTER mount (the element sets `files` as a property post-construction):
  //   - explicit `defaultExpanded` → an OPEN set (only listed folders open).
  //   - no `defaultExpanded` (default = all open) → a CLOSED set: every folder is
  //     open unless the user explicitly collapsed it, so late-discovered nested
  //     folders are open by default without re-seeding on each `files` change.
  const defaultAllOpen = () => local.defaultExpanded === undefined;
  const [openSet, setOpenSet] = createSignal<Set<string>>(
    new Set(local.defaultExpanded ?? []),
    { equals: false },
  );
  const [closedSet, setClosedSet] = createSignal<Set<string>>(new Set(), { equals: false });

  const isOpen = (path: string) =>
    defaultAllOpen() ? !closedSet().has(path) : openSet().has(path);

  const toggle = (path: string) => {
    if (defaultAllOpen()) {
      setClosedSet((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });
    } else {
      setOpenSet((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });
    }
  };

  const [focusedPath, setFocusedPath] = createSignal<string | undefined>();

  const selectFile = (node: FileTreeFileNode) => {
    setFocusedPath(node.path);
    local.onSelect?.(node.path, node.file);
  };

  const onKeyDown = (e: KeyboardEvent, node: FileTreeNode) => {
    const visible = flattenVisible(tree(), isOpen);
    const idx = visible.findIndex((n) => n.path === node.path && n.kind === node.kind);
    const focus = (n: FileTreeNode | undefined) => {
      if (!n) return;
      setFocusedPath(n.path);
      const sel = `[data-tree-path="${cssEscape(n.path)}"][data-tree-kind="${n.kind}"]`;
      (e.currentTarget as HTMLElement)
        .closest('[role="tree"]')
        ?.querySelector<HTMLElement>(sel)
        ?.focus();
    };
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focus(visible[idx + 1]);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focus(visible[idx - 1]);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (node.kind === 'folder') {
          if (!isOpen(node.path)) toggle(node.path);
          else focus(visible[idx + 1]);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (node.kind === 'folder' && isOpen(node.path)) {
          toggle(node.path);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (node.kind === 'folder') toggle(node.path);
        else selectFile(node);
        break;
    }
  };

  return (
    <div
      role="tree"
      aria-label="Files"
      class={cn('text-sm select-none', local.class)}
      {...rest}
    >
      <For each={tree()}>
        {(node) => (
          <TreeNode
            node={node}
            depth={0}
            isOpen={isOpen}
            toggle={toggle}
            activeFile={() => local.activeFile}
            focusedPath={focusedPath}
            onSelectFile={selectFile}
            onKeyDown={onKeyDown}
          />
        )}
      </For>
    </div>
  );
}

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  isOpen: (path: string) => boolean;
  toggle: (path: string) => void;
  activeFile: () => string | undefined;
  focusedPath: () => string | undefined;
  onSelectFile: (node: FileTreeFileNode) => void;
  onKeyDown: (e: KeyboardEvent, node: FileTreeNode) => void;
}

function TreeNode(props: TreeNodeProps): JSX.Element {
  const node = () => props.node;
  const open = () => props.node.kind === 'folder' && props.isOpen(props.node.path);
  const isActive = () =>
    props.node.kind === 'file' && props.activeFile() === props.node.path;
  // Roving tabindex: the focused row (or the active file as a fallback) is the
  // single tab stop into the tree.
  const tabIndex = () => {
    const focused = props.focusedPath();
    if (focused !== undefined) return props.node.path === focused ? 0 : -1;
    return isActive() ? 0 : -1;
  };

  const indent = () => ({ 'padding-left': `${props.depth * 12 + 8}px` });

  return (
    <Show
      when={props.node.kind === 'folder'}
      fallback={
        <div
          role="treeitem"
          aria-selected={isActive()}
          data-tree-path={props.node.path}
          data-tree-kind="file"
          tabindex={tabIndex()}
          class={cn(
            'flex items-center gap-1.5 rounded-md py-1 pr-2 cursor-pointer outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            isActive()
              ? 'bg-primary/10 text-foreground font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
          style={indent()}
          onClick={() => props.onSelectFile(props.node as FileTreeFileNode)}
          onKeyDown={(e) => props.onKeyDown(e, props.node)}
        >
          <span class="w-3.5 shrink-0" />
          {(() => {
            const Icon = iconFor((props.node as FileTreeFileNode).file.type);
            return <Icon size={14} class="shrink-0 opacity-70" aria-hidden="true" />;
          })()}
          <span class="truncate">{node().name}</span>
        </div>
      }
    >
      <div role="none">
        <div
          role="treeitem"
          aria-expanded={open()}
          data-tree-path={props.node.path}
          data-tree-kind="folder"
          tabindex={tabIndex()}
          class={cn(
            'flex items-center gap-1.5 rounded-md py-1 pr-2 cursor-pointer outline-none text-foreground',
            'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          )}
          style={indent()}
          onClick={() => props.toggle(props.node.path)}
          onKeyDown={(e) => props.onKeyDown(e, props.node)}
        >
          <ChevronRight
            size={14}
            class={cn('shrink-0 transition-transform opacity-70', open() && 'rotate-90')}
            aria-hidden="true"
          />
          {(() => {
            const Icon = open() ? FolderOpen : Folder;
            return <Icon size={14} class="shrink-0 text-primary/80" aria-hidden="true" />;
          })()}
          <span class="truncate font-medium">{node().name}</span>
        </div>
        <Show when={open()}>
          <div role="group">
            <For each={(props.node as FileTreeFolderNode).children}>
              {(child) => (
                <TreeNode
                  node={child}
                  depth={props.depth + 1}
                  isOpen={props.isOpen}
                  toggle={props.toggle}
                  activeFile={props.activeFile}
                  focusedPath={props.focusedPath}
                  onSelectFile={props.onSelectFile}
                  onKeyDown={props.onKeyDown}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
}

/** Minimal CSS.escape fallback for attribute-selector building (paths with `/`, `.`). */
function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s);
  return s.replace(/["\\]/g, '\\$&');
}
