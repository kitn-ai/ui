import { defineKitnElement } from './define';
import { Markdown } from '../components/markdown';
import { ChatConfig, useChatConfig, type ProseSize } from '../primitives/chat-config';

interface Props extends Record<string, unknown> {
  /** The markdown source to render. */
  content: string;
  /** Text/markdown sizing. */
  proseSize?: ProseSize;
  /** Shiki theme for fenced code blocks. */
  codeTheme?: string;
  /** Disable syntax highlighting (no Shiki loads). */
  codeHighlight?: boolean;
}

/**
 * `<kitn-markdown>` — renders markdown (with fenced-code syntax highlighting) as
 * a standalone element. Content via the `content` property; sizing/highlighting
 * via attributes.
 */
defineKitnElement<Props>('kitn-markdown', {
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
