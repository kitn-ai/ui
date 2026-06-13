import { addons } from 'storybook/manager-api';
import './api-tab'; // registers the "API" tab for Web Components

// Storybook 10 controls addon-panel visibility here (the old per-story
// `parameters.options.showPanel` is no longer honored). The Examples, Patterns,
// and Theming stories are presentational — no args/controls — so the
// Controls/Actions/Interactions panel is just empty space. Hide it for those
// groups; Components/* stories (which use controls) keep their panel.
const NO_PANEL_PREFIXES = ['Examples/', 'Patterns/', 'Theming/'];

// The `Components` and `UI` groups are the SolidJS-native components/primitives
// (their stories show Solid JSX). The `Web Components` group is the
// framework-agnostic `<kitn-*>` API. Tag the two Solid groups in the sidebar so
// a reader copying code never mistakes a Solid component for a custom element.
// Done via renderLabel (display only) so no story IDs change.
const SOLID_GROUPS = new Set(['Components', 'UI']);

addons.setConfig({
  sidebar: {
    renderLabel: (item) =>
      item.type === 'root' && SOLID_GROUPS.has(item.name)
        ? `${item.name} · SolidJS`
        : item.name,
  },
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
