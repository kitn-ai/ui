import { addons } from 'storybook/manager-api';

// Storybook 10 controls addon-panel visibility here (the old per-story
// `parameters.options.showPanel` is no longer honored). Presentational stories —
// no args/controls — would otherwise show an empty Controls/Actions/Interactions
// panel. Hide it for those; component stories (which use controls) keep their
// panel. The auto-generated Token Reference (under Getting Started) is the live
// case.
const NO_PANEL_PREFIXES = ['Getting Started/Token Reference'];

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
