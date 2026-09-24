import { renderIcon } from '../../components/icon/icon';
import { cn } from '../../utils/cn';
import { defineWebComponent } from '../define/define';

const SIZE: Record<string, string> = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' };

interface Props extends Record<string, unknown> {
  /** A curated icon name (e.g. `"mic"`, `"globe"`), an image URL/data-URI, or
   *  plain text. */
  name?: string;
  // sm, md (default) or lg.
  /** Size token. */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * An inline glyph from a small curated icon set, so surrounding markup can match the
 * components.
 */
defineWebComponent<Props>('kai-icon', {
  name: '',
  size: 'md',
}, (props) => (
  <>
    {/* Base sets `:host{display:block}`; an inline icon must flow with surrounding
        text (and not force a line break), so inline-flex like kai-button. */}
    <style>{':host{display:inline-flex}'}</style>
    <span part="icon" class={cn('inline-flex shrink-0', SIZE[props.size ?? 'md'] ?? SIZE.md)}>
      {renderIcon(props.name, { class: 'size-full', imgClass: 'size-full', spanClass: 'size-full' })}
    </span>
  </>
));
