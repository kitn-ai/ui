import type { ExampleUsage, StoryUsage } from './types';

/**
 * API Design Session with Restore Points — two checkpoints between three
 * exchanges. Clicking a checkpoint fires `kai-select` (no detail) — the app
 * is responsible for slicing the message list back to that point.
 *
 * API notes (confirmed in src/elements/checkpoint.tsx):
 * - `label`   — optional visible text beside the icon.
 * - `tooltip` — optional hover text.
 * - `variant` — 'ghost' | 'default' | 'outline' (default 'ghost').
 * - `size`    — 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' (default 'sm').
 * - `kai-select` fires with NO detail payload — identify the checkpoint by
 *   which handler you wired, not from the event.
 * - There is NO `icon` prop on `<kai-checkpoint>` (planned gap). For a custom
 *   trigger icon, compose the SolidJS `CheckpointTrigger` with custom children.
 */
const defaultStory: StoryUsage = {
  intro:
    'Mark a restore point between exchanges. `<kai-checkpoint>` draws the icon and a clickable trigger labelled by `label`, with a `tooltip` on hover, and fires `kai-select` (no detail payload) when clicked — react to it by slicing your message list back to that checkpoint. **"Restoring" is your responsibility; the element just emits an event.** There is no `icon` prop on the WC — compose the SolidJS `CheckpointTrigger` with custom children for a custom icon (see the Solid tab).',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/kai.es.js';
</script>

<!-- Scalar strings bind as plain attributes. -->
<kai-checkpoint
  id="cp"
  label="API structure defined"
  tooltip="Restore to this point"
></kai-checkpoint>

<script type="module">
  const cp = document.getElementById('cp');
  // The 'select' event carries no detail — just react to the click.
  cp.addEventListener('kai-select', () => {
    restoreTo('API structure defined'); // roll back to this checkpoint
  });
</script>`,

    react: `import { Checkpoint } from '@kitn.ai/ui/react';

export function RestorePoint() {
  return (
    <Checkpoint
      label="API structure defined"
      tooltip="Restore to this point"
      onSelect={() => {
        restoreTo('API structure defined'); // roll back to this checkpoint
      }}
    />
  );
}`,

    vue: `<script setup>
import '@kitn.ai/ui/elements'; // register once (e.g. in main.ts)

function onSelect() {
  restoreTo('API structure defined'); // roll back to this checkpoint
}
</script>

<template>
  <!-- Scalar strings are plain attributes; @event listens to the CustomEvent. -->
  <kai-checkpoint
    label="API structure defined"
    tooltip="Restore to this point"
    @kai-select="onSelect"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/ui/elements'; // register once

  function onSelect() {
    restoreTo('API structure defined'); // roll back to this checkpoint
  }
</script>

<!-- Scalar strings are plain attributes; on:kai-select wires the event directly. -->
<kai-checkpoint
  label="API structure defined"
  tooltip="Restore to this point"
  on:kai-select={onSelect}
/>`,

    angular: `// main.ts: import '@kitn.ai/ui/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component/module.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-restore-point',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kai-checkpoint
      label="API structure defined"
      tooltip="Restore to this point"
      (kai-select)="onSelect()"
    ></kai-checkpoint>
  \`,
})
export class RestorePointComponent {
  onSelect() {
    this.restoreTo('API structure defined'); // roll back to this checkpoint
  }
}`,

    solid: `import { createSignal } from 'solid-js';
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from '@kitn.ai/ui';
import { RotateCcw } from 'lucide-solid';

export function RestorePoint() {
  const [restoredTo, setRestoredTo] = createSignal<string | null>(null);

  return (
    // Composing the primitives lets you put a custom icon inside the trigger.
    <Checkpoint>
      <CheckpointIcon />
      <CheckpointTrigger
        tooltip="Restore to this point"
        onClick={() => setRestoredTo('API structure defined')}
      >
        <div class="flex items-center gap-1.5 text-xs">
          <RotateCcw class="size-3" />
          <span>API structure defined</span>
        </div>
      </CheckpointTrigger>
    </Checkpoint>
  );
}`,
  },
};

/**
 * Example: Checkpoint & Restore — mark a restore point in a conversation. The
 * story renders a session with two checkpoints between exchanges; clicking one
 * fires `kai-select` — the app slices its message list to that point. Per-story:
 * the Usage tab shows the snippet for the story you're on; the example-level
 * fields below are the fallback.
 *
 * Key gotchas:
 * - `kai-select` carries no detail — identify which checkpoint by which handler.
 * - Restoring is your state management; the element just emits the event.
 * - No `icon` prop on the WC; compose SolidJS primitives for custom icons.
 */
const checkpointRestore: ExampleUsage = {
  title: 'Examples/Checkpoint & Restore',
  ...defaultStory, // example-level fallback = the primary story
  stories: {
    'API Design Session with Restore Points': defaultStory,
  },
};

export default checkpointRestore;
