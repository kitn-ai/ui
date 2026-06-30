import { SettingsGroup } from '../ui/settings-group';
import { defineWebComponent } from './define';

interface Props extends Record<string, unknown> {
  /** Small section heading shown above the card. Attribute: `heading`. */
  heading?: string;
  /** Optional muted description under the heading. Attribute: `description`. */
  description?: string;
}

/**
 * `<kai-settings-group>` — a settings section: a small heading + optional muted
 * description over a bordered, rounded card that stacks `<kai-setting-item>` rows
 * with hairline dividers. Put the rows as light-DOM children (the default slot).
 *
 * Host-agnostic chrome: the SAME group drops into a modal or a full settings
 * page; only the rows change per app.
 *
 * Themeable `::part`s: `header` (the heading/description block) and `body` (the
 * rows card).
 *
 * ```html
 * <kai-settings-group heading="Appearance" description="How the app looks.">
 *   <kai-setting-item label="Theme">
 *     <kai-switch slot="control"></kai-switch>
 *   </kai-setting-item>
 * </kai-settings-group>
 * ```
 */
defineWebComponent<Props>('kai-settings-group', {
  heading: '',
  description: undefined,
}, (props) => (
  <SettingsGroup heading={props.heading ?? ''} description={props.description}>
    <slot />
  </SettingsGroup>
));
