import { defineWebComponent } from '../define/define';
import { ChatScopePicker } from '../../components/chat/chat-scope-picker';
import { wireDisclosure } from '../disclosure/disclosure';
import type { DropdownController } from '../../components/dropdown/dropdown';
import type { SearchFilters } from '../../types';

interface Props extends Record<string, unknown> {
  /** Authors to offer as filters. Omit to drop the Authors section. Property only. */
  availableAuthors?: string[];
  /** Tags to offer as filters. Omit to drop the Tags section. Property only. */
  availableTags?: string[];
  /** Label on the trigger for the active scope. */
  currentLabel?: string;
  /** Open state: settable, reflected to `open`, and still self-managed on click. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** Click, keyboard and `show()` no longer open the dropdown. */
  disabled?: boolean;
}

/** Events fired by `<kai-scope-picker>`. */
interface Events {
  /** A scope was chosen (`undefined` filters means all content). */
  'kai-scope-change': { filters: SearchFilters | undefined };
  /** The dropdown opened or closed. */
  'kai-open-change': { open: boolean };
}

/**
 * A dropdown that scopes a chat by author or tag.
 */
defineWebComponent<Props, Events>('kai-scope-picker', {
  availableAuthors: [],
  availableTags: [],
  currentLabel: 'All Content',
  open: undefined,
  defaultOpen: undefined,
  disabled: undefined,
}, (props, ctx) => {
  const { dispatch, flag } = ctx;
  let api: DropdownController | undefined;

  // The standard overlay surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle, disabled-gating. See ./disclosure.
  wireDisclosure(ctx, () => api, () => props.open);

  return (
    <ChatScopePicker
      currentLabel={props.currentLabel ?? 'All Content'}
      availableAuthors={props.availableAuthors ?? []}
      availableTags={props.availableTags ?? []}
      onScopeChange={(filters) => dispatch('kai-scope-change', { filters })}
      defaultOpen={flag('defaultOpen')}
      disabled={flag('disabled')}
      controllerRef={(a) => (api = a)}
    />
  );
});
