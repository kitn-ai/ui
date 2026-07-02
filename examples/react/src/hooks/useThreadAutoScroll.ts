import { useEffect, useRef } from 'react';

/**
 * Keeps the newest message in view: whenever `dep` changes (pass the message
 * array), smooth-scroll the returned container to its bottom. Attach the returned
 * ref to the scrollable thread element.
 */
export function useThreadAutoScroll<T>(dep: T) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [dep]);
  return ref;
}
