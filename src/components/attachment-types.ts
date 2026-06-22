/** A message attachment descriptor. Pure type — kept JSX-free for the
 *  framework-neutral consumers (state core, React hook typecheck). */
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
