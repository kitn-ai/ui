import { Separator } from '../../components/separator/separator';
import { defineWebComponent } from '../define/define';

interface Props extends Record<string, unknown> {
  /** The separator's axis. Defaults to a full-width block; the cross-axis form suits a flex or grid row. */
  orientation?: 'horizontal' | 'vertical';
}
// Carries `role="separator"`. A vertical rule is meant for a flex/grid row: it stretches to that
// row's height rather than taking a length of its own.
/**
 * A divider between groups of content.
 */
defineWebComponent<Props>('kai-separator', {
  orientation: 'horizontal',
}, (props) => {
  const vertical = () => props.orientation === 'vertical';
  return (
    <>
      {/* The host owns its layout box: a horizontal rule is block + full-width;
          a vertical rule is an inline-block flex item that stretches to the row. */}
      <style>{vertical()
        ? ':host{display:inline-block;align-self:stretch}'
        : ':host{display:block}'}</style>
      <Separator orientation={vertical() ? 'vertical' : 'horizontal'} part="separator" />
    </>
  );
});
