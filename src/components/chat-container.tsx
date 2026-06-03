import { type JSX, splitProps, createContext, useContext } from 'solid-js';
import { cn } from '../utils/cn';
import { useStickToBottom } from '../primitives/use-stick-to-bottom';

interface ChatContainerContextValue {
  isAtBottom: () => boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

const ChatContainerContext = createContext<ChatContainerContextValue>();

export function useChatContainer() {
  const ctx = useContext(ChatContainerContext);
  if (!ctx) throw new Error('useChatContainer must be used within ChatContainer');
  return ctx;
}

// --- ChatContainerRoot ---

export interface ChatContainerRootProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

function ChatContainerRoot(props: ChatContainerRootProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);
  const { ref, isAtBottom, scrollToBottom } = useStickToBottom();
  return (
    <ChatContainerContext.Provider value={{ isAtBottom, scrollToBottom }}>
      <div
        ref={ref}
        class={cn('flex flex-col overflow-y-auto', local.class)}
        role="log"
        {...rest}
      >
        {local.children}
      </div>
    </ChatContainerContext.Provider>
  );
}

// --- ChatContainerContent ---

export interface ChatContainerContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

function ChatContainerContent(props: ChatContainerContentProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);
  return (
    <div class={cn('flex w-full flex-col', local.class)} {...rest}>
      {local.children}
    </div>
  );
}

// --- ChatContainerScrollAnchor ---

export interface ChatContainerScrollAnchorProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function ChatContainerScrollAnchor(props: ChatContainerScrollAnchorProps) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <div
      class={cn('h-px w-full shrink-0 scroll-mt-4', local.class)}
      aria-hidden="true"
      {...rest}
    />
  );
}

export {
  ChatContainerRoot as ChatContainer,
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
};
