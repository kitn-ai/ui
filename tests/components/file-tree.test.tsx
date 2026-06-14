// tests/components/file-tree.test.tsx
import { render, fireEvent } from '@solidjs/testing-library';
import {
  buildFileTree,
  FileTree,
  type FileTreeFile,
  type FileTreeFolderNode,
  type FileTreeFileNode,
} from '../../src/components/file-tree';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('buildFileTree', () => {
  test('builds nested folders from /-delimited paths', () => {
    const files: FileTreeFile[] = [
      { path: 'index.html' },
      { path: 'src/app.ts' },
      { path: 'src/lib/util.ts' },
    ];
    const tree = buildFileTree(files);
    // folders sort before files: [src(folder), index.html(file)]
    expect(tree.map((n) => `${n.kind}:${n.name}`)).toEqual(['folder:src', 'file:index.html']);

    const src = tree[0] as FileTreeFolderNode;
    expect(src.kind).toBe('folder');
    expect(src.path).toBe('src');
    // src children: lib(folder), app.ts(file)
    expect(src.children.map((n) => `${n.kind}:${n.name}`)).toEqual(['folder:lib', 'file:app.ts']);

    const lib = src.children[0] as FileTreeFolderNode;
    expect(lib.path).toBe('src/lib');
    const util = lib.children[0] as FileTreeFileNode;
    expect(util.kind).toBe('file');
    expect(util.path).toBe('src/lib/util.ts');
    expect(util.file.path).toBe('src/lib/util.ts');
  });

  test('reuses (de-dupes) shared folder nodes across files', () => {
    const tree = buildFileTree([{ path: 'a/b/x.ts' }, { path: 'a/b/y.ts' }, { path: 'a/c.ts' }]);
    expect(tree.length).toBe(1); // single root folder 'a'
    const a = tree[0] as FileTreeFolderNode;
    // a: [b(folder), c.ts(file)]
    expect(a.children.map((n) => n.name)).toEqual(['b', 'c.ts']);
    const b = a.children[0] as FileTreeFolderNode;
    expect(b.children.map((n) => n.name)).toEqual(['x.ts', 'y.ts']);
  });

  test('ignores empty/blank paths and trims leading/trailing slashes', () => {
    const tree = buildFileTree([{ path: '' }, { path: '/foo/bar.ts/' }]);
    expect(tree.length).toBe(1);
    const foo = tree[0] as FileTreeFolderNode;
    expect(foo.name).toBe('foo');
    expect((foo.children[0] as FileTreeFileNode).name).toBe('bar.ts');
  });

  test('carries file metadata onto the leaf node', () => {
    const tree = buildFileTree([
      { path: 'page.html', url: 'https://cdn/page.html', code: '<h1>', language: 'html', type: 'html' },
    ]);
    const leaf = tree[0] as FileTreeFileNode;
    expect(leaf.file.url).toBe('https://cdn/page.html');
    expect(leaf.file.type).toBe('html');
    expect(leaf.file.language).toBe('html');
  });
});

describe('<FileTree>', () => {
  const files: FileTreeFile[] = [
    { path: 'index.html', type: 'html' },
    { path: 'src/app.ts', type: 'other' },
    { path: 'src/styles.css', type: 'other' },
  ];

  test('renders an ARIA tree with treeitems', () => {
    const { getByRole, getAllByRole } = render(() => <FileTree files={files} />);
    expect(getByRole('tree')).toBeTruthy();
    // folders open by default → src folder + its 2 files + index.html = 4 treeitems
    const items = getAllByRole('treeitem');
    expect(items.length).toBe(4);
  });

  test('selecting a file fires onSelect with path + file', () => {
    let picked: { path: string; file: FileTreeFile } | null = null;
    const { getAllByRole } = render(() => (
      <FileTree files={files} onSelect={(path, file) => (picked = { path, file })} />
    ));
    // find the index.html row
    const indexRow = getAllByRole('treeitem').find((el) => el.textContent?.includes('index.html'))!;
    fireEvent.click(indexRow);
    expect(picked).not.toBeNull();
    expect(picked!.path).toBe('index.html');
    expect(picked!.file.type).toBe('html');
  });

  test('clicking a folder collapses/expands it (aria-expanded + child visibility)', () => {
    const { getAllByRole, queryByText } = render(() => <FileTree files={files} />);
    const folder = getAllByRole('treeitem').find((el) => el.getAttribute('data-tree-kind') === 'folder')!;
    expect(folder.getAttribute('aria-expanded')).toBe('true');
    expect(queryByText('app.ts')).toBeTruthy();
    fireEvent.click(folder);
    expect(folder.getAttribute('aria-expanded')).toBe('false');
    expect(queryByText('app.ts')).toBeNull();
  });

  test('active file is marked aria-selected', () => {
    const { getAllByRole } = render(() => <FileTree files={files} activeFile="src/app.ts" />);
    const active = getAllByRole('treeitem').find((el) => el.getAttribute('aria-selected') === 'true')!;
    expect(active.textContent).toContain('app.ts');
  });

  test('respects defaultExpanded (folders not listed start collapsed)', () => {
    const { getAllByRole, queryByText } = render(() => (
      <FileTree files={files} defaultExpanded={[]} />
    ));
    const folder = getAllByRole('treeitem').find((el) => el.getAttribute('data-tree-kind') === 'folder')!;
    expect(folder.getAttribute('aria-expanded')).toBe('false');
    expect(queryByText('app.ts')).toBeNull();
  });
});
