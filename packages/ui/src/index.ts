// The package root entry ("./index").
//
// SCOPE — read before adding an export here.
// -----------------------------------------
// Every consumer of `@kitn.ai/ui` pays for this barrel, INCLUDING React/Vue/
// Svelte consumers who never render a Solid component. It is therefore frozen at
// the surface that shipped: adding a Solid component here taxes four frameworks
// to serve one. Closing the element coverage gaps on this file grew it
// 591,359 -> 705,031 bytes (+19.2%), which is what motivated the split. (That
// measurement was taken at the then-79 web components; the catalog grows, the bytes
// quoted do not — they are a record of the split, not a current reading.)
//
// The COMPLETE SolidJS surface — a component for EVERY registered element plus a
// `<Name>Props` type for every public component — lives on `@kitn.ai/ui/solid`
// (src/solid.ts), which is its own build target so only Solid consumers pay for
// it. `npm run verify:solid-coverage` prints the element count and proves that
// surface n/n on every run, which is why no count is restated here. `./solid`
// re-exports this file, so it is a strict superset: anything here is reachable
// there too, and a Solid consumer only ever needs the one import.
//
// Rule of thumb: a NEW Solid component export belongs in src/solid.ts.
// Type-only exports are free (fully erased by the build) and may live in either.

// Shared types (folded in from @tab-zen/shared)
export type { ModelOption, SearchFilters, ConversationScope, ConversationSummary, ConversationGroup, HomeConfig, HomeLinkEntry } from './types';

// Utilities
export { cn } from './utils/cn';

// Layer 1: Headless Primitives
export { createKaiChat } from './primitives/create-kai-chat';
export type { CreateKaiChatOptions, KaiChatStore } from './primitives/create-kai-chat';
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
export { configurePdfPreview, isPdfPreviewEnabled } from './primitives/pdf-preview';
export type { PdfPreviewOptions } from './primitives/pdf-preview';
// Also surfaced as the self-contained `@kitn.ai/ui/stores` entry (src/stores/
// index.ts has the decision record): this root bundle bare-imports solid-js,
// so a no-bundler CDN page can't load it — the stores subpath is the raw-URL
// route to the same module. Keep BOTH: removing these re-exports would break
// every existing bundler consumer for no gain.
export { localStorageStore, fetchStore, byRecency, isConversationUnread, LEGACY_THREAD_MIGRATED_TITLE } from './primitives/conversation-store';
export type { ConversationStore } from './primitives/conversation-store';

// Toasts: imperative `toast()` API + the reactive store behind <kai-toast-region>
export { toast, configureToasts, ensureMounted as ensureToastRegion, getToasts } from './primitives/toast-store';
export type {
  ToastItem, ToastVariant, ToastAction, ToastOptions, ToastHandle, ToastFn, ToastConfig,
} from './primitives/toast-store';
export { Toast, ToastRegion } from './components/toast/toast';
export type {
  ToastProps, ToastRegionProps, ToastDismissReason, ToastPosition,
} from './components/toast/toast';

// Card Contract (generative-UI foundation)
export { CARD_CONTRACT_VERSION } from './primitives/card-contract';
export type {
  CardEnvelope, CardContext, CardEvent, CardEventKind, CardResolution, CardHost, CardPolicy,
} from './primitives/card-contract';
export { applyResolution, resolutionFromEvent } from './primitives/card-resolution';
export { CardProvider, useCardHost } from './primitives/card-host';
export type { CardProviderProps } from './primitives/card-host';
export { CARD_EVENT_NAME, emitCardEvent, routeCardEvent, listenForCardEvents } from './primitives/card-routing';
export { dismissRecovery, defaultIsReopenable } from './primitives/card-recovery';
export type {
  RecoveryToast, ReopenEnv, DismissRecoveryOptions,
} from './primitives/card-recovery';
export { validateAgainstSchema } from './primitives/card-validate';
export type { JsonSchema, ValidationResult } from './primitives/card-validate';

// Remote host SDK (iframe transport — host side only; provider runtime ships via ./provider subpath)
export { mountRemoteCard } from './remote/host-embed';
export type { MountRemoteCardOptions, RemoteCardHandle } from './remote/host-embed';

// Card dispatcher (generative-UI host glue)
export { CardRenderer, renderCard } from './components/card/card-renderer';
export type { CardRendererProps } from './components/card/card-renderer';
export { CardFallback } from './components/card/card-fallback';
export type { CardFallbackProps } from './components/card/card-fallback';
export {
  BUILTIN_CARD_TAGS, BUILTIN_CARD_COMPONENTS, mergeCardTags, mergeCardComponents,
} from './components/card/card-registry';
export type { CardComponent, CardComponentMap, CardTagMap } from './components/card/card-registry';

