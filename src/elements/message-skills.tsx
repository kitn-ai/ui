import { defineKitnElement } from './define';
import { MessageSkills } from '../components/message-skills';

interface Skill {
  /** Stable identifier for the skill. */
  id: string;
  /** Human-readable skill name shown on the badge. */
  name: string;
}

interface Props extends Record<string, unknown> {
  /** The active skills to badge. Set as a JS property. */
  skills: Skill[];
}

/**
 * `<kc-skills>` — badges showing which skills were active for a
 * message. Data via the `skills` property.
 */
defineKitnElement<Props>('kc-skills', {
  skills: [],
}, (props) => <MessageSkills skills={props.skills} />);
