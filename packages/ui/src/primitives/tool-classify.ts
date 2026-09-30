/** Semantic classification of a tool call, used to pick a rendering. Derived from
 *  the provider-chosen tool NAME, which is arbitrary, so this stays conservative and
 *  prefers 'generic' over a confident wrong answer. */
export type ToolKind =
  | 'command'
  | 'file-change'
  | 'file-read'
  | 'search'
  | 'fetch'
  | 'mcp'
  | 'image'
  | 'generic';

const READ_VERBS = new Set(['read', 'view', 'open', 'cat']);

/** A tool that reads a file: a read/view/open/cat verb AS A WORD next to `file`/`files`, or the
 *  bare `read`/`cat` (the names those tools ship under). Word-wise on purpose: `thread_list`,
 *  `category`, `preview_page`, `openai_chat` and `open_url` contain a verb as a substring and are
 *  not file reads. Splits camelCase before lowercasing, so `ReadFile` and `read_file` agree. */
function isFileRead(name: string): boolean {
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (words.length === 0) return false;
  if (words.length === 1 && (words[0] === 'read' || words[0] === 'cat')) return true;
  if (/^(read|view|open|cat)files?$/.test(words.join(''))) return true;
  return words.some((w) => READ_VERBS.has(w)) && words.some((w) => w === 'file' || w === 'files');
}

/** Total, deterministic, side-effect free. ALWAYS terminates in 'generic' so an
 *  unrecognized tool still renders a panel instead of a blank. Order matters:
 *  'search' is tested before 'fetch' so `web_search` classifies as a search. */
export function classifyTool(name: string): ToolKind {
  const n = name.toLowerCase();
  if (!n) return 'generic';
  const fileRead = isFileRead(name);
  if (n.includes('bash') || n.includes('command') || n.includes('shell') || n.includes('terminal') || n.includes('exec')) return 'command';
  if (n.includes('edit') || n.includes('write') || n.includes('patch') || n.includes('replace') || n.includes('delete')) return 'file-change';
  if (fileRead) return 'file-read';
  if (n.includes('search') || n.includes('grep') || n.includes('glob') || n.includes('find')) return 'search';
  if (n.includes('fetch') || n.includes('http') || n.includes('browse') || n.includes('crawl')) return 'fetch';
  if (n.includes('mcp')) return 'mcp';
  if (n.includes('image') || n.includes('screenshot') || n.includes('vision')) return 'image';
  return 'generic';
}
