/** Resizable preview pane — a dashed frame with a draggable grip on the right
 *  (visible, magenta on hover/drag), clamped between 300px and the card width. */
import { createSignal, type JSX } from 'solid-js';

export function Resizer(props: { children: JSX.Element }) {
  const [w, setW] = createSignal<number | null>(null);
  const [dragging, setDragging] = createSignal(false);
  let pane: HTMLDivElement | undefined;

  const start = (e: PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    const sx = e.clientX;
    const sw = pane!.offsetWidth;
    const c = pane!.parentElement!;
    const cs = getComputedStyle(c);
    const max = c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const move = (ev: PointerEvent) => setW(Math.max(300, Math.min(max, sw + (ev.clientX - sx))));
    const up = () => { setDragging(false); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div class="relative px-3 py-3">
      <div ref={pane} class="relative rounded-lg border border-dashed border-line/70 p-5" style={{ width: w() ? `${w()}px` : '100%' }}>
        {props.children}
        <div onPointerDown={start} title="Drag to resize" role="separator" aria-orientation="vertical"
          class="group absolute right-0 top-0 flex h-full w-5 cursor-ew-resize touch-none items-center justify-center rounded-r-lg border-l border-line transition-colors hover:bg-brand"
          classList={{ 'bg-brand': dragging() }}>
          <span class="flex gap-[3px]">
            <span class="block h-4 w-[2px] rounded bg-ink-3 transition-colors group-hover:bg-white" classList={{ '!bg-white': dragging() }}></span>
            <span class="block h-4 w-[2px] rounded bg-ink-3 transition-colors group-hover:bg-white" classList={{ '!bg-white': dragging() }}></span>
          </span>
        </div>
      </div>
    </div>
  );
}