// Card: kai-card (base shell) + kai-form (JSON-Schema form renderer)
export { Card } from './components/card/card';
export type { CardProps } from './components/card/card';
export { DismissedStub, stubIntent } from './components/dismissed-stub/dismissed-stub';
export type { DismissedStubProps, DismissedCardType } from './components/dismissed-stub/dismissed-stub';
export { Form, validateForm, buildResult, widgetFor, orderedKeys, coerceValue } from './components/form/form';
export type {
  FormProps,
  FormField,
  FormDefinition,
  FormCardEnvelope,
  FormValidation,
  WidgetKind,
} from './components/form/form';

// Card: kai-confirm (approval) + kai-tasks (selectable plan)
export {
  ConfirmCard,
  CONFIRM_CARD_TYPE,
  buttonVariantForStyle,
  normalizeActions,
  defaultActionId,
} from './components/confirm-card/confirm-card';
export type {
  ConfirmCardProps,
  ConfirmAction,
  ConfirmActionStyle,
  ConfirmTone,
  ConfirmCardData,
  ConfirmCardEnvelope,
} from './components/confirm-card/confirm-card';
export {
  TasksCard,
  TASKS_CARD_TYPE,
  normalizeTasks,
  initialSelected,
  selectedInOrder,
  toggleableIds,
  selectAllState,
  showSelectAll,
  canConfirm,
  isMaxReached,
  confirmReason,
} from './components/tasks/tasks-card';
export type {
  TasksCardProps,
  TasksTask,
  TasksCardData,
  TasksCardResult,
  TasksCardEnvelope,
  SelectAllState,
} from './components/tasks/tasks-card';

// Card: kai-choice (single-select option card)
export {
  ChoiceCard,
  CHOICE_CARD_TYPE,
  OTHER_ACTION,
  normalizeOptions,
  resolveOtherConfig,
  nextEnabledIndex,
  firstEnabledIndex,
} from './components/choice-card/choice-card';
export type {
  ChoiceCardProps,
  ChoiceOption,
  ChoiceOptionMedia,
  ChoiceAllowOther,
  ChoiceCardData,
  ChoiceCardEnvelope,
} from './components/choice-card/choice-card';

// Card: kai-link-preview (OG/link preview) + kai-embed (lazy media embed)
export { LinkPreview } from './components/link-preview/link-preview';
export type { LinkPreviewProps } from './components/link-preview/link-preview';
export { Embed } from './components/embed/embed';
export type { EmbedProps } from './components/embed/embed';
export {
  configureLinkPreview,
  resolveLinkMetadata,
  hasLinkPreviewFetcher,
  LINK_PREVIEW_TYPE,
} from './primitives/link-preview';
export type { LinkPreviewData, LinkPreviewEnvelope, LinkMetadataFetcher } from './primitives/link-preview';
export {
  resolveEmbed,
  parseYouTubeId,
  parseVimeoId,
  configureEmbedAllowlist,
  isGenericOriginAllowed,
  EMBED_CARD_TYPE,
} from './primitives/embed-providers';
export type { EmbedCardData, EmbedCardEnvelope, EmbedProvider, ResolvedEmbed } from './primitives/embed-providers';

