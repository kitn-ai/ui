import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import {
  ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageAvatar, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  Source, SourceTrigger, SourceContent, SourceList,
  Button, Separator,
} from '../index';
import { Copy, ThumbsUp, ThumbsDown, ArrowUp } from 'lucide-solid';
import '../elements/register'; // registers kc-sources / kc-source

// kc-sources / kc-source IntrinsicElements are already declared in
// src/elements/source-list.stories.tsx (same TS project, merged interface).
// Re-declare here so this file is self-contained; types must match exactly.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // Plain HTMLAttributes — `numbered` is set via setAttribute in onMount.
      'kc-sources': JSX.HTMLAttributes<HTMLElement>;
      'kc-source': JSX.HTMLAttributes<HTMLElement> & {
        href?: string;
        label?: string;
        headline?: string;
        description?: string;
        'show-favicon'?: boolean | '';
      };
    }
  }
}

const meta: Meta = {
  title: 'Examples/Conversation with Sources',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'Show inline citations below an assistant reply. Two routes:',
          '',
          '**Prop route (`sources` array):** set `<kc-sources>.sources = [{ href, title, description, label?, showFavicon? }]` as a JS property. Prop sources render first.',
          '',
          '**Declarative route (`<kc-source>` children):** place `<kc-source>` elements as children of `<kc-sources>`. They are picked up via `MutationObserver` and appended after any prop sources. Use `headline` (not `title` — `title` is a reserved HTML attribute that conflicts with the custom-element constructor). Confirmed in `src/elements/source.tsx`.',
          '',
          '**Automatic numbered labels (`numbered` prop):** set `<kc-sources numbered>` (HTML) or `el.numbered = true` (JS) to label each citation chip with its 1-based index (`1`, `2`, `3`, …) from the merged prop+children list. Per-item `label` values are ignored when `numbered` is set. For manual control, omit `numbered` and set `label={1}` / `label={2}` etc. on each `SourceTrigger` (Solid) or the `label` attribute on each `<kc-source>` child.',
          '',
          '**When to omit favicons:** the favicon is fetched from the link\'s domain. Skip it for internal/localhost URLs, or when the domain\'s favicon is low-contrast on your background.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: 'Multi-turn with Citations',
  parameters: {
    docs: {
      description: {
        story: [
          'Two exchanges, two citation styles. First exchange uses `label={1|2|3}` for numbered badges, no favicons. Second exchange adds `showFavicon` per-trigger.',
          '',
          '**Note:** `<kc-source>` uses `headline` not `title` for the hover-card heading — `title` is a reserved HTML attribute that conflicts with the custom-element constructor (`src/elements/source.tsx`).',
          '',
          'See the **Numbered Citations** story for the `numbered` prop that auto-labels all chips with their 1-based index.',
        ].join('\n'),
      },
    },
  },
  render: () => (
    <div class="flex flex-col h-[650px] w-full max-w-2xl bg-background rounded-xl shadow-lg overflow-hidden">
      <div class="flex items-center px-4 py-3">
        <h2 class="text-sm font-semibold text-foreground">Research: WebAssembly in Production</h2>
      </div>
      <Separator />

      <ChatContainer class="flex-1 p-4">
        <ChatContainerContent class="space-y-6 py-4">

          {/* First exchange */}
          <Message>
            <MessageAvatar src="" fallback="U" alt="User" />
            <MessageContent>
              What are the real-world performance benefits of using WebAssembly in production web apps? I want concrete examples, not just benchmarks.
            </MessageContent>
          </Message>

          <Message>
            <MessageAvatar src="" fallback="AI" alt="Assistant" />
            <div class="flex-1 space-y-2">
              <MessageContent markdown>
{`Several major companies have deployed WebAssembly in production with measurable results:

**Figma** replaced their C++ to asm.js pipeline with Wasm and saw a **3x performance improvement** in load times. Their design tool renders complex vector graphics at 60fps using a Wasm-compiled engine.

**Google Earth** ported their native rendering engine to Wasm, enabling the full 3D globe experience in browsers without plugins. Frame rendering dropped from **40ms to 12ms** per frame.

**Shopify** uses Wasm for their theme editor's Liquid template parsing, achieving **10x faster** template compilation compared to their previous JavaScript parser.

The pattern is consistent: CPU-intensive tasks like **image processing, cryptography, physics simulation, and codec operations** see the largest gains. IO-bound operations don't benefit as much.`}
              </MessageContent>

              <SourceList>
                <Source href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/">
                  <SourceTrigger label={1} />
                  <SourceContent
                    title="WebAssembly cut Figma's load time by 3x"
                    description="How Figma leveraged WebAssembly to dramatically improve their browser-based design tool performance."
                  />
                </Source>
                <Source href="https://web.dev/case-studies/earth-webassembly">
                  <SourceTrigger label={2} />
                  <SourceContent
                    title="Google Earth and WebAssembly - web.dev"
                    description="Case study on porting Google Earth's C++ rendering engine to WebAssembly for browser delivery."
                  />
                </Source>
                <Source href="https://shopify.engineering/shopify-webassembly">
                  <SourceTrigger label={3} />
                  <SourceContent
                    title="How Shopify Uses WebAssembly"
                    description="Shopify's journey using WebAssembly for Liquid template parsing in their online store editor."
                  />
                </Source>
              </SourceList>

              <MessageActions>
                <Button variant="ghost" size="icon-sm" aria-label="Copy message"><Copy class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Good response"><ThumbsUp class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Bad response"><ThumbsDown class="size-3.5" /></Button>
              </MessageActions>
            </div>
          </Message>

          {/* Second exchange with different citation pattern */}
          <Message>
            <MessageAvatar src="" fallback="U" alt="User" />
            <MessageContent>
              What about the downsides? Are there situations where Wasm actually hurts performance?
            </MessageContent>
          </Message>

          <Message>
            <MessageAvatar src="" fallback="AI" alt="Assistant" />
            <div class="flex-1 space-y-2">
              <MessageContent markdown>
{`Yes, there are real tradeoffs to consider:

**Bundle size** -- Wasm modules can be significantly larger than equivalent JavaScript. The Squoosh image editor found their Wasm codecs added **2-4MB** of download size, which they mitigated with lazy loading.

**DOM access overhead** -- Every call from Wasm to the DOM crosses a boundary with serialization cost. Applications that frequently manipulate the DOM (like React-style UI frameworks) can actually be **slower** in Wasm than optimized JavaScript.

**Startup latency** -- Wasm modules must be compiled before execution. While streaming compilation helps, large modules can take **200-500ms** to initialize on mobile devices.

**Garbage collection** -- Until the Wasm GC proposal ships broadly, languages like Go and Java bring their own GC runtime, adding **5-20MB** to module size.

The consensus from the Chrome team's analysis is: **use Wasm for compute-heavy inner loops, keep UI and orchestration in JavaScript**.`}
              </MessageContent>

              <SourceList>
                <Source href="https://web.dev/squoosh-v2/">
                  <SourceTrigger label={1} showFavicon />
                  <SourceContent
                    title="Squoosh v2: codec improvements with WebAssembly"
                    description="How the Squoosh team manages Wasm codec size and loading strategies for their image compression tool."
                  />
                </Source>
                <Source href="https://surma.dev/things/js-to-asc/">
                  <SourceTrigger label={2} showFavicon />
                  <SourceContent
                    title="JavaScript to AssemblyScript - Surma.dev"
                    description="Detailed performance comparison of JS vs AssemblyScript/Wasm for various workloads including DOM-heavy tasks."
                  />
                </Source>
                <Source href="https://v8.dev/blog/wasm-compilation-pipeline">
                  <SourceTrigger label={3} showFavicon />
                  <SourceContent
                    title="Liftoff: V8's Wasm baseline compiler"
                    description="V8 team's analysis of Wasm compilation latency and their streaming compilation optimization."
                  />
                </Source>
                <Source href="https://chromestatus.com/feature/6062715726462976">
                  <SourceTrigger label={4} showFavicon />
                  <SourceContent
                    title="WebAssembly Garbage Collection - Chrome Platform Status"
                    description="Status of the WasmGC proposal and its impact on languages targeting WebAssembly."
                  />
                </Source>
              </SourceList>

              <MessageActions>
                <Button variant="ghost" size="icon-sm" aria-label="Copy message"><Copy class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Good response"><ThumbsUp class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Bad response"><ThumbsDown class="size-3.5" /></Button>
              </MessageActions>
            </div>
          </Message>

          <ChatContainerScrollAnchor />
        </ChatContainerContent>
      </ChatContainer>

      <div class="px-4 pb-4">
        <PromptInput>
          <PromptInputTextarea placeholder="Ask about WebAssembly..." />
          <PromptInputActions class="justify-end">
            <Button variant="default" size="icon-sm" class="rounded-full" aria-label="Send message">
              <ArrowUp class="size-4" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Numbered Citations story
// ---------------------------------------------------------------------------

export const Numbered: Story = {
  name: 'Numbered Citations',
  parameters: {
    docs: {
      description: {
        story: [
          'Demonstrates the `numbered` boolean prop on `<kc-sources>` / `SourceList`.',
          '',
          'When `numbered` is set, every citation chip is auto-labelled with its **1-based index** in the merged (prop + declarative-children) source list, regardless of any per-item `label` value.',
          '',
          '- Solid: pass `numbered` prop on the wrapping element (future support) or render index manually as shown here.',
          '- Web component: `<kc-sources numbered>` or `el.numbered = true`.',
          '',
          '**Inline prose citations** (e.g. `[1]` inside a markdown paragraph) are still manual — this prop only controls the chip labels in the source strip.',
          '',
          '**Note:** `<kc-source>` uses `headline` (not `title`) as the hover-card attribute.',
        ].join('\n'),
      },
    },
  },
  render: () => (
    <div class="flex flex-col gap-6 p-4 w-full max-w-2xl bg-background rounded-xl shadow-lg">
      <div>
        <p class="text-sm text-muted-foreground mb-1">
          Sources strip with <code>numbered</code> — chips show 1, 2, 3 automatically:
        </p>
        <SourceList>
          <Source href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/">
            <SourceTrigger label={1} />
            <SourceContent
              title="WebAssembly cut Figma's load time by 3x"
              description="How Figma leveraged WebAssembly to dramatically improve their browser-based design tool performance."
            />
          </Source>
          <Source href="https://web.dev/case-studies/earth-webassembly">
            <SourceTrigger label={2} />
            <SourceContent
              title="Google Earth and WebAssembly - web.dev"
              description="Case study on porting Google Earth's C++ rendering engine to WebAssembly for browser delivery."
            />
          </Source>
          <Source href="https://shopify.engineering/shopify-webassembly">
            <SourceTrigger label={3} />
            <SourceContent
              title="How Shopify Uses WebAssembly"
              description="Shopify's journey using WebAssembly for Liquid template parsing in their online store editor."
            />
          </Source>
          <Source href="https://surma.dev/things/js-to-asc/">
            <SourceTrigger label={4} />
            <SourceContent
              title="JavaScript to AssemblyScript - Surma.dev"
              description="Detailed performance comparison of JS vs AssemblyScript/Wasm for various workloads."
            />
          </Source>
        </SourceList>
      </div>

      <div>
        <p class="text-sm text-muted-foreground mb-1">
          Same sources without numbering — chips fall back to domain labels:
        </p>
        <SourceList>
          <Source href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/">
            <SourceTrigger />
            <SourceContent
              title="WebAssembly cut Figma's load time by 3x"
              description="How Figma leveraged WebAssembly to dramatically improve their browser-based design tool performance."
            />
          </Source>
          <Source href="https://web.dev/case-studies/earth-webassembly">
            <SourceTrigger />
            <SourceContent
              title="Google Earth and WebAssembly - web.dev"
              description="Case study on porting Google Earth's C++ rendering engine to WebAssembly for browser delivery."
            />
          </Source>
          <Source href="https://shopify.engineering/shopify-webassembly">
            <SourceTrigger />
            <SourceContent
              title="How Shopify Uses WebAssembly"
              description="Shopify's journey using WebAssembly for Liquid template parsing in their online store editor."
            />
          </Source>
          <Source href="https://surma.dev/things/js-to-asc/">
            <SourceTrigger />
            <SourceContent
              title="JavaScript to AssemblyScript - Surma.dev"
              description="Detailed performance comparison of JS vs AssemblyScript/Wasm for various workloads."
            />
          </Source>
        </SourceList>
      </div>

      <div>
        <p class="text-sm text-muted-foreground mb-1">
          Numbered with favicons (<code>showFavicon</code> per-trigger):
        </p>
        <SourceList>
          <Source href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/">
            <SourceTrigger label={1} showFavicon />
            <SourceContent
              title="WebAssembly cut Figma's load time by 3x"
              description="How Figma leveraged WebAssembly to dramatically improve their browser-based design tool performance."
            />
          </Source>
          <Source href="https://web.dev/case-studies/earth-webassembly">
            <SourceTrigger label={2} showFavicon />
            <SourceContent
              title="Google Earth and WebAssembly - web.dev"
              description="Case study on porting Google Earth's C++ rendering engine to WebAssembly for browser delivery."
            />
          </Source>
          <Source href="https://shopify.engineering/shopify-webassembly">
            <SourceTrigger label={3} showFavicon />
            <SourceContent
              title="How Shopify Uses WebAssembly"
              description="Shopify's journey using WebAssembly for Liquid template parsing in their online store editor."
            />
          </Source>
        </SourceList>
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Numbered Citations (composition) story
// ---------------------------------------------------------------------------

export const NumberedComposition: Story = {
  name: 'Numbered Citations (composition)',
  parameters: {
    docs: {
      description: {
        story: [
          'The **same** numbered-citation strip as the "Numbered Citations" story — but built entirely from `<kc-sources numbered>` + `<kc-source>` children in markup.',
          '',
          'No `sources` JS property is set. The `<kc-sources>` element reads its `<kc-source>` light-DOM children via `MutationObserver` and appends them to the merged source list automatically. The `numbered` boolean attribute then labels each chip with its 1-based index.',
          '',
          'Attribute reference for `<kc-source>`:',
          '- `href` — the URL to link to (domain seeds the default label/favicon)',
          '- `headline` — hover-card heading (**not** `title` — `title` is a reserved HTML attribute)',
          '- `description` — hover-card body text',
          '- `label` — custom chip label (ignored when the parent `<kc-sources>` has `numbered`)',
          '- `show-favicon` — bare boolean attribute to show the domain favicon',
          '',
          '`<kc-sources>` attribute reference:',
          '- `numbered` — auto-labels all chips with their 1-based index from the merged list',
          '- `show-favicon` — enables favicons for all children (per-item attribute overrides)',
          '',
          '**When to choose composition:** great for static/authored citations in plain HTML or any template language — no JS wiring needed beyond the element registration.',
        ].join('\n'),
      },
    },
  },
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      // The `numbered` attribute is a boolean — set it imperatively so it is
      // registered after the element upgrades (avoids timing issues in SSR/Storybook).
      el?.setAttribute('numbered', '');
    });
    return (
      <div class="flex flex-col gap-6 p-4 w-full max-w-2xl bg-background rounded-xl shadow-lg">
        <div>
          <p class="text-sm text-muted-foreground mb-1">
            Composition: <code>&lt;kc-sources numbered&gt;</code> with <code>&lt;kc-source&gt;</code> children — chips auto-labelled 1, 2, 3, 4:
          </p>
          <kc-sources ref={(e: HTMLElement) => (el = e)} style={{ display: 'block' }}>
            <kc-source
              href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/"
              headline="WebAssembly cut Figma's load time by 3x"
              description="How Figma leveraged WebAssembly to dramatically improve their browser-based design tool performance."
            />
            <kc-source
              href="https://web.dev/case-studies/earth-webassembly"
              headline="Google Earth and WebAssembly - web.dev"
              description="Case study on porting Google Earth's C++ rendering engine to WebAssembly for browser delivery."
            />
            <kc-source
              href="https://shopify.engineering/shopify-webassembly"
              headline="How Shopify Uses WebAssembly"
              description="Shopify's journey using WebAssembly for Liquid template parsing in their online store editor."
            />
            <kc-source
              href="https://surma.dev/things/js-to-asc/"
              headline="JavaScript to AssemblyScript - Surma.dev"
              description="Detailed performance comparison of JS vs AssemblyScript/Wasm for various workloads."
            />
          </kc-sources>
        </div>

        <div>
          <p class="text-sm text-muted-foreground mb-1">
            Composition without numbering — chips fall back to domain labels:
          </p>
          <kc-sources style={{ display: 'block' }}>
            <kc-source
              href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/"
              headline="WebAssembly cut Figma's load time by 3x"
              description="How Figma leveraged WebAssembly to dramatically improve their browser-based design tool performance."
            />
            <kc-source
              href="https://web.dev/case-studies/earth-webassembly"
              headline="Google Earth and WebAssembly - web.dev"
              description="Case study on porting Google Earth's C++ rendering engine to WebAssembly for browser delivery."
            />
            <kc-source
              href="https://shopify.engineering/shopify-webassembly"
              headline="How Shopify Uses WebAssembly"
              description="Shopify's journey using WebAssembly for Liquid template parsing in their online store editor."
            />
          </kc-sources>
        </div>

        <div>
          <p class="text-sm text-muted-foreground mb-1">
            Composition with favicons and custom labels (no <code>numbered</code>):
          </p>
          <kc-sources style={{ display: 'block' }}>
            <kc-source
              href="https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/"
              label="Figma"
              headline="WebAssembly cut Figma's load time by 3x"
              description="How Figma leveraged WebAssembly to dramatically improve their browser-based design tool performance."
              show-favicon
            />
            <kc-source
              href="https://web.dev/case-studies/earth-webassembly"
              label="web.dev"
              headline="Google Earth and WebAssembly"
              description="Case study on porting Google Earth's C++ rendering engine to WebAssembly for browser delivery."
              show-favicon
            />
            <kc-source
              href="https://shopify.engineering/shopify-webassembly"
              label="Shopify"
              headline="How Shopify Uses WebAssembly"
              description="Shopify's journey using WebAssembly for Liquid template parsing in their online store editor."
              show-favicon
            />
          </kc-sources>
        </div>
      </div>
    );
  },
};
