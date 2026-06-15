import { addons } from 'storybook/manager-api';
import { STORY_CHANGED, DOCS_RENDERED, SET_INDEX } from 'storybook/internal/core-events';
import './api-tab'; // registers the "API" tab for Components

// Storybook 10 controls addon-panel visibility here (the old per-story
// `parameters.options.showPanel` is no longer honored). The Examples, Patterns,
// and Theming stories are presentational — no args/controls — so the
// Controls/Actions/Interactions panel is just empty space. Hide it for those
// groups; component stories (which use controls) keep their panel.
const NO_PANEL_PREFIXES = ['Examples/', 'Patterns/', 'Theming/'];

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
const wantsApiTab = (storyId: string | undefined): boolean =>
  !!storyId && COMPONENT_PREFIXES.some((p) => storyId.startsWith(p));

// Update the global `previewTabs.kitn-api-tab.hidden` flag to match the active
// entry, then nudge the manager to re-read the config (SET_CONFIG) so the tab
// bar re-renders. Idempotent: bails when the flag is already correct.
function syncApiTabVisibility(storyId: string | undefined): void {
  const hidden = !wantsApiTab(storyId);
  const current = addons.getConfig().previewTabs?.[API_TAB_ID]?.hidden;
  if (current === hidden) return;
  addons.setConfig({
    previewTabs: {
      ...addons.getConfig().previewTabs,
      [API_TAB_ID]: { ...addons.getConfig().previewTabs?.[API_TAB_ID], hidden },
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
