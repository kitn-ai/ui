import { addons } from 'storybook/manager-api';
import './api-tab'; // registers the "API" tab for Web Components

// Storybook 10 controls addon-panel visibility here (the old per-story
// `parameters.options.showPanel` is no longer honored). The Examples, Patterns,
// and Theming stories are presentational — no args/controls — so the
// Controls/Actions/Interactions panel is just empty space. Hide it for those
// groups; component stories (which use controls) keep their panel.
const NO_PANEL_PREFIXES = ['Examples/', 'Patterns/', 'Theming/'];

// The `SolidJS (advanced)/` tier is always present in the sidebar but sits below
// Web Components (via the storySort order in preview.ts) and is collapsed by
// default like any other group off the active story's path — so Web Components
// stays the obvious primary surface without hiding the SolidJS layer outright.
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
