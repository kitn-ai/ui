# kc-prompt-input Stoppable Stop/Cancel Affordance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `stoppable` boolean prop/attribute and `kc-stop` event to `kc-prompt-input` so that when `stoppable` + `loading` are both true, the send button is replaced by a Stop button that fires `kc-stop`.

**Architecture:** Wire `stoppable` through the element facade → `DefaultPromptInput` → render a Stop button (square icon, `aria-label="Stop"`) in place of the send button when `loading && stoppable`. The existing send-disable logic is unchanged; we simply swap the button rendition. The `kc-stop` event carries no detail (`{}`). Unit tests verify the Stop button visibility and click callback via the Solid `DefaultPromptInput` component directly (not the custom element, which requires a browser environment). Stories and insight prose are updated to reflect the new built-in affordance.

**Tech Stack:** SolidJS, TypeScript, Vitest + @solidjs/testing-library, Storybook SolidJS

---

### Task 1: Add `stoppable` prop + `kc-stop` event to the element facade

**Files:**
- Modify: `src/elements/prompt-input.tsx`

- [ ] **Step 1: Add `stoppable` to the `Props` interface**

Open `src/elements/prompt-input.tsx`. In the `Props` interface (lines 7–41), after `voice?: boolean;` add:

```tsx
  /** When set and `loading` is true, the send button is replaced by a Stop
   *  button (square icon, "Stop" aria-label). Clicking it fires `kc-stop`. */
  stoppable?: boolean;
```

- [ ] **Step 2: Add `kc-stop` to the `Events` interface**

In the `Events` interface (lines 44–57), after `'kc-voice': Record<string, never>;` add:

```tsx
  /** The Stop button was clicked while `stoppable` and `loading` are both true. */
  'kc-stop': Record<string, never>;
```

- [ ] **Step 3: Add `stoppable: false` to the `defineWebComponent` defaults**

In the `defineWebComponent` call (line 59), in the defaults object, after `voice: false,` add:

```tsx
  stoppable: false,
```

- [ ] **Step 4: Thread `stoppable` + `onStop` through to `DefaultPromptInput`**

In the facade render return (lines 100–122), add `stoppable` and `onStop` props to `<DefaultPromptInput ...>`:

```tsx
  return (
    <DefaultPromptInput
      value={current()}
      placeholder={props.placeholder}
      disabled={flag('disabled')}
      loading={flag('loading')}
      stoppable={flag('stoppable')}
      suggestions={props.suggestions}
      attachments={attachments()}
      slashCommands={props.slashCommands}
      slashActiveIds={props.slashActiveIds}
      slashCompact={flag('slashCompact')}
      search={flag('search')}
      voice={flag('voice')}
      onValueChange={handleChange}
      onSubmit={handleSubmit}
      onSuggestionClick={handleSuggestionClick}
      onAttachmentsChange={setAttachments}
      onSearch={() => dispatch('kc-search')}
      onVoice={() => dispatch('kc-voice')}
      onStop={() => dispatch('kc-stop')}
      onSlashSelect={(command) => dispatch('kc-slash-select', { command })}
    />
  );
```

---

### Task 2: Add `stoppable` + `onStop` to `DefaultPromptInput` and render the Stop button

**Files:**
- Modify: `src/elements/default-input.tsx`

- [ ] **Step 1: Add `stoppable` and `onStop` to `DefaultPromptInputProps`**

In `DefaultPromptInputProps` (lines 16–42), after `onSlashSelect?: (command: SlashCommandItem) => void;` add:

```tsx
  /** When `true` and `loading` is also `true`, the send button is replaced by
   *  a Stop button that calls `onStop`. */
  stoppable?: boolean;
  /** Called when the user clicks the Stop button. */
  onStop?: () => void;
```

- [ ] **Step 2: Add `Square` to the lucide-solid import**

At line 6, the existing import is:
```tsx
import { Paperclip, Globe, Mic } from 'lucide-solid';
```

Change it to:
```tsx
import { Paperclip, Globe, Mic, Square } from 'lucide-solid';
```

- [ ] **Step 3: Add a `showStop` derived accessor and replace the send button with a conditional**

In `DefaultPromptInput` (after line 71), `sendDisabled` is already defined. Add a second accessor immediately below it:

```tsx
  const showStop = () => !!props.loading && !!props.stoppable;
```

