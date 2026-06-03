import { type JSX, splitProps, createSignal, createContext, useContext, onCleanup, children as resolveChildren } from 'solid-js';
import { cn } from '../utils/cn';

// --- Types ---

type Orientation = 'horizontal' | 'vertical';

interface ResizableContextValue {
  orientation: Orientation;
  registerPanel: (id: string, opts: { defaultSize?: number; minSize?: number; maxSize?: number }) => void;
}

const ResizableContext = createContext<ResizableContextValue>();

// --- ResizablePanelGroup ---

export interface ResizablePanelGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  orientation?: Orientation;
  children: JSX.Element;
}

function ResizablePanelGroup(props: ResizablePanelGroupProps) {
  const [local, rest] = splitProps(props, ['orientation', 'children', 'class']);
  const orientation = () => local.orientation ?? 'horizontal';

  return (
    <ResizableContext.Provider value={{ orientation: orientation(), registerPanel: () => {} }}>
      <div
        class={cn(
          'flex h-full w-full',
          orientation() === 'vertical' ? 'flex-col' : 'flex-row',
          local.class
        )}
        data-orientation={orientation()}
        {...rest}
      >
        {local.children}
      </div>
    </ResizableContext.Provider>
  );
}

// --- ResizablePanel ---

export interface ResizablePanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  children: JSX.Element;
}

function ResizablePanel(props: ResizablePanelProps) {
  const [local, rest] = splitProps(props, ['defaultSize', 'minSize', 'maxSize', 'children', 'class', 'style']);

  const sizeStyle = () => {
    const s = local.defaultSize;
    if (s !== undefined) {
      return { 'flex-basis': `${s}%`, 'flex-grow': '0', 'flex-shrink': '0' };
    }
    return { flex: '1 1 0%' };
  };

  return (
    <div
      class={cn('overflow-hidden', local.class)}
      style={{ ...sizeStyle(), ...(typeof local.style === 'object' ? local.style : {}) }}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// --- ResizableHandle ---

export interface ResizableHandleProps extends JSX.HTMLAttributes<HTMLDivElement> {
  withHandle?: boolean;
  onPanelResize?: (delta: number) => void;
}

function ResizableHandle(props: ResizableHandleProps) {
  const [local, rest] = splitProps(props, ['withHandle', 'onPanelResize', 'class']);
  const ctx = useContext(ResizableContext);
  const orientation = () => ctx?.orientation ?? 'horizontal';
  const [isDragging, setIsDragging] = createSignal(false);

  let startPos = 0;
  let prevEl: HTMLElement | null = null;
  let nextEl: HTMLElement | null = null;
  let prevSize = 0;
  let nextSize = 0;

  const handlePointerDown = (e: PointerEvent) => {
    const handle = e.currentTarget as HTMLElement;
    prevEl = handle.previousElementSibling as HTMLElement;
    nextEl = handle.nextElementSibling as HTMLElement;

    if (!prevEl || !nextEl) return;

    e.preventDefault();
    setIsDragging(true);
    handle.setPointerCapture(e.pointerId);

    if (orientation() === 'horizontal') {
      startPos = e.clientX;
      prevSize = prevEl.getBoundingClientRect().width;
      nextSize = nextEl.getBoundingClientRect().width;
    } else {
      startPos = e.clientY;
      prevSize = prevEl.getBoundingClientRect().height;
      nextSize = nextEl.getBoundingClientRect().height;
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging() || !prevEl || !nextEl) return;

    const currentPos = orientation() === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPos - startPos;

    const newPrevSize = prevSize + delta;
    const newNextSize = nextSize - delta;

    // Get min/max from data attributes or use defaults
    const prevMin = parseInt(prevEl.dataset.minSize || '0', 10);
    const prevMax = parseInt(prevEl.dataset.maxSize || '999999', 10);
    const nextMin = parseInt(nextEl.dataset.minSize || '0', 10);
    const nextMax = parseInt(nextEl.dataset.maxSize || '999999', 10);

    if (newPrevSize < prevMin || newNextSize < nextMin || newPrevSize > prevMax || newNextSize > nextMax) return;

    prevEl.style.flexBasis = `${newPrevSize}px`;
    prevEl.style.flexGrow = '0';
    prevEl.style.flexShrink = '0';
    nextEl.style.flexBasis = `${newNextSize}px`;
    nextEl.style.flexGrow = '0';
    nextEl.style.flexShrink = '0';

    local.onPanelResize?.(delta);
  };

  const handlePointerUp = () => {
    // Convert pixel flex-basis to percentages so panels scale with window resize
    if (prevEl && nextEl) {
      const container = prevEl.parentElement;
      if (container) {
        const totalSize = orientation() === 'horizontal'
          ? container.getBoundingClientRect().width
          : container.getBoundingClientRect().height;
        const handleSize = (prevEl.nextElementSibling as HTMLElement)?.getBoundingClientRect()[
          orientation() === 'horizontal' ? 'width' : 'height'
        ] ?? 0;
        const available = totalSize - handleSize;
        if (available > 0) {
          const prevPct = (prevEl.getBoundingClientRect()[orientation() === 'horizontal' ? 'width' : 'height'] / available) * 100;
          const nextPct = 100 - prevPct;
          prevEl.style.flexBasis = `${prevPct}%`;
          nextEl.style.flexBasis = `${nextPct}%`;
        }
      }
    }
    setIsDragging(false);
    prevEl = null;
    nextEl = null;
  };

  const isHoriz = () => orientation() === 'horizontal';

  return (
    <div
      class={cn(
        'relative flex items-center justify-center',
        local.class
      )}
      style={{
        cursor: isHoriz() ? 'col-resize' : 'row-resize',
        [isHoriz() ? 'width' : 'height']: '8px',
        'background': isDragging() ? 'var(--color-muted-foreground, #98989f)' : 'transparent',
        'opacity': isDragging() ? '0.3' : '1',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="separator"
      tabIndex={0}
      data-orientation={orientation()}
      {...rest}
    >
      {local.withHandle && (
        <div
          class={cn(
            'z-10 flex items-center justify-center',
            orientation() === 'horizontal'
              ? 'h-6 w-3 flex-col'
              : 'h-3 w-6 flex-row',
          )}
        >
          <svg
            class={cn(
              'text-muted-foreground/40',
              orientation() === 'horizontal' ? 'h-3 w-2' : 'h-2 w-3 rotate-90'
            )}
            viewBox="0 0 4 8"
            fill="currentColor"
          >
            <circle cx="1" cy="1.5" r="0.6" />
            <circle cx="3" cy="1.5" r="0.6" />
            <circle cx="1" cy="4" r="0.6" />
            <circle cx="3" cy="4" r="0.6" />
            <circle cx="1" cy="6.5" r="0.6" />
            <circle cx="3" cy="6.5" r="0.6" />
          </svg>
        </div>
      )}
    </div>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
