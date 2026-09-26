import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
// The one file this host does NOT ship: scripts/verify-blocks-react.mjs copies this directory
// into a throwaway app and writes `src/block.ts` there, exporting the block under test as
// `Block`. So the specifier is real and the target is deliberately absent from the tree.
import { Block } from './block'; // lint:dangling-imports: allowed -- generated into the host copy by scripts/verify-blocks-react.mjs

declare global {
  interface Window {
    __blockReady?: boolean;
  }
}

// The driver waits on the block driver's readiness convention. React has no
// boot() of its own to await (the hook fires it in an effect), so "ready" here
// is "mounted, and one frame has passed".
function Host() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      window.__blockReady = true;
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);
  void ready;
  return <Block />;
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Host />
  </StrictMode>,
);
