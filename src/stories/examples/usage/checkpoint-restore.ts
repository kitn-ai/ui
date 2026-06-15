import type { ExampleUsage, StoryUsage } from './types';

/**
 * Default — an API-design session with two restore points between exchanges.
 * Clicking a checkpoint rolls the conversation back to that point.
 *
 * Web components: `<kc-checkpoint>` renders the icon + trigger for you. Set the
 * scalar `label` / `tooltip` attributes and handle the `select` event (no detail
 * payload) to roll back. The element's built-in trigger shows the `label` text —
 * the demo's custom restore icon inside the trigger is a Solid-only touch (see
 * the Solid tab, which composes `Checkpoint` + `CheckpointIcon` + `CheckpointTrigger`).
 */
const defaultStory: StoryUsage = {
  intro:
    'Mark a restore point between exchanges. `<kc-checkpoint>` draws the icon and a clickable trigger labelled by `label`, with a `tooltip` on hover, and fires `select` (no detail) when clicked — react to it by rolling the conversation back. A custom icon *inside* the trigger isn\'t a built-in prop; compose the SolidJS `Checkpoint` primitives for that (see the Solid tab).',
  snippets: {
    html: `<!-- Register the elements once (CDN or bundler) -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@kitn.ai/chat/dist/kitn-chat.es.js';
</script>

<!-- Scalar strings bind as plain attributes. -->
<kc-checkpoint
  id="cp"
  label="API structure defined"
  tooltip="Restore to this point"
></kc-checkpoint>

<script type="module">
  const cp = document.getElementById('cp');
  // The 'select' event carries no detail — just react to the click.
  cp.addEventListener('select', () => {
    restoreTo('API structure defined'); // roll back to this checkpoint
  });
</script>`,

    react: `import { Checkpoint } from '@kitn.ai/chat/react';

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
import '@kitn.ai/chat/elements'; // register once (e.g. in main.ts)

function onSelect() {
  restoreTo('API structure defined'); // roll back to this checkpoint
}
</script>

<template>
  <!-- Scalar strings are plain attributes; @event listens to the CustomEvent. -->
  <kc-checkpoint
    label="API structure defined"
    tooltip="Restore to this point"
    @select="onSelect"
  />
</template>`,

    svelte: `<script>
  import '@kitn.ai/chat/elements'; // register once

  function onSelect() {
    restoreTo('API structure defined'); // roll back to this checkpoint
  }
</script>

<!-- Scalar strings are plain attributes; on:select wires the event directly. -->
<kc-checkpoint
  label="API structure defined"
  tooltip="Restore to this point"
  on:select={onSelect}
/>`,

    angular: `// main.ts: import '@kitn.ai/chat/elements' before bootstrapApplication,
// and add CUSTOM_ELEMENTS_SCHEMA to the component/module.
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-restore-point',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <kc-checkpoint
      label="API structure defined"
      tooltip="Restore to this point"
      (select)="onSelect()"
    ></kc-checkpoint>
  \`,
})
export class RestorePointComponent {
  onSelect() {
    this.restoreTo('API structure defined'); // roll back to this checkpoint
  }
}`,

    solid: `import { createSignal } from 'solid-js';
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from '@kitn.ai/chat';
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
 * rolls back to that point. Per-story: the Usage tab shows the snippet for the
 * story you're on; the example-level fields below are the fallback.
 */
const checkpointRestore: ExampleUsage = {
  title: 'Examples/Checkpoint & Restore',
  ...defaultStory, // example-level fallback = the primary "Default" story
  stories: {
    Default: defaultStory,
  },
};

export default checkpointRestore;
