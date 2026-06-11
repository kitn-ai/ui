import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import {
  ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageAvatar, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  Source, SourceTrigger, SourceContent, SourceList,
  Button, Separator,
} from '../index';
import { Copy, ThumbsUp, ThumbsDown, ArrowUp } from 'lucide-solid';

const meta: Meta = {
  title: 'Examples/Conversation with Sources',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
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
                <Button variant="ghost" size="icon-sm"><Copy class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm"><ThumbsUp class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm"><ThumbsDown class="size-3.5" /></Button>
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
                <Button variant="ghost" size="icon-sm"><Copy class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm"><ThumbsUp class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm"><ThumbsDown class="size-3.5" /></Button>
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
            <Button variant="default" size="icon-sm" class="rounded-full">
              <ArrowUp class="size-4" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  ),
};
