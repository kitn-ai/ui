// Attachments demo data + multi-framework code generators.
// One source of truth: a control state → the snippet for each framework. Shared
// by the playground and every focused example so previews and code never drift.

export const FRAMEWORKS = ['HTML', 'React', 'Vue', 'Svelte'] as const;
export type Framework = (typeof FRAMEWORKS)[number];
export const LANG: Record<Framework, string> = { HTML: 'html', React: 'tsx', Vue: 'vue', Svelte: 'svelte' };

export interface State { variant: 'grid' | 'inline' | 'list'; hoverCard: boolean; removable: boolean; }

const thumb = (c: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="${c}"/></svg>`);

// images only (gallery / image examples)
export const IMAGE_ITEMS = [
  { id: '1', type: 'file', filename: 'mountain-landscape.jpg', mediaType: 'image/jpeg', url: thumb('#3b6ea5') },
  { id: '2', type: 'file', filename: 'sunset-beach.png', mediaType: 'image/png', url: thumb('#e8915b') },
  { id: '3', type: 'file', filename: 'forest-trail.jpg', mediaType: 'image/jpeg', url: thumb('#3f7d5b') },
];

// a spread of every media category (image · doc · audio · video · source · unknown)
export const MIXED_ITEMS = [
  { id: '1', type: 'file', filename: 'mountain-landscape.jpg', mediaType: 'image/jpeg', url: thumb('#3b6ea5') },
  { id: '2', type: 'file', filename: 'architecture.pdf', mediaType: 'application/pdf' },
  { id: '3', type: 'file', filename: 'podcast.mp3', mediaType: 'audio/mpeg' },
  { id: '4', type: 'file', filename: 'demo.mp4', mediaType: 'video/mp4' },
  { id: '5', type: 'source-document', title: 'kitn.dev', filename: 'kitn.dev' },
  { id: '6', type: 'file', filename: 'data.bin', mediaType: 'application/octet-stream' },
];

const ITEMS_LITERAL = '[\n    { id: "1", type: "file", filename: "mountain-landscape.jpg", mediaType: "image/jpeg", url: "/img/mountain.jpg" },\n    { id: "2", type: "file", filename: "architecture.pdf", mediaType: "application/pdf" },\n  ]';

export function htmlCode(s: State): string {
  const attrs = [`variant="${s.variant}"`];
  if (s.hoverCard) attrs.push('hover-card');
  if (s.removable) attrs.push('removable');
  return `<kc-attachments ${attrs.join(' ')}></kc-attachments>

<script type="module">
  import '@kitn.ai/chat/elements';
  const el = document.querySelector('kc-attachments');
  el.items = ${ITEMS_LITERAL};${s.removable ? `\n  el.addEventListener('kc-remove', (e) => console.log(e.detail.id));` : ''}
</script>`;
}
export function reactCode(s: State): string {
  const props = [`variant="${s.variant}"`];
  if (s.hoverCard) props.push('hoverCard');
  if (s.removable) props.push('removable');
  return `import { Attachments } from '@kitn.ai/chat/react';

<Attachments
  ${props.join('\n  ')}
  items={items}${s.removable ? `\n  onRemove={(e) => console.log(e.detail.id)}` : ''}
/>;`;
}
export function vueCode(s: State): string {
  const attrs = [`variant="${s.variant}"`];
  if (s.hoverCard) attrs.push('hover-card');
  if (s.removable) attrs.push('removable');
  return `<script setup>
import '@kitn.ai/chat/elements';
const items = ${ITEMS_LITERAL};
</script>

<template>
  <kc-attachments ${attrs.join(' ')}
    :items.prop="items"${s.removable ? `\n    @kc-remove="(e) => console.log(e.detail.id)"` : ''} />
</template>`;
}
export function svelteCode(s: State): string {
  const attrs = [`variant="${s.variant}"`];
  if (s.hoverCard) attrs.push('hover-card');
  if (s.removable) attrs.push('removable');
  return `<script>
  import '@kitn.ai/chat/elements';
  let el;
  const items = ${ITEMS_LITERAL};
  $: if (el) el.items = items;
</script>

<kc-attachments bind:this={el} ${attrs.join(' ')}${s.removable ? `\n  on:kc-remove={(e) => console.log(e.detail.id)}` : ''} />`;
}

export function snippetsFor(s: State): Record<Framework, string> {
  return { HTML: htmlCode(s), React: reactCode(s), Vue: vueCode(s), Svelte: svelteCode(s) };
}
