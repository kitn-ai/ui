// Types the chat kit components reference. Extracted from the kit's origin
// project (@tab-zen/shared) so the kit is self-contained. Only the types the
// components actually import are kept; the RAG/document/adapter types are dropped.

export interface ModelOption {
  id: string;
  name: string;
  provider?: string;
}

export interface SearchFilters {
  tags?: string[];
  authors?: string[];
  contentType?: 'transcript' | 'markdown';
  dateRange?: { from: string; to: string };
}

export interface ConversationScope {
  type: 'document' | 'collection';
  documentId?: string;
  filters?: SearchFilters;
}

export interface ConversationSummary {
  id: string;
  title: string;
  groupId?: string;
  scope: ConversationScope;
  messageCount: number;
  lastMessageAt: string;
  updatedAt: string;
}

export interface ConversationGroup {
  id: string;
  userId?: string;
  teamId?: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}
