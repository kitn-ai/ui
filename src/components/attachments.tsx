import { type JSX, createContext, useContext, splitProps, Show } from 'solid-js';
import { cn } from '../utils/cn';
import { Button } from '../ui/button';
import { HoverCardRoot, HoverCardTrigger, HoverCardContent } from '../ui/hover-card';
import {
  FileText,
  Globe,
  Image as ImageIcon,
  Music2,
  Paperclip,
  Video,
  X,
} from 'lucide-solid';

// ============================================================================
// Types
// ============================================================================

export interface AttachmentData {
  id: string;
  type: 'file' | 'source-document';
  filename?: string;
  mediaType?: string;
  url?: string;
  title?: string;
}

export type AttachmentMediaCategory = 'image' | 'video' | 'audio' | 'document' | 'source' | 'unknown';
export type AttachmentVariant = 'grid' | 'inline' | 'list';

const mediaCategoryIcons: Record<AttachmentMediaCategory, typeof ImageIcon> = {
  audio: Music2,
  document: FileText,
  image: ImageIcon,
  source: Globe,
  unknown: Paperclip,
  video: Video,
};

// ============================================================================
// Utility Functions
// ============================================================================

export const getMediaCategory = (data: AttachmentData): AttachmentMediaCategory => {
  if (data.type === 'source-document') {
    return 'source';
  }

  const mediaType = data.mediaType ?? '';

  if (mediaType.startsWith('image/')) return 'image';
  if (mediaType.startsWith('video/')) return 'video';
  if (mediaType.startsWith('audio/')) return 'audio';
  if (mediaType.startsWith('application/') || mediaType.startsWith('text/')) return 'document';

  return 'unknown';
};

export const getAttachmentLabel = (data: AttachmentData): string => {
  if (data.type === 'source-document') {
    return data.title || data.filename || 'Source';
  }

  const category = getMediaCategory(data);
  return data.filename || (category === 'image' ? 'Image' : 'Attachment');
};

// ============================================================================
// Contexts
// ============================================================================

interface AttachmentsContextValue {
  variant: AttachmentVariant;
}

const AttachmentsContext = createContext<AttachmentsContextValue>();

interface AttachmentContextValue {
  data: AttachmentData;
  mediaCategory: AttachmentMediaCategory;
  onRemove?: () => void;
  variant: AttachmentVariant;
}

const AttachmentContext = createContext<AttachmentContextValue>();

// ============================================================================
// Hooks
// ============================================================================

export const useAttachmentsContext = () =>
  useContext(AttachmentsContext) ?? { variant: 'grid' as const };

export const useAttachmentContext = () => {
  const ctx = useContext(AttachmentContext);
  if (!ctx) {
    throw new Error('Attachment components must be used within <Attachment>');
  }
  return ctx;
};

// ============================================================================
// Attachments - Container
// ============================================================================

export interface AttachmentsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: AttachmentVariant;
}

function Attachments(props: AttachmentsProps) {
  const [local, rest] = splitProps(props, ['variant', 'class', 'children']);
  const variant = () => local.variant ?? 'grid';

  return (
    <AttachmentsContext.Provider value={{ get variant() { return variant(); } }}>
      <div
        class={cn(
          'flex items-start',
          variant() === 'list' ? 'flex-col gap-2' : 'flex-wrap gap-2',
          variant() === 'grid' && 'w-fit',
          local.class,
        )}
        {...rest}
      >
        {local.children}
      </div>
    </AttachmentsContext.Provider>
  );
}

// ============================================================================
// Attachment - Item
// ============================================================================

export interface AttachmentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  data: AttachmentData;
  onRemove?: () => void;
}

function Attachment(props: AttachmentProps) {
  const [local, rest] = splitProps(props, ['data', 'onRemove', 'class', 'children']);
  const { variant } = useAttachmentsContext();
  const mediaCategory = () => getMediaCategory(local.data);

  return (
    <AttachmentContext.Provider
      value={{
        get data() { return local.data; },
        get mediaCategory() { return mediaCategory(); },
        get onRemove() { return local.onRemove; },
        get variant() { return variant; },
      }}
    >
      <div
        class={cn(
          'group relative',
          variant === 'grid' && 'size-24 overflow-hidden rounded-lg',
          variant === 'inline' && [
            'flex h-8 cursor-pointer select-none items-center gap-1.5',
            'rounded-md bg-muted/50 px-1.5',
            'font-medium text-sm transition-all',
            'hover:bg-muted',
          ],
          variant === 'list' && [
            'flex w-full items-center gap-3 rounded-lg bg-muted/30 p-3',
            'hover:bg-muted/50',
          ],
          local.class,
        )}
        {...rest}
      >
        {local.children}
      </div>
    </AttachmentContext.Provider>
  );
}

// ============================================================================
// AttachmentPreview - Media preview
// ============================================================================

export interface AttachmentPreviewProps extends JSX.HTMLAttributes<HTMLDivElement> {
  fallbackIcon?: JSX.Element;
}

