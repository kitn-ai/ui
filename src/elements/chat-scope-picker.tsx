import { defineKitnElement } from './define';
import { ChatScopePicker } from '../components/chat-scope-picker';
import type { SearchFilters } from '../types';

interface Props extends Record<string, unknown> {
  /** Authors to offer as scope filters. Set as a JS property. */
  availableAuthors: string[];
  /** Tags to offer as scope filters. Set as a JS property. */
  availableTags: string[];
  /** The label shown on the trigger for the active scope. */
  currentLabel?: string;
}

/** Events fired by `<kitn-chat-scope-picker>`. */
interface Events {
  /** A scope was chosen (`undefined` filters = "All Content"). */
  scopechange: { filters: SearchFilters | undefined };
}

/**
 * `<kitn-chat-scope-picker>` — a dropdown to scope a chat by author or tag.
 * Options via `available-authors`/`available-tags` properties; emits
 * `scopechange`.
 */
defineKitnElement<Props, Events>('kitn-chat-scope-picker', {
  availableAuthors: [],
  availableTags: [],
  currentLabel: 'All Content',
}, (props, { dispatch }) => (
  <ChatScopePicker
    currentLabel={props.currentLabel ?? 'All Content'}
    availableAuthors={props.availableAuthors}
    availableTags={props.availableTags}
    onScopeChange={(filters) => dispatch('scopechange', { filters })}
  />
));
