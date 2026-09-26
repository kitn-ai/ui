import { SettingsGroup } from '../../components/settings/settings-group';
import { defineWebComponent } from '../define/define';

interface Props extends Record<string, unknown> {
  /** Small section heading shown above the card. Attribute: `heading`. */
  heading?: string;
  /** Optional muted description under the heading. Attribute: `description`. */
  description?: string;
}
// Host-agnostic chrome: the same group drops into a modal or a full settings page, and only the
// rows change per app.
/**
 * A settings section: a heading over a card of setting rows.
 */
defineWebComponent<Props>('kai-settings-group', {
  heading: '',
  description: undefined,
}, (props) => (
  <SettingsGroup heading={props.heading ?? ''} description={props.description}>
    <slot />
  </SettingsGroup>
));