function AttachmentPreview(props: AttachmentPreviewProps) {
  const [local, rest] = splitProps(props, ['fallbackIcon', 'class']);
  const ctx = useAttachmentContext();

  const iconSize = () => ctx.variant === 'inline' ? 'size-3' : 'size-4';

  const renderIcon = (Icon: typeof ImageIcon) => (
    <Icon class={cn(iconSize(), 'text-muted-foreground')} />
  );

  const renderContent = () => {
    if (ctx.mediaCategory === 'image' && ctx.data.type === 'file' && ctx.data.url) {
      return ctx.variant === 'grid' ? (
        <img
          alt={ctx.data.filename || 'Image'}
          class="size-full object-cover"
          height={96}
          src={ctx.data.url}
          width={96}
        />
      ) : (
        <img
          alt={ctx.data.filename || 'Image'}
          class="size-full rounded object-cover"
          height={20}
          src={ctx.data.url}
          width={20}
        />
      );
    }

    if (ctx.mediaCategory === 'video' && ctx.data.type === 'file' && ctx.data.url) {
      return <video class="size-full object-cover" muted src={ctx.data.url} />;
    }

    const Icon = mediaCategoryIcons[ctx.mediaCategory];
    return local.fallbackIcon ?? renderIcon(Icon);
  };

  return (
    <div
      class={cn(
        'flex shrink-0 items-center justify-center overflow-hidden',
        ctx.variant === 'grid' && 'size-full bg-muted',
        ctx.variant === 'inline' && 'size-5 rounded bg-background',
        ctx.variant === 'list' && 'size-12 rounded bg-muted',
        local.class,
      )}
      {...rest}
    >
      {renderContent()}
    </div>
  );
}

// ============================================================================
// AttachmentInfo - Name and type display
// ============================================================================

export interface AttachmentInfoProps extends JSX.HTMLAttributes<HTMLDivElement> {
  showMediaType?: boolean;
}

function AttachmentInfo(props: AttachmentInfoProps) {
  const [local, rest] = splitProps(props, ['showMediaType', 'class']);
  const ctx = useAttachmentContext();
  const label = () => getAttachmentLabel(ctx.data);

  return (
    <Show when={ctx.variant !== 'grid'}>
      <div class={cn('min-w-0 flex-1', local.class)} {...rest}>
        <span class="block truncate">{label()}</span>
        <Show when={local.showMediaType && ctx.data.mediaType}>
          <span class="block truncate text-muted-foreground text-xs">
            {ctx.data.mediaType}
          </span>
        </Show>
      </div>
    </Show>
  );
}

// ============================================================================
// AttachmentRemove - Remove button
// ============================================================================

export interface AttachmentRemoveProps {
  label?: string;
  class?: string;
  children?: JSX.Element;
}

function AttachmentRemove(props: AttachmentRemoveProps) {
  const ctx = useAttachmentContext();

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    ctx.onRemove?.();
  };

  return (
    <Show when={ctx.onRemove}>
      <Button
        aria-label={props.label ?? 'Remove'}
        class={cn(
          ctx.variant === 'grid' && [
            'absolute top-2 right-2 size-6 rounded-full p-0',
            'bg-background/80 backdrop-blur-sm',
            'opacity-0 transition-opacity group-hover:opacity-100',
            'hover:bg-background',
            '[&>svg]:size-3',
          ],
          ctx.variant === 'inline' && [
            'size-5 rounded p-0',
            'opacity-0 transition-opacity group-hover:opacity-100',
            '[&>svg]:size-2.5',
          ],
          ctx.variant === 'list' && ['size-8 shrink-0 rounded p-0', '[&>svg]:size-4'],
          props.class,
        )}
        onClick={handleClick}
        type="button"
        variant="ghost"
      >
        {props.children ?? <X />}
        <span class="sr-only">{props.label ?? 'Remove'}</span>
      </Button>
    </Show>
  );
}

// ============================================================================
// AttachmentHoverCard - Hover preview
// ============================================================================

export interface AttachmentHoverCardProps {
  children: JSX.Element;
  openDelay?: number;
  closeDelay?: number;
}

function AttachmentHoverCard(props: AttachmentHoverCardProps) {
  return (
    <HoverCardRoot
      openDelay={props.openDelay ?? 0}
      closeDelay={props.closeDelay ?? 0}
    >
      {props.children}
    </HoverCardRoot>
  );
}

export interface AttachmentHoverCardTriggerProps {
  children: JSX.Element;
}

function AttachmentHoverCardTrigger(props: AttachmentHoverCardTriggerProps) {
  return <HoverCardTrigger>{props.children}</HoverCardTrigger>;
}

export interface AttachmentHoverCardContentProps {
  children: JSX.Element;
  class?: string;
}

function AttachmentHoverCardContent(props: AttachmentHoverCardContentProps) {
  return (
    <HoverCardContent class={cn('w-auto p-2', props.class)}>
      {props.children}
    </HoverCardContent>
  );
}

// ============================================================================
// AttachmentEmpty - Empty state
// ============================================================================

export interface AttachmentEmptyProps extends JSX.HTMLAttributes<HTMLDivElement> {}

function AttachmentEmpty(props: AttachmentEmptyProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div
      class={cn(
        'flex items-center justify-center p-4 text-muted-foreground text-sm',
        local.class,
      )}
      {...rest}
    >
      {local.children ?? 'No attachments'}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
  AttachmentHoverCard,
  AttachmentHoverCardTrigger,
  AttachmentHoverCardContent,
  AttachmentEmpty,
};
