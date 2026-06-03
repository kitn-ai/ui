import { cn } from '../utils/cn';
import { Button } from '../ui/button';
import { useChatContainer } from './chat-container';
import { ChevronDown } from 'lucide-solid';

export interface ScrollButtonProps {
  class?: string;
  variant?: 'outline' | 'ghost' | 'default';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
}

function ScrollButton(props: ScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useChatContainer();

  return (
    <Button
      variant={props.variant ?? 'outline'}
      size={props.size ?? 'sm'}
      class={cn(
        'h-10 w-10 rounded-full transition-all duration-150 ease-out',
        !isAtBottom()
          ? 'translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none translate-y-4 scale-95 opacity-0',
        props.class
      )}
      onClick={() => scrollToBottom()}
    >
      <ChevronDown class="h-5 w-5" />
    </Button>
  );
}

export { ScrollButton };