Then replace the existing `<Button ... data-testid="send" ...>` block (lines 172–184) with a `<Show>` that toggles between the Stop button and the send button:

```tsx
          <Show
            when={showStop()}
            fallback={
              <Button
                size="icon-sm"
                class="rounded-full"
                data-testid="send"
                aria-label="Send message"
                disabled={sendDisabled()}
                onClick={props.onSubmit}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                </svg>
              </Button>
            }
          >
            <Button
              size="icon-sm"
              variant="outline"
              class="rounded-full"
              data-testid="stop"
              aria-label="Stop"
              onClick={props.onStop}
            >
              <Square class="size-3" />
            </Button>
          </Show>
```

---

### Task 3: Write unit tests for the Stop button behavior

**Files:**
- Create: `src/elements/prompt-input-stoppable.test.tsx`

- [ ] **Step 1: Write the failing tests first**

Create `src/elements/prompt-input-stoppable.test.tsx` with this content:

```tsx
/**
 * Unit tests for the stoppable Stop button affordance in DefaultPromptInput.
 *
 * Strategy: test DefaultPromptInput (the Solid component) directly — the
 * defineWebComponent custom element requires a full browser environment
 * (Constructable Stylesheets, shadow roots) unsuitable for jsdom.
 * This mirrors the pattern in prompt-suggestions.declarative.test.tsx.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { DefaultPromptInput } from './default-input';

afterEach(cleanup);

const noop = () => {};
const baseProps = {
  value: '',
  onValueChange: noop,
  onSubmit: noop,
  onSuggestionClick: noop,
};

describe('DefaultPromptInput stoppable Stop button', () => {
  it('renders the send button (not Stop) when loading=false stoppable=false', () => {
    const { getByTestId, queryByTestId } = render(() => (
      <DefaultPromptInput {...baseProps} loading={false} stoppable={false} />
    ));
    expect(getByTestId('send')).toBeInTheDocument();
    expect(queryByTestId('stop')).not.toBeInTheDocument();
  });

  it('renders the send button (not Stop) when stoppable=true but loading=false', () => {
    const { getByTestId, queryByTestId } = render(() => (
      <DefaultPromptInput {...baseProps} loading={false} stoppable={true} />
    ));
    expect(getByTestId('send')).toBeInTheDocument();
    expect(queryByTestId('stop')).not.toBeInTheDocument();
  });

  it('renders the send button (not Stop) when loading=true but stoppable=false', () => {
    const { getByTestId, queryByTestId } = render(() => (
      <DefaultPromptInput {...baseProps} loading={true} stoppable={false} />
    ));
    expect(getByTestId('send')).toBeInTheDocument();
    expect(queryByTestId('stop')).not.toBeInTheDocument();
  });

  it('renders the Stop button (not send) when both loading=true and stoppable=true', () => {
    const { getByTestId, queryByTestId } = render(() => (
      <DefaultPromptInput {...baseProps} loading={true} stoppable={true} />
    ));
    expect(getByTestId('stop')).toBeInTheDocument();
    expect(queryByTestId('send')).not.toBeInTheDocument();
  });

  it('Stop button has accessible label "Stop"', () => {
    const { getByLabelText } = render(() => (
      <DefaultPromptInput {...baseProps} loading={true} stoppable={true} />
    ));
    expect(getByLabelText('Stop')).toBeInTheDocument();
  });

  it('clicking the Stop button calls onStop', () => {
    const onStop = vi.fn();
    const { getByTestId } = render(() => (
      <DefaultPromptInput {...baseProps} loading={true} stoppable={true} onStop={onStop} />
    ));
    fireEvent.click(getByTestId('stop'));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('clicking the Stop button does NOT call onSubmit', () => {
    const onSubmit = vi.fn();
    const onStop = vi.fn();
    const { getByTestId } = render(() => (
      <DefaultPromptInput
        {...baseProps}
        onSubmit={onSubmit}
        loading={true}
        stoppable={true}
        onStop={onStop}
      />
    ));
    fireEvent.click(getByTestId('stop'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail (Stop button does not exist yet)**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat && npx vitest run src/elements/prompt-input-stoppable.test.tsx 2>&1 | tail -30
```

Expected: several tests fail because `DefaultPromptInput` does not yet accept `stoppable` / render the Stop button.

---

### Task 4: Add a Storybook story for the stoppable pattern