// Layer 2: UI Primitives
export { Button, buttonVariants } from './components/button/button';
export type { ButtonProps } from './components/button/button';
export { Avatar } from './components/avatar/avatar';
export type { AvatarProps } from './components/avatar/avatar';
export { Tooltip } from './components/tooltip/tooltip';
export type { TooltipProps, TooltipController } from './components/tooltip/tooltip';
export { HoverCard } from './components/hover/hover-card';
export type { HoverCardProps, HoverCardController } from './components/hover/hover-card';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './components/collapsible/collapsible';
export type {
  CollapsibleProps, CollapsibleTriggerProps, CollapsibleContentProps, CollapsibleController,
} from './components/collapsible/collapsible';
export { ScrollArea } from './components/scroll/scroll-area';
export type { ScrollAreaProps, ScrollOrientation } from './components/scroll/scroll-area';
export { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from './components/dropdown/dropdown';
export type {
  DropdownProps, DropdownTriggerProps, DropdownContentProps, DropdownItemProps, DropdownController,
} from './components/dropdown/dropdown';
export { Textarea } from './components/textarea/textarea';
export type { TextareaProps } from './components/textarea/textarea';
export { Badge } from './components/badge/badge';
export type { BadgeProps } from './components/badge/badge';
export { Separator } from './components/separator/separator';
export type { SeparatorProps } from './components/separator/separator';
export { ResizablePanelGroup, ResizablePanel, ResizableHandle, Resizable, normalizeSize, resolveToPx } from './components/resizable/resizable';
export type { ResizablePanelGroupProps, ResizablePanelProps, ResizableHandleProps, ResizableProps, SizeValue } from './components/resizable/resizable';
export { Skeleton } from './components/skeleton/skeleton';
export type { SkeletonProps, SkeletonVariant } from './components/skeleton/skeleton';
export { FileTree, buildFileTree } from './components/file/file-tree';
export type {
  FileTreeProps, FileTreeFile, FileTreeNode, FileTreeFolderNode, FileTreeFileNode,
} from './components/file/file-tree';
export { Artifact } from './components/artifact/artifact';
export type { ArtifactProps, ArtifactFile, ArtifactTab } from './components/artifact/artifact';
export { WorkSurface, WORK_SURFACE_DEVICE_WIDTHS } from './components/work-surface/work-surface';
export type { WorkSurfaceProps, WorkSurfaceDevice } from './components/work-surface/work-surface';
export { AppHeader } from './components/app-header/app-header';
export type { AppHeaderProps, AppHeaderAction, AppHeaderUserMenuItem } from './components/app-header/app-header';
export { ArtifactCard, DEFAULT_ARTIFACT_CARD_HEIGHT } from './components/artifact/artifact-card';
// `ArtifactCardFile` is the SAME declaration `FileTreeFile` and `ArtifactFile`
// alias, authored in primitives/card-data-types.ts because `ArtifactCardData.files`
// reaches it and that module has to stay resolvable from a Node/no-DOM project.
// It is exported here under its authored name because that is the name the
// generated web-component metadata records for `kai-artifact.files` / `kai-file-tree.files`,
// and tests/web-components/prop-types-exported.ts requires every named prop type to be
// importable from this entry. The two aliases stay exported above, unchanged.
export type {
  ArtifactCardProps,
  ArtifactCardData,
  ArtifactCardEnvelope,
  ArtifactCardFile,
  ArtifactCardTab,
} from './components/artifact/artifact-card';

// Layer 3: AI/Feature Components
export {
  ChatContainer, ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor,
  useChatContainer,
} from './components/chat/chat-container';
export type {
  ChatContainerProps, ChatContainerRootProps, ChatContainerContentProps, ChatContainerScrollAnchorProps,
} from './components/chat/chat-container';
export { Message, MessageAvatar, MessageContent, MessageActions, MessageAction, MessageCopyButton, MessageBody } from './components/message/message';
export type {
  MessageProps, MessageAvatarProps, MessageContentProps, MessageActionsProps,
  MessageActionProps, MessageCopyButtonProps, MessageBodyProps,
} from './components/message/message';
export { ResponseCompare, useResolved } from './components/response/response-compare';
export type { ResponseCompareProps, CompareLayout, ResolvedController } from './components/response/response-compare';
export {
  normalizeCandidates,
  buildSelection,
  isAnyStreaming,
} from './components/response/response-compare';
export type {
  CompareCandidate,
  ComparePair,
  CompareCollapse,
  ResponseCompareData,
  CompareSelection,
} from './components/response/response-compare';
export { MessageSkills } from './components/message/message-skills';
export type { MessageSkillsProps, Skill as MessageSkill } from './components/message/message-skills';
export {
  PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction,
  usePromptInput,
} from './components/prompt/prompt-input';
export type {
  PromptInputProps, PromptInputTextareaProps, PromptInputActionsProps, PromptInputActionProps,
} from './components/prompt/prompt-input';
export { ResponseStream } from './components/response/response-stream';
export type { ResponseStreamProps } from './components/response/response-stream';
export { Markdown } from './components/markdown/markdown';
export type { MarkdownProps } from './components/markdown/markdown';
export { CodeBlock, CodeBlockCode, CodeBlockGroup } from './components/code-block/code-block';
export type { CodeBlockProps, CodeBlockCodeProps, CodeBlockGroupProps } from './components/code-block/code-block';
export { Loader } from './components/loader/loader';
export type { LoaderVariant, LoaderSize, LoaderProps } from './components/loader/loader';
export {
  CircularLoader, ClassicLoader, PulseLoader, PulseDotLoader,
  DotsLoader, TypingLoader, WaveLoader, BarsLoader,
  TerminalLoader, TextBlinkLoader, TextShimmerLoader, TextDotsLoader,
} from './components/loader/loader';
export type {
  LoaderShapeProps, LoaderTextProps,
  CircularLoaderProps, ClassicLoaderProps, PulseLoaderProps, PulseDotLoaderProps,
  DotsLoaderProps, TypingLoaderProps, WaveLoaderProps, BarsLoaderProps,
  TerminalLoaderProps, TextBlinkLoaderProps, TextShimmerLoaderProps, TextDotsLoaderProps,
} from './components/loader/loader';
export { FeedbackBar, type FeedbackValue, type FeedbackDetail, type FeedbackBarProps } from './components/feedback/feedback-bar';
export {
  ChainOfThought, ChainOfThoughtStep, ChainOfThoughtTrigger,
  ChainOfThoughtContent, ChainOfThoughtItem,
} from './components/chain-of-thought/chain-of-thought';
export type {
  ChainOfThoughtProps, ChainOfThoughtStepProps, ChainOfThoughtTriggerProps,
  ChainOfThoughtContentProps, ChainOfThoughtItemProps,
  ChainOfThoughtType, ChainOfThoughtStepData, ChainOfThoughtController,
} from './components/chain-of-thought/chain-of-thought';
export { Source, SourceTrigger, SourceContent, SourceList } from './components/source/source';
export type { SourceProps, SourceTriggerProps, SourceContentProps, SourceListProps } from './components/source/source';
export { PromptSuggestion } from './components/prompt/prompt-suggestion';
export type { PromptSuggestionProps } from './components/prompt/prompt-suggestion';
export {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent, emptyMediaVariants,
} from './components/empty/empty';
export type {
  EmptyProps, EmptyHeaderProps, EmptyMediaProps, EmptyTitleProps, EmptyDescriptionProps, EmptyContentProps,
} from './components/empty/empty';
export { ScrollButton } from './components/scroll/scroll-button';
export type { ScrollButtonProps } from './components/scroll/scroll-button';
export { TextShimmer } from './components/text-shimmer/text-shimmer';
export type { TextShimmerProps } from './components/text-shimmer/text-shimmer';
export { Checkpoint, CheckpointIcon, CheckpointTrigger } from './components/checkpoint/checkpoint';
export type { CheckpointProps, CheckpointIconProps, CheckpointTriggerProps } from './components/checkpoint/checkpoint';
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
} from './components/context/context';
export type {
  ContextProps,
  ContextTriggerProps,
  ContextContentProps,
  ContextContentHeaderProps,
  ContextContentBodyProps,
  ContextContentFooterProps,
  ContextUsageRowProps,
  ContextInputUsageProps,
  ContextOutputUsageProps,
  ContextReasoningUsageProps,
  ContextCacheUsageProps,
} from './components/context/context';
export { VoiceInput } from './components/voice/voice-input';
export type { VoiceInputProps, VoiceInputController } from './components/voice/voice-input';
export { ConversationList } from './components/conversation/conversation-list';
export type { ConversationListProps, ConversationListController } from './components/conversation/conversation-list';
export { ConversationItem } from './components/conversation/conversation-item';
export { SlottedConversationItem } from './components/conversation/conversation-item';
export type { SlottedConversationItemProps } from './components/conversation/conversation-item';
export type { ConversationItemProps } from './components/conversation/conversation-item';
export type { ConversationRowDensity } from './components/conversation/conversation-item';
export { Row } from './components/row/row';
export type { RowProps } from './components/row/row';
export { RowGroup } from './components/row/row-group';
export type { RowGroupProps } from './components/row/row-group';
export { ModelSwitcher } from './components/model/model-switcher';
export type { ModelSwitcherProps } from './components/model/model-switcher';
export { ChatScopePicker } from './components/chat/chat-scope-picker';
export type { ChatScopePickerProps } from './components/chat/chat-scope-picker';
export { Tool } from './components/tool/tool';
export type { ToolPart, ToolProps } from './components/tool/tool';
// ToolPart.kind's doc comment says "Derive with `classifyTool(type)`", so the
// function has to be reachable from every entry that surfaces ToolPart. It is
// total, deterministic and terminates in 'generic', so it is safe public API and
// genuinely useful to anyone rendering tool calls themselves.
export { classifyTool } from './primitives/tool-classify';
export type { ToolKind } from './primitives/tool-classify';
export { ThinkingBar } from './components/thinking-bar/thinking-bar';
export type { ThinkingBarProps } from './components/thinking-bar/thinking-bar';
export { Reasoning, ReasoningTrigger, ReasoningContent } from './components/reasoning/reasoning';
export type { ReasoningProps, ReasoningTriggerProps, ReasoningContentProps } from './components/reasoning/reasoning';
export { Image } from './components/image/image';
export type { ImageProps, GeneratedImageLike } from './components/image/image';
export { FileUpload, FileUploadTrigger, FileUploadContent } from './components/file/file-upload';
export type { FileUploadProps, FileUploadTriggerProps, FileUploadContentProps } from './components/file/file-upload';
export {
  Attachments, Attachment, AttachmentPreview, AttachmentInfo, AttachmentRemove,
  AttachmentHoverCard, AttachmentHoverCardTrigger, AttachmentHoverCardContent,
  AttachmentEmpty, getMediaCategory, getAttachmentLabel,
  useAttachmentsContext, useAttachmentContext,
} from './components/attachments/attachments';
export type {
  AttachmentData, AttachmentMediaCategory, AttachmentVariant,
  AttachmentsProps, AttachmentProps, AttachmentPreviewProps,
  AttachmentInfoProps, AttachmentRemoveProps, AttachmentEmptyProps,
  AttachmentHoverCardProps, AttachmentHoverCardTriggerProps, AttachmentHoverCardContentProps,
} from './components/attachments/attachments';

