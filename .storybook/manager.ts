import { addons } from 'storybook/manager-api';
import { STORY_CHANGED, DOCS_RENDERED, SET_INDEX } from 'storybook/internal/core-events';
import { exampleUsageStoryIdPrefixes } from '../src/stories/examples/usage';
import './api-tab'; // registers the "Code" tab for Components + Examples/Patterns

// Storybook 10 controls addon-panel visibility here (the old per-story
// `parameters.options.showPanel` is no longer honored). Presentational stories —
// no args/controls — would otherwise show an empty Controls/Actions/Interactions
// panel. Hide it for those; component stories (which use controls) keep their
// panel. The auto-generated Token Reference (now under Getting Started) is the
// live case; the Examples/Patterns prefixes are kept for any composed demos.
const NO_PANEL_PREFIXES = ['Examples/', 'Patterns/', 'Getting Started/Token Reference'];

// The `Solid (Advanced)/` tier is always present in the sidebar but sits below
// Components (via the storySort order in preview.ts) and is collapsed by
// default like any other group off the active story's path — so Components
// stays the obvious primary surface without hiding the Solid layer outright.
addons.setConfig({
  layoutCustomisations: {
    showPanel(state, defaultValue) {
      const title = state.index?.[state.storyId]?.title ?? '';
      if (NO_PANEL_PREFIXES.some((prefix) => title.startsWith(prefix))) {
        return false;
      }
      return defaultValue;
    },
  },
});

// ── Hide the "API" tab (and, with it, the whole tab bar) on documentation entries ──
//
// In Storybook 10 a `type: types.TAB` addon NO LONGER honours its `match`
// predicate (see MIGRATION.md: "Tab addons cannot manually route"). The tab is
// therefore force-added to EVERY entry, which is why pure MDX doc pages were
// showing a "Canvas" + "API" tab bar that shouldn't be there at all.
//
// The supported lever that DOES still work is the per-entry `previewTabs`
// parameter, which the manager merges over the global config when it builds the
// tab list (`filterTabs`). An addon tab whose id is flagged `{ hidden: true }`
// there is dropped. Crucially, once the API tab is dropped on a doc page only
// the built-in "Canvas" tab remains — and Storybook hides the tab BAR entirely
// when a single tab is left — so the page collapses to the clean Docs-only view.
// (The Canvas tab itself is exempt from `previewTabs.hidden`, so hiding the API
// tab is the ONLY way to remove the bar here.)
//
// We don't want to stamp `previewTabs` onto 70+ component story files, so we set
// it from the manager, reactively, keyed off the active entry's storyId. The API
// tab is for the generated specs of the framework-agnostic Components and the
// Solid (Advanced) Elements/Primitives; every other entry (docs-*, theming-*,
// examples-*, patterns-*, generative-ui-*, solid-advanced-overview-*) is
// documentation and gets the Docs-only view.
const API_TAB_ID = 'kitn-api-tab';
const COMPONENT_PREFIXES = [
  'components-',
  'solid-advanced-elements-',
  'solid-advanced-primitives-',
];
// Examples/Patterns get the tab too — but only the entries we've authored
// "how to build this" code for (derived from the usage modules), so the rest
// stay Docs-only instead of showing an empty Code tab.
const wantsApiTab = (storyId: string | undefined): boolean =>
  !!storyId &&
  (COMPONENT_PREFIXES.some((p) => storyId.startsWith(p)) ||
    exampleUsageStoryIdPrefixes.some((p) => storyId.startsWith(p)));

// Update the global `previewTabs` to match the active entry, then nudge the
// manager to re-read the config (SET_CONFIG) so the tab bar re-renders.
//
// Storybook orders tabs by their KEY ORDER in `previewTabs` (entries listed
// here sort first), so we pin Preview (Canvas) → Docs → Code and rename the
// built-in Canvas tab to "Preview" in the same place. Idempotent: bails when
// both the Code-tab hidden flag and the rename are already in place.
function syncApiTabVisibility(storyId: string | undefined): void {
  const hidden = !wantsApiTab(storyId);
  const cfg = addons.getConfig().previewTabs;
  if (cfg?.[API_TAB_ID]?.hidden === hidden && cfg?.canvas?.title === 'Demo') return;
  addons.setConfig({
    previewTabs: {
      canvas: { title: 'Demo' },
      docs: {},
      [API_TAB_ID]: { hidden },
    },
  });
}

addons.register('kitn/api-tab-visibility', (api) => {
  const apply = (): void => syncApiTabVisibility(api.getUrlState()?.storyId);
  // Cover first paint (deep-link), client-side story navigation, and the docs
  // render that follows a docs-page navigation.
  const channel = addons.getChannel();
  channel.on(STORY_CHANGED, apply);
  channel.on(DOCS_RENDERED, apply);
  channel.on(SET_INDEX, apply);
  apply();
});
