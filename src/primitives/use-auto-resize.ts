import { onCleanup } from 'solid-js';

interface UseAutoResizeOptions {
  maxHeight?: number;
}

export function useAutoResize(options: UseAutoResizeOptions = {}) {
  let textareaEl: HTMLTextAreaElement | undefined;

  function resize() {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    const scrollHeight = textareaEl.scrollHeight;
    if (options.maxHeight && scrollHeight > options.maxHeight) {
      textareaEl.style.height = `${options.maxHeight}px`;
      textareaEl.style.overflowY = 'auto';
    } else {
      textareaEl.style.height = `${scrollHeight}px`;
      textareaEl.style.overflowY = 'hidden';
    }
  }

  function ref(el: HTMLTextAreaElement) {
    textareaEl = el;
    el.addEventListener('input', resize);
    requestAnimationFrame(resize);
    onCleanup(() => el.removeEventListener('input', resize));
  }

  return { ref, resize };
}
