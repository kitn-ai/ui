import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { createSignal } from "solid-js";
import { SlashCommand, type SlashCommandItem } from "./slash-command";
import { PromptInput, PromptInputTextarea } from "./prompt-input";
import { ChatConfig } from "../primitives/chat-config";

const skillCommands: SlashCommandItem[] = [
  { id: "caveman", label: "Caveman", description: "Ultra-compressed terse responses", category: "Skills" },
  { id: "detailed", label: "Detailed", description: "Thorough, comprehensive responses", category: "Skills" },
  { id: "eli5", label: "ELI5", description: "Explain simply, avoid jargon", category: "Skills" },
  { id: "socratic", label: "Socratic", description: "Ask guiding questions", category: "Skills" },
  { id: "concise", label: "Concise", description: "Short, direct answers", category: "Skills" },
];

const mixedCommands: SlashCommandItem[] = [
  ...skillCommands,
  { id: "clear", label: "Clear", description: "Clear conversation history", category: "Actions" },
  { id: "export", label: "Export", description: "Export conversation as markdown", category: "Actions" },
];

/**
 * `SlashCommand` reads the input value from the enclosing `PromptInput`
 * context, so every story mounts it inside a `PromptInput`. The popup opens
 * when the input starts with `/`.
 */
function SlashDemo(props: { commands: SlashCommandItem[]; activeIds?: string[]; compact?: boolean; onSelect: (cmd: SlashCommandItem) => void }) {
  const [value, setValue] = createSignal("/");
  return (
    <ChatConfig proseSize="sm">
      <div style={{ width: "420px" }} class="bg-card rounded-lg p-4">
        <div class="relative">
          <PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue("")}>
            <PromptInputTextarea placeholder="Type / for commands..." class="min-h-[36px] pt-2 pl-3" />
            <SlashCommand
              commands={props.commands}
              activeIds={props.activeIds}
              compact={props.compact}
              onSelect={(cmd) => {
                props.onSelect(cmd);
                setValue("");
              }}
            />
          </PromptInput>
        </div>
        <p class="text-xs text-muted-foreground/40 mt-2 text-center">
          Type <code class="bg-muted px-1 rounded">/</code> to see commands. Arrow keys + Tab/Enter to select.
        </p>
      </div>
    </ChatConfig>
  );
}

const meta = {
  title: "Components/SlashCommand",
  component: SlashCommand,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "A keyboard-navigable command palette that pops above a `PromptInput` when the user types `/`. Filters and groups commands by category, with arrow-key navigation and Tab/Enter to select.",
          "**When to use:** to offer slash commands or toggleable skills/modes directly from the prompt input as the user types `/name`.",
          "**How to use:** render it as a child of `PromptInput` (it consumes that context). Pass `commands`, handle `onSelect`, and optionally pass `activeIds` to mark active toggles. Set `compact={false}` for two-line rows.",
          "**Placement:** inside the relative-positioned `PromptInput`, absolutely anchored to the top of the textarea.",
        ].join("\n\n"),
      },
      controls: { exclude: ["use:eventListener"] },
    },
  },
  argTypes: {
    commands: {
      control: "object",
      description: "List of selectable commands ({ id, label, description?, category? }).",
    },
    activeIds: {
      control: "object",
      description: "IDs currently marked active — selecting an active command toggles it off.",
    },
    compact: {
      control: "boolean",
      description: "Single-line rows (label + description side by side). When false, two-line rows.",
      table: { defaultValue: { summary: "true" } },
    },
    onSelect: {
      action: "select",
      description: "Fired with the chosen command when an item is selected.",
      table: { category: "Events" },
    },
    class: { control: "text", description: "Additional classes on the popup container." },
  },
  args: {
    commands: skillCommands,
    compact: true,
    activeIds: [],
    onSelect: fn(),
  },
  render: (args) => (
    <SlashDemo commands={args.commands} activeIds={args.activeIds} compact={args.compact} onSelect={args.onSelect} />
  ),
} satisfies Meta<typeof SlashCommand>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { SlashCommand, PromptInput, PromptInputTextarea } from '@kitn-ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — type `/` in the input; tweak `commands`/`compact`/`activeIds`. */
export const Playground: Story = {
  ...src(`<PromptInput value={value()} onValueChange={setValue} onSubmit={() => setValue('')}>
  <PromptInputTextarea placeholder="Type / for commands..." />
  <SlashCommand commands={commands} onSelect={(cmd) => { /* apply */ }} />
</PromptInput>`),
};

/** Compact single-line rows (default). */
export const Compact: Story = {
  args: { compact: true },
  ...src(`<SlashCommand commands={commands} onSelect={handleSelect} />`),
};

/** Two-line rows with label above description. */
export const Expanded: Story = {
  args: { compact: false },
  ...src(`<SlashCommand commands={commands} compact={false} onSelect={handleSelect} />`),
};

/** Commands grouped by category (Skills + Actions). */
export const WithCategories: Story = {
  args: { commands: mixedCommands },
  ...src(`const commands = [
  { id: 'eli5', label: 'ELI5', description: 'Explain simply', category: 'Skills' },
  { id: 'clear', label: 'Clear', description: 'Clear conversation', category: 'Actions' },
];

<SlashCommand commands={commands} onSelect={handleSelect} />`),
};

/** Toggleable skills — active IDs are marked and toggle off when reselected (showcase). */
export const ActiveToggles: Story = {
  render: () => {
    const [selected, setSelected] = createSignal<string[]>(["eli5"]);
    return (
      <SlashDemo
        commands={skillCommands}
        activeIds={selected()}
        onSelect={(cmd) =>
          setSelected((prev) =>
            prev.includes(cmd.id) ? prev.filter((id) => id !== cmd.id) : [...prev, cmd.id],
          )
        }
      />
    );
  },
  ...src(`<SlashCommand
  commands={skillCommands}
  activeIds={selected()}
  onSelect={(cmd) => toggle(cmd.id)}
/>`),
};
