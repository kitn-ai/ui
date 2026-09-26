import { defineWebComponent } from '../define/define';
import { Markdown } from '../../components/markdown/markdown';
import { ChatConfig, useChatConfig, type ProseSize } from '../../primitives/chat-config';

interface Props extends Record<string, unknown> {
  /** The markdown source. */
  content: string;
  /** Text and markdown sizing. */
  proseSize?: ProseSize;
  /** Shiki theme for fenced code blocks. */
  codeTheme?: string;
  /** Set false to render plain `pre` blocks, with no highlighter load. */
  codeHighlight?: boolean;
}

/**
 * Renders markdown, with syntax-highlighted code blocks.
 */
defineWebComponent<Props>('kai-markdown', {
  content: '',
  proseSize: 'sm',
  codeTheme: 'github-dark-dimmed',
  codeHighlight: true,
}, (props, { flag }) => {
  const outer = useChatConfig();
  return (
    <ChatConfig
      proseSize={props.proseSize}
      codeTheme={props.codeTheme}
      codeHighlight={flag('codeHighlight')}
      portalMount={outer.portalMount()}
    >
      <Markdown content={props.content} />
    </ChatConfig>
  );
});
