import { defineKitnElement } from './define';
import { CodeBlock, CodeBlockCode } from '../components/code-block';
import { ChatConfig, useChatConfig, type ProseSize } from '../primitives/chat-config';

interface Props extends Record<string, unknown> {
  /** The source code to render. */
  code: string;
  /** Language grammar (e.g. `js`, `python`). Defaults to `tsx`. */
  language?: string;
  /** Shiki theme name. */
  codeTheme?: string;
  /** Disable syntax highlighting (renders plain text, no Shiki). */
  codeHighlight?: boolean;
  /** Code text sizing. */
  proseSize?: ProseSize;
}

/**
 * `<kc-code-block>` — one syntax-highlighted code block (with a copy button).
 * Code via the `code` property; `language`/`code-theme` via attributes.
 */
defineKitnElement<Props>('kc-code-block', {
  code: '',
  language: undefined,
  codeTheme: 'github-dark-dimmed',
  codeHighlight: true,
  proseSize: 'sm',
}, (props, { flag }) => {
  const outer = useChatConfig();
  return (
    <ChatConfig
      proseSize={props.proseSize}
      codeTheme={props.codeTheme}
      codeHighlight={flag('codeHighlight')}
      portalMount={outer.portalMount()}
    >
      <CodeBlock>
        <CodeBlockCode code={props.code} language={props.language} />
      </CodeBlock>
    </ChatConfig>
  );
});
