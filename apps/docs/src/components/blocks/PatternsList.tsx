/**
 * The patterns index: one card per `kind: "pattern"` item in the derived
 * index the prebuild copies into public/ (dist/blocks/patterns.json). The list
 * is READ, never typed, so adding a directory under packages/blocks/patterns/
 * adds a card here with nothing to edit.
 */
import { createResource, For, Match, Switch, type JSX } from 'solid-js';
import { addPatternCommandFor, patternInstallDir, patternsUrl, previewFooter, type PatternItem } from '../../lib/blocks-source';

async function loadPatterns(): Promise<PatternItem[]> {
  const res = await fetch(patternsUrl());
  if (!res.ok) throw new Error(`${patternsUrl()} answered ${res.status}`);
  const index = (await res.json()) as { items: PatternItem[] };
  return index.items;
}

/** The pure view, split from the fetch so a test drives it with data. */
export function PatternCards(props: { items: readonly PatternItem[] }): JSX.Element {
  return (
    <section class="mx-auto w-full max-w-6xl px-4 py-8" aria-labelledby="patterns-heading">
      <h1 id="patterns-heading" class="text-2xl font-semibold">Patterns</h1>
      <p class="mt-2 max-w-2xl text-sm text-ink-2">
        Small compositions of plain kai web components. Each is one page and at most one script, written into your
        project as files you own.
      </p>
      <ul class="mt-6 grid gap-4 sm:grid-cols-2" data-testid="pattern-list">
        <For each={props.items}>
          {(item) => (
            <li class="rounded-lg border border-line p-4" data-testid={`pattern-${item.name}`}>
              <h2 class="text-base font-medium">{item.title}</h2>
              <p class="mt-1 text-sm text-ink-2">{item.description}</p>
              <p class="mt-3 text-xs text-ink-2">
                Writes to <code>{patternInstallDir(item.name)}</code>
              </p>
              <code class="mt-2 block overflow-x-auto rounded bg-black/5 px-2 py-1 text-xs" data-testid="pattern-command">
                {addPatternCommandFor(item.name)}
              </code>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}

export default function PatternsList(): JSX.Element {
  const [items] = createResource(loadPatterns);
  /* `state` before `items()`: the accessor rethrows a rejection, and a
     client:only island has no boundary above it (see BlocksIsland). */
  return (
    <Switch fallback={<p class="mx-auto w-full max-w-6xl px-4 py-10 text-sm text-ink-2">Loading patterns...</p>}>
      <Match when={items.state === 'errored'}>
        <p class="mx-auto w-full max-w-6xl px-4 py-10 text-sm text-ink-2">
          {`Could not load the pattern index at ${patternsUrl()}: ${String(items.error)}`}
        </p>
      </Match>
      <Match when={items.state === 'ready' ? items() : undefined}>
        {(list) => (
          <>
            <PatternCards items={list()} />
            {/* Which kit the CDN forms on this page pin, in words. The deployed page
                must say it is the published kit (verify:preview reads this chunk). */}
            <p data-testid="preview-footer" class="mx-auto w-full max-w-6xl px-4 pb-8 text-xs text-ink-3">
              {previewFooter()}
            </p>
          </>
        )}
      </Match>
    </Switch>
  );
}
