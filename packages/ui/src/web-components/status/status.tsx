import { defineWebComponent } from '../define/define';
import { Status, type StatusKind } from '../../components/status/status';

interface Props extends Record<string, unknown> {
  /** Presence state, which sets the colour. Default `new`. */
  status?: StatusKind;
  /** Animated ping ring; off by default and never under prefers-reduced-motion. */
  pulse?: boolean;
  /** Accessible name; without it the dot is decorative. */
  label?: string;
  /** `sm` or `md`. Default `sm`. */
  size?: 'sm' | 'md';
}

/**
 * A small presence or unread dot.
 */
defineWebComponent<Props>('kai-status', {
  status: 'new',
  pulse: false,
  label: undefined,
  size: 'sm',
}, (props, { flag }) => (
  <>
    {/* Base sets `:host{display:block}`; a presence dot sits inline beside an
        avatar/label, so inline-flex like kai-button. */}
    <style>{':host{display:inline-flex}'}</style>
    <Status
      status={(props.status as StatusKind) ?? 'new'}
      size={(props.size as 'sm' | 'md') ?? 'sm'}
      pulse={flag('pulse')}
      label={props.label as string | undefined}
      part="dot"
    />
  </>
));