// Chat message types — public API for consumers who need to type their own message arrays.
// NOTE: chat-types.ts also exports an unrelated `Source` interface (a citation), and
// `Source` is already a public component export (./components/source, a citation
// chip/trigger), so re-exporting both under that name is a duplicate-identifier error.
// The citation type therefore ships under its alias `MessageSource`, which is also the
// argument type of the public `AssistantStream.addSource(source)`.
export type {
  ChatMessage, ChatMessageAction, CustomAction, AvatarData, FeedbackVote, MessagePart,
  MessageSource, RawOrigin,
} from './web-components/chat/chat-types';

// Composer document model. This belongs on "." rather than "./solid" because it
// is part of the ELEMENT contract, not the Solid-only surface: `ComposerDoc` is
// the non-string half of `kai-prompt-input` / `kai-composer` / `kai-default-input`'s
// `value` property, and `doc` + `entities` on their `kai-submit` /
// `kai-value-change` details. The shipped prop docs name `ComposerDoc` by name,
// so a React or Vue consumer reading them has to be able to import it. Type-only,
// so it is erased by the build and costs the root barrel nothing.
export type { ComposerDoc, Segment, EntityRef } from './primitives/composer-model';

// ---------------------------------------------------------------------------
// Named types for the remaining kai-* array/object PROPERTIES.
//
// Same rationale as `ComposerDoc` above, applied to the whole class instead of
// one instance: the generated `./web-components` declarations and React wrappers expand
// every prop type structurally (deliberately — see the `IMPORTS = {}` note in
// scripts/gen-web-component-api.mjs), so a consumer who wants to NAME the shape had to
// write `NonNullable<KaiPromptInputElementProps['triggers']>`. Every element-prop
// type that has a name in source is now reachable from "." — the entry a React /
// Vue / Svelte / vanilla consumer imports — not only from "./solid".
//
// Type-only, so the root barrel pays nothing at runtime.
// Guarded by tests/web-components/prop-types-exported.test.ts, which re-derives the
// list from the facades with the TS checker and fails on a new unexported one.
// ---------------------------------------------------------------------------
export type { TriggerDef, TriggerItem } from './components/composer/composer';
export type { ChatThreadContextUsage } from './components/chat/chat-thread';
export type { Skill } from './components/message/message-skills';
export type { AgentStatus } from './components/agent-card/agent-card';
export type { KaiNavItem } from './components/nav/nav';
export type { KaiTabItem } from './components/tabs/tabs';
export type { PaneStatus } from './components/pane/pane';
export type { PaneTab } from './components/pane/pane-group';
export type {
  KaiCheckboxOption, KaiCommandItem, KaiContextUsage, KaiMenuItem, KaiRadioOption, KaiSegmentedOption, KaiSelectOption,
  KaiSourceItem,
} from './web-components/web-component/web-component-data-types';
// `kai-audio-visualizer.shader` takes a ShaderSpec. The element arrived from main
// after this block was written, and prop-types-exported.test.ts caught it, which
// is the point of deriving that list from the facades rather than maintaining it.
export type { ShaderSpec } from './components/audio-visualizer/index';
