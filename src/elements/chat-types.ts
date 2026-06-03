import type { ToolPart } from '../components/tool';
import type { AttachmentData } from '../components/attachments';

export type ChatMessageAction = 'copy' | 'like' | 'dislike' | 'regenerate' | 'edit';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: { text: string; label?: string };
  tools?: ToolPart[];
  attachments?: AttachmentData[];
  actions?: ChatMessageAction[];
}