**Files:**
- Modify: `src/stories/prompt-input-variants.stories.tsx`

- [ ] **Step 1: Add a `StoppableStreaming` story after `FullExample`**

At the end of `src/stories/prompt-input-variants.stories.tsx`, add the following export:

```tsx
export const StoppableStreaming: Story = {
  name: 'Stoppable / Stop Button (kc-prompt-input)',
  render: () => {
    const [loading, setLoading] = createSignal(false);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const handleSubmit = (value: string) => {
      if (!value.trim()) return;
      setLoading(true);
      // Simulate a 3-second stream; in production replace with AbortController + fetch.
      timer = setTimeout(() => setLoading(false), 3000);
    };

    const handleStop = () => {
      clearTimeout(timer);
      setLoading(false);
    };

    // We render the kc-prompt-input element via onMount to show it works as a web component.
    // For the Solid primitive equivalent, see FullExample.
    return (
      <div class="w-full max-w-2xl p-4 space-y-4">
        <p class="text-sm text-muted-foreground">
          Set <code>stoppable</code> on <code>kc-prompt-input</code>: while <code>loading</code> is
          true, the send button is replaced by a Stop button that fires <code>kc-stop</code>.
          Your handler aborts the fetch / SSE stream, then clears the loading flag.
        </p>
        <PromptInput
          isLoading={loading()}
          disabled={loading()}
          onSubmit={() => {}}
          value=""
          onValueChange={() => {}}
        >
          <PromptInputTextarea
            placeholder={loading() ? 'Generating...' : 'Type something and submit...'}
          />
          <PromptInputActions class="justify-end">
            <Show
              when={loading()}
              fallback={
                <Button
                  size="icon-sm"
                  class="rounded-full"
                  aria-label="Send message"
                  onClick={() => handleSubmit('demo')}
                >
                  <ArrowUp class="size-4" />
                </Button>
              }
            >
              <Button
                size="icon-sm"
                variant="outline"
                class="rounded-full"
                aria-label="Stop"
                onClick={handleStop}
              >
                <Square class="size-3" />
              </Button>
            </Show>
          </PromptInputActions>
        </PromptInput>
        <p class="text-xs text-muted-foreground">
          Element usage: <code>&lt;kc-prompt-input stoppable loading&gt;</code> + listen for <code>kc-stop</code> to call <code>controller.abort()</code>.
        </p>
      </div>
    );
  },
};
```

