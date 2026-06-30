// Per-page Markdown twin: every docs page is also served at `<path>.md` (raw,
// LLM-friendly Markdown). Powers "View as Markdown", the "Copy page" button, and
// the "Open in ChatGPT/Claude" prompts. Mirrors the shadcn/Fumadocs pattern.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection('docs');
  return docs
    .filter((d) => d.id !== 'index') // skip the splash landing — no prose body
    .map((d) => ({ params: { slug: d.id }, props: { entry: d } }));
};

export const GET: APIRoute = ({ props }) => {
  const entry = (props as { entry: { body?: string; data: { title?: string; description?: string } } }).entry;
  const raw = entry.body ?? '';

  // Light MDX → Markdown cleanup so the output reads as plain docs for an LLM.
  const md = raw
    .replace(/^\s*import\s+.*$/gm, '')                          // drop `import ...` lines
    .replace(/<p class="kai-lede">([\s\S]*?)<\/p>/g, '$1\n')    // unwrap the lede paragraph
    .replace(/<Aside[^>]*type="([^"]+)"[^>]*>/g, '\n> **$1:** ') // <Aside type="x"> → blockquote
    .replace(/<\/Aside>/g, '\n')
    .replace(/<[A-Z][A-Za-z0-9]*\b[^>]*\/>/g, '')               // drop self-closing JSX (e.g. <ModelContextDemo />)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const title = entry.data.title ?? '';
  const description = entry.data.description ?? '';
  const out = `# ${title}\n\n${description ? description + '\n\n' : ''}${md}\n`;

  return new Response(out, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
