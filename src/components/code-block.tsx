import { type JSX, splitProps, createResource, createSignal, Show } from 'solid-js';
import { cn } from '../utils/cn';
import { useChatConfig } from '../primitives/chat-config';

// --- CodeBlock (Root) ---

export interface CodeBlockProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
}

function CodeBlock(props: CodeBlockProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);
  return (
    <div
      class={cn(
        'not-prose flex w-full flex-col overflow-clip border',
        'border-border bg-card text-card-foreground rounded-xl',
        local.class
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// --- CodeBlockCode ---

export interface CodeBlockCodeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  code: string;
  language?: string;
  theme?: string;
}

function CodeBlockCode(props: CodeBlockCodeProps) {
  const [local, rest] = splitProps(props, ['code', 'language', 'theme', 'class']);
  const config = useChatConfig();

  const lang = () => local.language ?? 'tsx';
  const theme = () => local.theme ?? config.codeTheme();

  const [highlighted] = createResource(
    () => ({ code: local.code, lang: lang(), theme: theme() }),
    async ({ code, lang, theme }) => {
      if (!code) return '<pre><code></code></pre>';
      try {
        const { codeToHtml } = await import('shiki');
        return await codeToHtml(code, { lang, theme });
      } catch {
        return `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
      }
    }
  );

  const codeTextSize = () => {
    switch (config.proseSize()) {
      case 'xs': return 'text-[11px]';
      case 'sm': return 'text-[13px]';
      case 'base': return 'text-sm';
      case 'lg': return 'text-base';
    }
  };

  const classNames = () =>
    cn(
      'w-full overflow-x-auto [&>pre]:px-4 [&>pre]:py-4',
      codeTextSize(),
      local.class
    );

  return (
    <Show
      when={highlighted()}
      fallback={
        <div class={classNames()} {...rest}>
          <pre><code>{local.code}</code></pre>
        </div>
      }
    >
      <div class={classNames()} innerHTML={highlighted()} {...rest} />
    </Show>
  );
}

// --- CodeBlockGroup ---

export interface CodeBlockGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
}

function CodeBlockGroup(props: CodeBlockGroupProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);
  return (
    <div
      class={cn('flex items-center justify-between', local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export { CodeBlock, CodeBlockCode, CodeBlockGroup };
