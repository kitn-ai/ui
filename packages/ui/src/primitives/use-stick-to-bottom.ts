import { createSignal, onCleanup } from 'solid-js';

const SCROLL_THRESHOLD = 50;

export function useStickToBottom() {
  const [isAtBottom, setIsAtBottom] = createSignal(true);
  let containerEl: HTMLElement | undefined;
  let shouldStick = true;

  function checkIfAtBottom() {
    if (!containerEl) return;
    const { scrollTop, scrollHeight, clientHeight } = containerEl;
    const atBottom = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
    setIsAtBottom(atBottom);
    shouldStick = atBottom;
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    if (!containerEl) return;
    containerEl.scrollTo({ top: containerEl.scrollHeight, behavior });
    shouldStick = true;
    setIsAtBottom(true);
  }

  function onNewContent() {
    if (shouldStick) {
      requestAnimationFrame(() => scrollToBottom('instant'));
    }
  }

  function ref(el: HTMLElement) {
    containerEl = el;
    el.addEventListener('scroll', checkIfAtBottom, { passive: true });
    const observer = new MutationObserver(onNewContent);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    onCleanup(() => {
      el.removeEventListener('scroll', checkIfAtBottom);
      observer.disconnect();
    });
  }

  return { ref, isAtBottom, scrollToBottom };
}
