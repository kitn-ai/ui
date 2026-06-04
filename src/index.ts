// Shared types (folded in from @tab-zen/shared)
export type { ModelOption, SearchFilters, ConversationScope, ConversationSummary, ConversationGroup } from './types';

// Utilities
export { cn } from './utils/cn';

// Layer 1: Headless Primitives
export { useAutoResize } from './primitives/use-auto-resize';
export { useStickToBottom } from './primitives/use-stick-to-bottom';
export { useTextStream } from './primitives/use-text-stream';
export type { UseTextStreamOptions, TextStreamSegment } from './primitives/use-text-stream';
export { useVoiceRecorder } from './primitives/use-voice-recorder';
export type { UseVoiceRecorderOptions } from './primitives/use-voice-recorder';
export { ChatConfig, useChatConfig, proseClass, textClass } from './primitives/chat-config';
export type { ChatConfigValue, ProseSize, ChatConfigProps } from './primitives/chat-config';
export { configureCodeHighlighting, isCodeHighlightingEnabled } from './primitives/highlighter';
export type { CodeHighlightingOptions } from './primitives/highlighter';

// Layer 2: UI Primitives
export { Button, buttonVariants } from './ui/button';
export type { ButtonProps } from './ui/button';
export { Avatar } from './ui/avatar';
export type { AvatarProps } from './ui/avatar';
export { Tooltip } from './ui/tooltip';
export { HoverCard } from './ui/hover-card';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
export { ScrollArea } from './ui/scroll-area';
export { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from './ui/dropdown';
export { Textarea } from './ui/textarea';
export type { TextareaProps } from './ui/textarea';
export { Badge } from './ui/badge';
export type { BadgeProps } from './ui/badge';
export { Separator } from './ui/separator';
export { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
export type { ResizablePanelGroupProps, ResizablePanelProps, ResizableHandleProps } from './ui/resizable';
export { Skeleton } from './ui/skeleton';
export { Dialog, DialogTrigger, DialogContent } from './ui/dialog';

// Layer 3: AI/Feature Components
export {
  ChatContainer, ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor,
  useChatContainer,
} from './components/chat-container';
export { Message, MessageAvatar, MessageContent, MessageActions, MessageAction, MessageCopyButton } from './components/message';
export type { MessageCopyButtonProps } from './components/message';
export { MessageSkills } from './components/message-skills';
export type { Skill as MessageSkill } from './components/message-skills';
export {
  PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction,
  usePromptInput,
} from './components/prompt-input';
export { SlashCommand } from './components/slash-command';
export type { SlashCommandItem, SlashCommandProps } from './components/slash-command';
export { ResponseStream } from './components/response-stream';
export { Markdown } from './components/markdown';
export { CodeBlock, CodeBlockCode, CodeBlockGroup } from './components/code-block';
export { Loader } from './components/loader';
export type { LoaderVariant, LoaderSize, LoaderProps } from './components/loader';
export {
  CircularLoader, ClassicLoader, PulseLoader, PulseDotLoader,
  DotsLoader, TypingLoader, WaveLoader, BarsLoader,
  TerminalLoader, TextBlinkLoader, TextShimmerLoader, TextDotsLoader,
} from './components/loader';
export { FeedbackBar } from './components/feedback-bar';
export {
  ChainOfThought, ChainOfThoughtStep, ChainOfThoughtTrigger,
  ChainOfThoughtContent, ChainOfThoughtItem,
} from './components/chain-of-thought';
export { Source, SourceTrigger, SourceContent, SourceList } from './components/source';
export { PromptSuggestion } from './components/prompt-suggestion';
export {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent, emptyMediaVariants,
} from './components/empty';
export type {
  EmptyProps, EmptyHeaderProps, EmptyMediaProps, EmptyTitleProps, EmptyDescriptionProps, EmptyContentProps,
} from './components/empty';
export { ScrollButton } from './components/scroll-button';
export { TextShimmer } from './components/text-shimmer';
export { Checkpoint, CheckpointIcon, CheckpointTrigger } from './components/checkpoint';
export type { CheckpointProps, CheckpointIconProps, CheckpointTriggerProps } from './components/checkpoint';
export {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
} from './components/context';
export type {
  ContextProps,
  ContextTriggerProps,
  ContextContentProps,
  ContextContentHeaderProps,
  ContextContentBodyProps,
  ContextContentFooterProps,
  ContextUsageRowProps,
} from './components/context';
export { VoiceInput } from './components/voice-input';
export { ConversationList } from './components/conversation-list';
export { ConversationItem } from './components/conversation-item';
export { ModelSwitcher } from './components/model-switcher';
export { ChatScopePicker } from './components/chat-scope-picker';
export { Tool } from './components/tool';
export type { ToolPart, ToolProps } from './components/tool';
export { ThinkingBar } from './components/thinking-bar';
export type { ThinkingBarProps } from './components/thinking-bar';
export { Reasoning, ReasoningTrigger, ReasoningContent } from './components/reasoning';
export type { ReasoningProps, ReasoningTriggerProps, ReasoningContentProps } from './components/reasoning';
export { Image } from './components/image';
export type { ImageProps, GeneratedImageLike } from './components/image';
export { FileUpload, FileUploadTrigger, FileUploadContent } from './components/file-upload';
export type { FileUploadProps, FileUploadTriggerProps, FileUploadContentProps } from './components/file-upload';
export {
  Attachments, Attachment, AttachmentPreview, AttachmentInfo, AttachmentRemove,
  AttachmentHoverCard, AttachmentHoverCardTrigger, AttachmentHoverCardContent,
  AttachmentEmpty, getMediaCategory, getAttachmentLabel,
  useAttachmentsContext, useAttachmentContext,
} from './components/attachments';
export type {
  AttachmentData, AttachmentMediaCategory, AttachmentVariant,
  AttachmentsProps, AttachmentProps, AttachmentPreviewProps,
  AttachmentInfoProps, AttachmentRemoveProps, AttachmentEmptyProps,
  AttachmentHoverCardProps, AttachmentHoverCardTriggerProps, AttachmentHoverCardContentProps,
} from './components/attachments';
