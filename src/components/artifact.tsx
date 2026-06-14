import {
  type JSX,
  splitProps,
  mergeProps,
  createSignal,
  createEffect,
  createMemo,
  on,
  onMount,
  onCleanup,
  Show,
} from 'solid-js';
import { cn } from '../utils/cn';
import { Button } from '../ui/button';
import { CodeBlock, CodeBlockCode } from './code-block';
import { FileTree, type FileTreeFile } from './file-tree';
import { Loader } from './loader';
import { isPdfPreviewEnabled, renderPdfInto } from '../primitives/pdf-preview';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  House,
  Eye,
  Code as CodeIcon,
  FileText,
  ExternalLink,
  Download,
} from 'lucide-solid';

export type ArtifactTab = 'preview' | 'code';

/** A file the artifact can preview + show source for. */
export type ArtifactFile = FileTreeFile;

export interface ArtifactProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** URL the preview iframe frames. */
  src?: string;
  /** Files for the Code tab's tree (+ each file's preview `url`). */
  files?: ArtifactFile[];
  /** Active tab. Default `preview`. */
  tab?: ArtifactTab;
  /** Selected file path (syncs tree highlight + Code source + preview). */
  activeFile?: string;
  /** iframe `sandbox` override. Default `allow-scripts allow-forms`. */
  sandbox?: string;
  /** Accessible iframe title. */
  iframeTitle?: string;
  /** Fired when the preview navigates (back/forward/reload/path-edit/file-click). */
  onNavigate?: (url: string) => void;
  /** Fired when the Preview|Code tab changes. */
  onTabChange?: (tab: ArtifactTab) => void;
  /** Fired when a file is selected in the tree. */
  onFileSelect?: (path: string) => void;
}

const DEFAULT_SANDBOX = 'allow-scripts allow-forms';

/** Resolve a file's preview URL: explicit `url`, else `<src-origin> + /path`. */
function resolveFileUrl(file: ArtifactFile, src: string | undefined): string {
  if (file.url) return file.url;
  if (!src) return file.path;
  try {
    return new URL(file.path, src).href;
  } catch {
    return file.path;
  }
}

/** True when `url` should render as a PDF: a matching `files` entry is typed
 *  `'pdf'`, or the URL path (query/hash stripped) ends in `.pdf`. */
