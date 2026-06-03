import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { createSignal, For, Show } from "solid-js";
import { SlashCommand, type SlashCommandItem } from "./slash-command";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from "./prompt-input";
import { Button } from "../ui/button";
import { ChatConfig } from "../primitives/chat-config";
import { ArrowUp } from "lucide-solid";

const meta: Meta = {
  title: "Components/SlashCommand",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj;

const skillCommands: SlashCommandItem[] = [
  { id: "caveman", label: "Caveman", description: "Ultra-compressed terse responses", category: "Skills" },
  { id: "detailed", label: "Detailed", description: "Thorough, comprehensive responses", category: "Skills" },
  { id: "eli5", label: "ELI5", description: "Explain simply, avoid jargon", category: "Skills" },
  { id: "socratic", label: "Socratic", description: "Ask guiding questions", category: "Skills" },
  { id: "concise", label: "Concise", description: "Short, direct answers", category: "Skills" },
];

/**
 * Default (compact) — title and description on one line.
 * Type `/` to see the popup.
 */
export const Compact: Story = {
  render: () => {
    const [value, setValue] = createSignal("");
    const [selected, setSelected] = createSignal<string[]>([]);

    function handleSelect(cmd: SlashCommandItem) {
      setSelected((prev) =>
        prev.includes(cmd.id)
          ? prev.filter((id) => id !== cmd.id)
          : [...prev, cmd.id],
      );
    }

    return (
      <ChatConfig proseSize="sm">
        <div style={{ width: "420px" }} class="bg-card rounded-lg p-4">
          <Show when={selected().length > 0}>
            <div class="flex gap-1 flex-wrap mb-3">
              <For each={selected()}>
                {(id) => {
                  const cmd = skillCommands.find((c) => c.id === id);
                  return (
                    <button
                      onClick={() => handleSelect(cmd!)}
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-violet-400/10 text-violet-400 hover:bg-violet-400/20 cursor-pointer transition-colors"
                    >
                      {cmd?.label}
                      <span class="text-[10px]">✕</span>
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>

          <div class="relative">
            <PromptInput
              value={value()}
              onValueChange={setValue}
              onSubmit={() => setValue("")}
            >
              <PromptInputTextarea
                placeholder="Type / for commands..."
                class="min-h-[36px] pt-2 pl-3"
              />
              <PromptInputActions class="mt-0.5 flex w-full items-center justify-between gap-2 px-2 pb-1.5">
                <span class="text-xs text-muted-foreground/40">
                  Type / for skills
                </span>
                <Button
                  size="icon-sm"
                  class="rounded-full"
                  disabled={!value().trim() || value().startsWith("/")}
                >
                  <ArrowUp class="size-4" />
                </Button>
              </PromptInputActions>
              <SlashCommand commands={skillCommands} activeIds={selected()} onSelect={handleSelect} />
            </PromptInput>
          </div>

          <p class="text-xs text-muted-foreground/40 mt-2 text-center">
            Type <code class="bg-muted px-1 rounded">/</code> to see commands.
            Arrow keys + Tab/Enter to select.
          </p>
        </div>
      </ChatConfig>
    );
  },
};

/**
 * Expanded mode — title and description on separate lines.
 */
export const Expanded: Story = {
  render: () => {
    const [value, setValue] = createSignal("/");

    return (
      <ChatConfig proseSize="sm">
        <div style={{ width: "420px" }} class="bg-card rounded-lg p-4">
          <div class="relative">
            <PromptInput
              value={value()}
              onValueChange={setValue}
              onSubmit={() => setValue("")}
            >
              <PromptInputTextarea
                placeholder="Type / for commands..."
                class="min-h-[36px] pt-2 pl-3"
              />
              <SlashCommand
                commands={skillCommands}
                compact={false}
                onSelect={(cmd) => setValue("")}
              />
            </PromptInput>
          </div>
        </div>
      </ChatConfig>
    );
  },
};

const mixedCommands: SlashCommandItem[] = [
  ...skillCommands,
  { id: "clear", label: "Clear", description: "Clear conversation history", category: "Actions" },
  { id: "export", label: "Export", description: "Export conversation as markdown", category: "Actions" },
];

/**
 * Commands grouped by category (Skills + Actions).
 */
export const WithCategories: Story = {
  render: () => {
    const [value, setValue] = createSignal("/");

    return (
      <ChatConfig proseSize="sm">
        <div style={{ width: "420px" }} class="bg-card rounded-lg p-4">
          <div class="relative">
            <PromptInput
              value={value()}
              onValueChange={setValue}
              onSubmit={() => setValue("")}
            >
              <PromptInputTextarea
                placeholder="Type / for commands..."
                class="min-h-[36px] pt-2 pl-3"
              />
              <SlashCommand
                commands={mixedCommands}
                onSelect={(cmd) => {
                  setValue("");
                  alert(`Selected: ${cmd.label}`);
                }}
              />
            </PromptInput>
          </div>
        </div>
      </ChatConfig>
    );
  },
};
