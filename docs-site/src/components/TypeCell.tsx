/** A Props-table type cell. Simple types render inline; a complex object type
 *  collapses to a clickable chip that opens a dialog with the full type,
 *  pretty-printed + syntax-highlighted as TypeScript (dogfooding kc-code-block). */
import { createSignal, createEffect, onMount, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import IconClose from '~icons/lucide/x';
import { loadKit } from './example/kit';

/** Clean up generated TS types for display: drop the optional `undefined` member
 *  (optionality is shown with `?`), and collapse `false | true` to `boolean`. */
export function simplifyType(t: string): string {
  let s = String(t ?? '').trim();
  s = s.replace(/\bundefined\s*\|\s*/g, '').replace(/\s*\|\s*undefined\b/g, '');
  s = s.replace(/\bfalse\s*\|\s*true\b/g, 'boolean').replace(/\btrue\s*\|\s*false\b/g, 'boolean');
  return s.trim();
}

/** A type is "complex" when it carries an object literal or runs long. */
export function isComplexType(t: string): boolean {
  return t.includes('{') || t.length > 80;
}

/** Collapse the object body so the cell stays compact: `{ … }[]`. */
function compact(t: string): string {
  if (t.includes('{')) return t.replace(/\{[\s\S]*\}/, '{ … }');
  return t.length > 52 ? t.slice(0, 50) + '…' : t;
}

/** Pretty-print a single-line TS type literal into indented multi-line form. */
function formatType(t: string): string {
  let out = '';
  let depth = 0;
  const pad = () => '  '.repeat(depth);
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '{') { depth++; out += '{\n' + pad(); }
    else if (c === '}') { depth = Math.max(0, depth - 1); out = out.replace(/[ \t]+$/, ''); out += '\n' + pad() + '}'; }
    else if (c === ';') { out += ';\n' + pad(); }
    else out += c;
  }
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trimEnd();
}

export default function TypeCell(props: { type: string; name: string; label?: string; import?: string }) {
  const [open, setOpen] = createSignal(false);
  const [codeEl, setCodeEl] = createSignal<(HTMLElement & { code?: string; language?: string }) | undefined>();
  const theme = () => document.documentElement.dataset.theme || 'light';

  onMount(() => { loadKit(); });

  createEffect(() => {
    const el = codeEl();
    if (!open() || !el) return;
    el.code = formatType(props.type);
    el.language = 'typescript';
    el.setAttribute('theme', theme());
  });

  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
  createEffect(() => {
    if (open()) { document.addEventListener('keydown', onKey); onCleanup(() => document.removeEventListener('keydown', onKey)); }
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        class="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[13px] text-link transition-colors hover:border-brand"
        title="View full type"
      >
        <span class="truncate">{props.label ?? compact(props.type)}</span>
      </button>

      <Show when={open()}>
        <Portal>
          <div
            class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              class="w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="flex items-center justify-between border-b border-line px-4 py-2.5">
                <span class="font-mono text-sm font-semibold text-ink">{props.name}</span>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" class="cursor-pointer rounded-md p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink">
                  <IconClose class="size-4" />
                </button>
              </div>
              <div class="max-h-[70vh] overflow-auto p-2">
                {/* @ts-expect-error custom element */}
                <kc-code-block ref={setCodeEl} style={{ display: 'block' }} />
              </div>
              <Show when={props.import}>
                <div class="border-t border-line px-4 py-2.5 font-mono text-xs text-ink-3">
                  {`import type { ${props.import} } from '@kitn.ai/ui'`}
                </div>
              </Show>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