export function isPdfUrl(url: string, files: ArtifactFile[]): boolean {
  if (!url) return false;
  const match = files.find((f) => f.url === url || f.path === url);
  if (match?.type === 'pdf') return true;
  const path = url.split(/[?#]/)[0];
  return /\.pdf$/i.test(path);
}

/**
 * `Artifact` — a framed, switchable generated-artifact viewer. A functional nav
 * toolbar (back · forward · reload · home + editable path field + Preview|Code
 * toggle) over a sandboxed `<iframe>` (Preview) or a file-tree + `<kc-code-block>`
 * (Code). The component self-navigates the iframe and emits `navigate` /
 * `tabchange` / `fileselect` so a consumer can observe/sync.
 */
export function Artifact(props: ArtifactProps): JSX.Element {
  const merged = mergeProps(
    { files: [] as ArtifactFile[], tab: 'preview' as ArtifactTab, sandbox: DEFAULT_SANDBOX },
    props,
  );
  const [local, rest] = splitProps(merged, [
    'src',
    'files',
    'tab',
    'activeFile',
    'sandbox',
    'iframeTitle',
    'onNavigate',
    'onTabChange',
    'onFileSelect',
    'class',
  ]);

  // A sandboxed iframe WITHOUT `allow-same-origin` makes the framed document's
  // `contentWindow.history`/`location` opaque (a deliberate security property —
  // see the spec). So the component keeps its OWN history stack for the
  // navigations it initiates (path-edit, file-click, home, src changes) and
  // back/forward/reload operate on that. (In-frame relative-link clicks navigate
  // the iframe itself but can't be observed cross-origin — a known, accepted
  // sandbox limitation; opt into `allow-same-origin` if the consumer trusts the
  // artifact and wants those tracked.)
  const [history, setHistory] = createSignal<string[]>(local.src ? [local.src] : []);
  const [cursor, setCursor] = createSignal(local.src ? 0 : -1);
  const currentUrl = () => history()[cursor()] ?? '';
  const canBack = () => cursor() > 0;
  const canForward = () => cursor() < history().length - 1;

  const [tab, setTab] = createSignal<ArtifactTab>(local.tab);
  const [activeFile, setActiveFile] = createSignal<string | undefined>(local.activeFile);
  const [reloadKey, setReloadKey] = createSignal(0);

  let iframeEl: HTMLIFrameElement | undefined;

  // Controlled syncing: when the consumer changes the props, follow them.
  createEffect(() => setTab(local.tab));
  createEffect(() => setActiveFile(local.activeFile));
  // `src` change → navigate. Use `on(local.src, …)` so the effect tracks ONLY
  // the `src` prop — NOT `currentUrl()` — otherwise navigating away (file click,
  // path edit) would re-trigger it and snap the iframe back to `src`. Skip the
  // initial run: history is already seeded with `src` and the iframe binds it.
  createEffect(
    on(
      () => local.src,
      (next) => {
        if (next && next !== currentUrl()) navigate(next);
      },
      { defer: true },
    ),
  );

  const fileFor = (path: string | undefined): ArtifactFile | undefined =>
    path === undefined ? undefined : local.files.find((f) => f.path === path);

  const activeFileObj = createMemo(() => fileFor(activeFile()));
  // Code applies only to text-ish files that carry source.
  const hasSource = createMemo(() => {
    const f = activeFileObj();
    return !!f && f.type !== 'image' && f.type !== 'pdf' && typeof f.code === 'string';
  });

  /** Push a new entry (truncating any forward history) and load it. */
  function navigate(url: string) {
    if (url === currentUrl()) {
      reload();
      return;
    }
    setHistory((h) => [...h.slice(0, cursor() + 1), url]);
    setCursor((c) => c + 1);
    loadCurrent();
  }

  /** Point the iframe at the current cursor entry + emit `navigate`. */
  function loadCurrent() {
    const url = currentUrl();
    if (iframeEl) iframeEl.src = url || 'about:blank';
    local.onNavigate?.(url);
  }

  function selectTab(next: ArtifactTab) {
    if (next === tab()) return;
    setTab(next);
    local.onTabChange?.(next);
  }

  function selectFile(path: string, file: ArtifactFile) {
    setActiveFile(path);
    local.onFileSelect?.(path);
    navigate(resolveFileUrl(file, local.src));
  }

  // Toolbar actions — operate on the component's own history stack (see above).
  const goBack = () => {
    if (!canBack()) return;
    setCursor((c) => c - 1);
    loadCurrent();
  };
  const goForward = () => {
    if (!canForward()) return;
    setCursor((c) => c + 1);
    loadCurrent();
  };
  function reload() {
    const url = currentUrl();
    if (iframeEl) {
      // Force a real reload even when the src is unchanged.
      iframeEl.src = 'about:blank';
      iframeEl.src = url || 'about:blank';
    }
    setReloadKey((k) => k + 1); // re-render the inline PDF viewer too
    local.onNavigate?.(url);
  }
  const goHome = () => {
    if (local.src) navigate(local.src);
  };

  // Best-effort: if the consumer opted into `allow-same-origin`, keep the path
  // field truthful as the framed doc navigates itself. Cross-origin (the secure
  // default) throws and we keep our own stack.
  const onIframeLoad = () => {
    try {
      const href = iframeEl?.contentWindow?.location.href;
      if (href && href !== 'about:blank' && href !== currentUrl()) {
        setHistory((h) => [...h.slice(0, cursor() + 1), href]);
        setCursor((c) => c + 1);
        local.onNavigate?.(href);
      }
    } catch {
      /* cross-origin (sandboxed without allow-same-origin): keep our own url */
    }
  };

  const submitPath = (e: Event) => {
    e.preventDefault();
    const input = (e.currentTarget as HTMLFormElement).elements.namedItem(
      'kc-artifact-path',
    ) as HTMLInputElement | null;
    if (input && input.value) navigate(input.value);
  };

  return (
    <div
      class={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground',
        local.class,
      )}
      {...rest}
    >
      <ArtifactToolbar
        url={currentUrl}
        tab={tab}
        canBack={canBack}
        canForward={canForward}
        canHome={() => !!local.src}
        onBack={goBack}
        onForward={goForward}
        onReload={reload}
        onHome={goHome}
        onSubmitPath={submitPath}
        onTab={selectTab}
      />
      <div class="relative min-h-0 flex-1">
        <Show
          when={tab() === 'preview'}
          fallback={
            <ArtifactCode
              files={local.files}
              activeFile={activeFile}
              activeFileObj={activeFileObj}
              hasSource={hasSource}
              onSelect={selectFile}
            />
          }
        >
          <Show
            when={isPdfUrl(currentUrl(), local.files)}
            fallback={
              <ArtifactPreview
                ref={(el) => (iframeEl = el)}
                src={currentUrl}
                sandbox={local.sandbox}
                title={local.iframeTitle ?? 'Artifact preview'}
                onLoad={onIframeLoad}
              />
            }
          >
            <ArtifactPdfPreview url={currentUrl()} reloadKey={reloadKey()} />
          </Show>
        </Show>
      </div>
    </div>
  );
}

// --- ArtifactToolbar (internal) -------------------------------------------

interface ToolbarProps {
  url: () => string;
  tab: () => ArtifactTab;
  canBack: () => boolean;
  canForward: () => boolean;
  canHome: () => boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onHome: () => void;
  onSubmitPath: (e: Event) => void;
  onTab: (tab: ArtifactTab) => void;
}

function ArtifactToolbar(props: ToolbarProps): JSX.Element {
  return (
    <div class="flex shrink-0 items-center gap-1.5 border-b border-border bg-muted/40 px-2 py-1.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Back"
        disabled={!props.canBack()}
        onClick={() => props.onBack()}
      >
        <ArrowLeft size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Forward"
        disabled={!props.canForward()}
        onClick={() => props.onForward()}
      >
        <ArrowRight size={16} aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Reload" onClick={() => props.onReload()}>
        <RotateCw size={15} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Home"
        disabled={!props.canHome()}
        onClick={() => props.onHome()}
      >
        <House size={15} aria-hidden="true" />
      </Button>
      <form class="min-w-0 flex-1" onSubmit={(e) => props.onSubmitPath(e)}>
        <label class="sr-only" for="kc-artifact-path">
          Address
        </label>
        <input
          id="kc-artifact-path"
          name="kc-artifact-path"
          type="text"
          spellcheck={false}
          autocomplete="off"
          value={props.url()}
          class={cn(
            'h-7 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground',
            'font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          placeholder="Enter a path or URL…"
        />
      </form>
      <div
        role="tablist"
        aria-label="View"
        class="flex shrink-0 items-center gap-0.5 rounded-md bg-muted p-0.5"
      >
        <SegmentButton
          label="Preview"
          icon={<Eye size={14} aria-hidden="true" />}
          selected={props.tab() === 'preview'}
          onClick={() => props.onTab('preview')}
        />
        <SegmentButton
          label="Code"
          icon={<CodeIcon size={14} aria-hidden="true" />}
          selected={props.tab() === 'code'}
          onClick={() => props.onTab('code')}
        />
      </div>
    </div>
  );
}

function SegmentButton(props: {
  label: string;
  icon: JSX.Element;
  selected: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.selected}
      class={cn(
        'inline-flex h-6 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring',
        props.selected
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
      onClick={() => props.onClick()}
    >
      {props.icon}
      {props.label}
    </button>
  );
}

// --- ArtifactPreview (internal) -------------------------------------------

interface PreviewProps {
  ref: (el: HTMLIFrameElement) => void;
  src: () => string;
  sandbox: string;
  title: string;
  onLoad: () => void;
}

function ArtifactPreview(props: PreviewProps): JSX.Element {
  return (
    <iframe
      ref={props.ref}
      src={props.src() || 'about:blank'}
      sandbox={props.sandbox}
      title={props.title}
      class="absolute inset-0 h-full w-full border-0 bg-white"
      onLoad={() => props.onLoad()}
    />
  );
}

// --- ArtifactCode (internal) ----------------------------------------------

interface CodeProps {
  files: ArtifactFile[];
  activeFile: () => string | undefined;
  activeFileObj: () => ArtifactFile | undefined;
  hasSource: () => boolean;
  onSelect: (path: string, file: ArtifactFile) => void;
}

function ArtifactCode(props: CodeProps): JSX.Element {
  return (
    <div class="absolute inset-0 flex">
      <div class="w-56 shrink-0 overflow-auto border-r border-border bg-muted/20 py-1.5 scrollbar-thin">
        <FileTree
          files={props.files}
          activeFile={props.activeFile()}
          onSelect={(path, file) => props.onSelect(path, file)}
        />
      </div>
      <div class="min-w-0 flex-1 overflow-auto scrollbar-thin">
        <Show
          when={props.activeFileObj()}
          fallback={
            <div class="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
              Select a file to view its source.
            </div>
          }
        >
          <Show
            when={props.hasSource()}
            fallback={
              <div class="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                No source — this file ({props.activeFileObj()!.type ?? 'binary'}) has no code view.
              </div>
            }
          >
            <CodeBlock class="h-full rounded-none border-0">
              <CodeBlockCode
                code={props.activeFileObj()!.code ?? ''}
                language={props.activeFileObj()!.language}
              />
            </CodeBlock>
          </Show>
        </Show>
      </div>
    </div>
  );
}

// --- ArtifactPdfFallback (internal) ---------------------------------------

/** Shown when inline PDF rendering is disabled or fails (CORS / load / parse). */
function ArtifactPdfFallback(props: { url: string }): JSX.Element {
  const name = () => {
    const path = props.url.split(/[?#]/)[0];
    return path.slice(path.lastIndexOf('/') + 1) || 'document.pdf';
  };
  const linkClass =
    'inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <div
      role="region"
      aria-label="PDF preview unavailable"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-6 text-center"
    >
      <FileText size={40} class="text-muted-foreground" aria-hidden="true" />
      <div class="text-sm font-medium text-foreground">{name()}</div>
      <div class="text-xs text-muted-foreground">Can't preview this PDF inline.</div>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <a class={linkClass} href={props.url} target="_blank" rel="noopener noreferrer">
          Open in new tab
          <ExternalLink size={13} aria-hidden="true" />
        </a>
        <a class={linkClass} href={props.url} download="">
          <Download size={13} aria-hidden="true" />
          Download
        </a>
      </div>
    </div>
  );
}

// --- ArtifactPdfPreview (internal) ----------------------------------------

/**
 * Renders a PDF inline via pdf.js (loaded on demand). Four states:
 * disabled → fallback (no network); loading → spinner; success → stacked
 * fit-width canvases; error (load/CORS/parse) → fallback card. Re-renders when
 * the url or `reloadKey` changes, and (debounced) when the panel resizes.
 */
function ArtifactPdfPreview(props: { url: string; reloadKey: number }): JSX.Element {
  const [state, setState] = createSignal<'loading' | 'success' | 'error'>('loading');
  let container: HTMLDivElement | undefined;
  let token = 0;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  const renderNow = async () => {
    if (!isPdfPreviewEnabled() || !container) {
      setState('error');
      return;
    }
    const mine = ++token;
    setState('loading');
    try {
      const width = container.clientWidth || 600;
      await renderPdfInto(props.url, container, width);
      if (mine === token) setState('success');
    } catch {
      if (mine === token) setState('error');
    }
  };

  createEffect(
    on(
      () => [props.url, props.reloadKey] as const,
      () => {
        void renderNow();
      },
    ),
  );

  onMount(() => {
    if (!container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (state() !== 'success') return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => void renderNow(), 200);
    });
    ro.observe(container);
    onCleanup(() => {
      ro.disconnect();
      clearTimeout(resizeTimer);
      token++; // cancel any in-flight render
    });
  });

  return (
    <div class="absolute inset-0">
      {/* Always present so clientWidth is the real panel width. */}
      <div
        ref={(el) => (container = el)}
        role="region"
        aria-label="PDF preview"
        aria-busy={state() === 'loading'}
        tabindex="0"
        class="absolute inset-0 flex flex-col items-center gap-3 overflow-auto bg-muted/20 p-3 scrollbar-thin focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      />
      <Show when={isPdfPreviewEnabled() && state() === 'loading'}>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader variant="circular" size="md" />
        </div>
      </Show>
      <Show when={!isPdfPreviewEnabled() || state() === 'error'}>
        <ArtifactPdfFallback url={props.url} />
      </Show>
    </div>
  );
}
