import { splitProps, createMemo, createUniqueId, For, Show, Switch, Match } from 'solid-js';
import { cn } from '../utils/cn';
import { marked } from 'marked';
import { CodeBlock, CodeBlockCode } from './code-block';
import { useChatConfig, textClass } from '../primitives/chat-config';

marked.setOptions({ gfm: true, breaks: true });

export interface MarkdownProps {
  content: string;
  id?: string;
  class?: string;
  codeTheme?: string;
  /** Optional `::part` name(s) to expose on the rendered root. Lets callers
   *  (e.g. the message bubble) surface a styleable part through the shadow. */
  part?: string;
}

interface ParsedBlock {
  type: 'markdown' | 'code';
  content: string;
  language?: string;
}

function parseMarkdownIntoBlocks(markdown: string): ParsedBlock[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => {
    if (token.type === 'code') {
      return {
        type: 'code' as const,
        content: token.text,
        language: token.lang || undefined,
      };
    }
    return {
      type: 'markdown' as const,
      content: token.raw,
    };
  });
}

function MarkdownBlock(props: { content: string }) {
  const html = createMemo(() => {
    try {
      return marked.parse(props.content, { async: false }) as string;
    } catch {
      return props.content;
    }
  });

  return <div innerHTML={html()} />;
}

function Markdown(props: MarkdownProps) {
  const [local] = splitProps(props, ['content', 'id', 'class', 'codeTheme', 'part']);
  const config = useChatConfig();
  const blockId = () => local.id ?? createUniqueId();
  const blocks = createMemo(() => parseMarkdownIntoBlocks(local.content));

  return (
    <div part={local.part} class={cn('chat-markdown max-w-none break-words whitespace-normal [&>div:first-child>p:first-child]:mt-0 [&>div:last-child>p:last-child]:mb-0', textClass(config.proseSize()), local.class)}>
      <For each={blocks()}>
        {(block) => (
          <Switch>
            <Match when={block.type === 'code'}>
              <CodeBlock class="my-4">
                <CodeBlockCode
                  code={block.content}
                  language={block.language}
                  theme={local.codeTheme ?? config.codeTheme()}
                />
              </CodeBlock>
            </Match>
            <Match when={block.type === 'markdown'}>
              <MarkdownBlock content={block.content} />
            </Match>
          </Switch>
        )}
      </For>
    </div>
  );
}

export { Markdown };