Note: `ArrowUp`, `Square`, `Show`, `createSignal` are already imported at the top of the file. Confirm `Show` is imported (it's in the `solid-js` import on line 2).

---

### Task 5: Update stale insight prose in usage files

**Files:**
- Modify: `src/stories/prompt-input-variants.stories.tsx` (the `StreamingState` story description — line 118)
- Modify: `src/stories/examples/usage/prompt-input-variants.ts` (the `streaming` insight and `fullExample` GOTCHAS comment)

- [ ] **Step 1: Update `StreamingState` story description in the stories file**

In `src/stories/prompt-input-variants.stories.tsx`, the `StreamingState` story description at line 118 reads:
```
<p class="text-sm text-muted-foreground mb-2">Disabled while streaming (with stop button)</p>
```

This story doesn't use `kc-prompt-input`'s `stoppable`; it's a raw Solid primitive demo. No wording change is needed here — the `StoppableStreaming` story added in Task 4 is the one that documents the built-in affordance.

- [ ] **Step 2: Update the `streaming` insight in `prompt-input-variants.ts`**

In `src/stories/examples/usage/prompt-input-variants.ts`, find the `streaming` constant's `intro` field (around line 431):

Current text:
```
'Block input while a reply streams. Set `loading` to show the streaming state and stop accepting submits, and `disabled` to make the box fully non-interactive. (The demo composes the SolidJS `PromptInput` + `Loader` primitives to show the typing/dots indicators and a stop button.)'
```

Replace it with:
```
'Block input while a reply streams. Set `loading` to show the streaming state and stop accepting submits, and `disabled` to make the box fully non-interactive. Add `stoppable` to get a built-in Stop button that fires `kc-stop` — listen for that event and call `controller.abort()` on your fetch/SSE. (The demo composes the SolidJS `PromptInput` + `Loader` primitives to show the typing/dots indicators and a stop button.)'
```

- [ ] **Step 3: Update the `fullExample` GOTCHAS comment in `prompt-input-variants.ts`**

In `src/stories/examples/usage/prompt-input-variants.ts`, find the JSDoc comment before the `fullExample` constant (around lines 903–926). The current text includes:

```
 *  - Stop button is NOT built into `kc-prompt-input`. Compose it yourself in `PromptInputActions`
 *    and call `controller.abort()` (or `clearTimeout` in the demo) in its onClick handler.
```

Replace just those two lines with:

```
 *  - Stop button: add `stoppable` to `kc-prompt-input` and listen for `kc-stop` — the element
 *    fires it when the Stop button is clicked. Call `controller.abort()` in your handler to
 *    cancel the fetch/SSE. When composing Solid primitives, wire the Square button yourself
 *    (see FullExample). The element does the toggling for you; the consumer still owns the abort.
```

- [ ] **Step 4: Update the `fullExample` `intro` field**

The `intro` field of `fullExample` (around line 929) contains:

```
'...the Stop button is **not** built into the element — compose it yourself and call `controller.abort()` on your own fetch.'
```

Replace just that fragment (at the end of the intro) with:

```
'...add `stoppable` to enable the built-in Stop button — it fires `kc-stop` when clicked; call `controller.abort()` in your handler to cancel the stream. When composing Solid primitives (the `PromptInput` + `PromptInputActions` pattern), wire the Square button yourself as shown in the Full Example story.'
```

- [ ] **Step 5: Update all HTML/framework snippet comments in `fullExample` that say "Stop is NOT built in"**

In `src/stories/examples/usage/prompt-input-variants.ts`, search for the phrase `Stop button is NOT built in` (appears in HTML snippet comment ~line 981, and in the Solid snippet comment ~line 1307). Replace each occurrence:

In the HTML snippet comment (~line 981):
```js
  // The Stop button is NOT built in — compose it yourself.
  stopBtn.addEventListener('click', () => controller?.abort());
```
Change to:
```js
  // With stoppable set, kc-stop fires when the built-in Stop button is clicked.
  // prompt.addEventListener('kc-stop', () => controller?.abort());
  // OR compose your own stop button outside the element:
  stopBtn.addEventListener('click', () => controller?.abort());
```

In the React snippet comment (~line 1033):
```jsx
        // Stop button is NOT built into kc-prompt-input — compose it yourself.
        <button onClick={() => controllerRef.current?.abort()}>Stop</button>
```
Change to:
```jsx
        {/* With stoppable + onStop, kc-prompt-input renders the Stop button for you.
            Here we compose it manually for illustration. */}
        <button onClick={() => controllerRef.current?.abort()}>Stop</button>
```

In Vue template comment (~line 1093):
```html
    <!-- Stop is NOT built in — compose it yourself -->
    <button v-if="streaming" @click="stop">Stop</button>
```
Change to:
```html
    <!-- Add stoppable + listen for kc-stop to use the built-in Stop button.
         Here we compose it manually outside the element for illustration. -->
    <button v-if="streaming" @click="stop">Stop</button>
```

In Svelte comment (~line 1148):
```svelte
  <!-- Stop is NOT built in — compose it yourself -->
  {#if streaming}
```
Change to:
```svelte
  <!-- Add stoppable + listen for kc-stop to use the built-in Stop button.
       Here we compose it manually outside the element for illustration. -->
  {#if streaming}
```

In the Solid snippet comment (~line 1307):
```tsx
            {/* Stop is NOT built into kc-prompt-input — compose it here */}
```
Change to:
```tsx
            {/* Solid primitive: wire the Stop button yourself inside PromptInputActions.
                With the kc-prompt-input element, add stoppable and listen for kc-stop instead. */}
```

---

### Task 6: Run tests and typecheck

**Files:** (none created/modified — verification only)

- [ ] **Step 1: Run the unit tests to confirm they pass**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat && npx vitest run src/elements/prompt-input-stoppable.test.tsx 2>&1 | tail -40
```

Expected: all 7 tests pass (PASS).

- [ ] **Step 2: Run TypeScript typecheck**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat && npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 3: Run the full unit test suite to check for regressions**

```bash
cd /Users/home/Projects/kitn-ai/kitn-chat && npx vitest run --project=default 2>&1 | tail -20
```

Expected: all tests pass (or the same tests that were failing before this change still fail — no new failures).
