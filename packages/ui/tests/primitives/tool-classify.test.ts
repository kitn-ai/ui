import { describe, expect, it } from 'vitest';
import { classifyTool } from '../../src/primitives/tool-classify';

describe('classifyTool', () => {
  it('classifies shell-ish tools as command', () => {
    expect(classifyTool('bash')).toBe('command');
    expect(classifyTool('run_terminal_command')).toBe('command');
    expect(classifyTool('Shell')).toBe('command');
  });

  it('classifies mutation tools as file-change', () => {
    expect(classifyTool('str_replace_editor')).toBe('file-change');
    expect(classifyTool('write_file')).toBe('file-change');
  });

  it('classifies read, view, open and cat FILE tools as file-read, in every casing', () => {
    for (const n of ['read_file', 'ReadFile', 'readFile', 'READ_FILE', 'read-files', 'view_file', 'open_file', 'cat_file', 'cat', 'Read', 'readfile']) {
      expect(classifyTool(n), n).toBe('file-read');
    }
  });

  it('keeps file-read conservative: a substring is not a verb', () => {
    const notReads: [string, string][] = [
      ['thread_list', 'generic'], ['create_item', 'generic'], ['category_list', 'generic'], ['review_code', 'generic'],
      ['preview_page', 'generic'], ['already_done', 'generic'], ['openai_chat', 'generic'], ['open_url', 'generic'],
      ['open_pull_request', 'generic'], ['view', 'generic'], ['open', 'generic'], ['read_email', 'generic'],
      ['view_image', 'image'], ['write_file', 'file-change'], ['read_and_edit_file', 'file-change'], ['find_file', 'search'],
    ];
    for (const [n, kind] of notReads) expect(classifyTool(n), n).toBe(kind);
  });

  it('classifies search before fetch so web_search is a search', () => {
    expect(classifyTool('web_search')).toBe('search');
    expect(classifyTool('grep')).toBe('search');
  });

  it('classifies fetch-ish tools as fetch', () => {
    expect(classifyTool('fetch_url')).toBe('fetch');
  });

  it('classifies image tools as image', () => {
    expect(classifyTool('view_image')).toBe('image');
  });

  it('always terminates in generic for unknown names', () => {
    expect(classifyTool('propose_action')).toBe('generic');
    expect(classifyTool('')).toBe('generic');
    expect(classifyTool('zzzz')).toBe('generic');
  });

  it('is deterministic and case-insensitive', () => {
    expect(classifyTool('BASH')).toBe(classifyTool('bash'));
  });
});
