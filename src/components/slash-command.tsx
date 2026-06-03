import { createSignal, createEffect, createMemo, Show, For, on, onCleanup } from "solid-js";
import { cn } from "../utils/cn";
import { usePromptInput } from "./prompt-input";

// --- Types ---

export interface SlashCommandItem {
  id: string;
  label: string;
  description?: string;
  category?: string;
}

export interface SlashCommandProps {
  commands: SlashCommandItem[];
  activeIds?: string[]; // currently active command IDs — selecting again removes
  onSelect: (command: SlashCommandItem) => void;
  compact?: boolean; // single line: label + description side by side (default: true)
  class?: string;
}

// --- Component ---

function SlashCommand(props: SlashCommandProps) {
  const ctx = usePromptInput();
  const [open, setOpen] = createSignal(false);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [query, setQuery] = createSignal("");
  const isCompact = props.compact !== false; // default true
  let listRef: HTMLDivElement | undefined;

  // Detect slash at the start of input
  const slashMatch = createMemo(() => {
    const val = ctx.value();
    const match = val.match(/^\/(\S*)$/);
    return match ? match[1] : null;
  });

  // Filter and sort commands alphabetically
  const filtered = createMemo(() => {
    const q = slashMatch();
    if (q === null) return [];
    const items = q === ""
      ? [...props.commands]
      : props.commands.filter(
          (cmd) =>
            cmd.label.toLowerCase().includes(q.toLowerCase()) ||
            (cmd.description?.toLowerCase().includes(q.toLowerCase()) ?? false),
        );
    return items.sort((a, b) => a.label.localeCompare(b.label));
  });

  // Group by category
  const grouped = createMemo(() => {
    const items = filtered();
    const groups = new Map<string, SlashCommandItem[]>();
    for (const item of items) {
      const cat = item.category ?? "";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    }
    return groups;
  });

  // Flat list for keyboard navigation
  const flatList = createMemo(() => {
    const items: SlashCommandItem[] = [];
    for (const group of grouped().values()) {
      items.push(...group);
    }
    return items;
  });

  // Open/close based on slash detection
  createEffect(
    on(slashMatch, (match) => {
      if (match !== null) {
        setOpen(true);
        setQuery(match);
        setSelectedIndex(0);
      } else {
        setOpen(false);
      }
    }),
  );

  // Keep selected index in bounds
  createEffect(() => {
    const max = flatList().length;
    if (selectedIndex() >= max) setSelectedIndex(Math.max(0, max - 1));
  });

  // Scroll selected item into view
  createEffect(() => {
    const idx = selectedIndex();
    if (!listRef) return;
    const el = listRef.querySelector(`[data-index="${idx}"]`) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  });

  function selectItem(item: SlashCommandItem) {
    ctx.setValue("");
    setOpen(false);
    props.onSelect(item);
    // Refocus textarea
    setTimeout(() => ctx.textareaRef?.focus(), 0);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open()) return;

    const list = flatList();
    if (list.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % list.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + list.length) % list.length);
        break;
      case "Tab":
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        selectItem(list[selectedIndex()]);
        break;
      case "Escape":
        e.preventDefault();
        ctx.setValue("");
        setOpen(false);
        break;
    }
  }

  // Attach keyboard listener to textarea
  createEffect(() => {
    const textarea = ctx.textareaRef;
    if (!textarea) return;

    textarea.addEventListener("keydown", handleKeyDown, true);
    onCleanup(() => textarea.removeEventListener("keydown", handleKeyDown, true));
  });

  let flatIndex = 0;

  return (
    <Show when={open() && flatList().length > 0}>
      <div
        class={cn(
          "absolute bottom-full left-0 right-0 mb-1 z-50 bg-card rounded-lg shadow-lg overflow-hidden",
          props.class,
        )}
      >
        <div ref={listRef} class="max-h-56 overflow-y-auto py-1">
          {(() => {
            flatIndex = 0;
            return null;
          })()}
          <For each={[...grouped().entries()]}>
            {([category, items]) => (
              <>
                <Show when={category}>
                  <div class="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
                    {category}
                  </div>
                </Show>
                <For each={items}>
                  {(item) => {
                    const idx = flatIndex++;
                    const isActive = () => props.activeIds?.includes(item.id) ?? false;
                    return (
                      <button
                        data-index={idx}
                        class={cn(
                          "w-full flex items-center gap-2 px-3 text-left transition-colors",
                          isCompact ? "py-1" : "py-1.5",
                          selectedIndex() === idx
                            ? "bg-muted/50 text-foreground"
                            : "text-foreground/80 hover:bg-muted/30",
                        )}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => selectItem(item)}
                      >
                        <Show when={isCompact} fallback={
                          <div class="flex-1 min-w-0">
                            <div class="text-xs flex items-center gap-1.5">
                              {item.label}
                              <Show when={isActive()}>
                                <span class="text-[10px] text-violet-400">active</span>
                              </Show>
                            </div>
                            <Show when={item.description}>
                              <div class="text-xs text-muted-foreground/50 truncate">
                                {item.description}
                              </div>
                            </Show>
                          </div>
                        }>
                          <Show when={isActive()}>
                            <span class="w-1 h-1 rounded-full bg-violet-400 flex-shrink-0" />
                          </Show>
                          <span class={cn("text-xs flex-shrink-0", isActive() && "text-violet-400")}>{item.label}</span>
                          <Show when={item.description}>
                            <span class="text-xs text-muted-foreground/40 truncate">{item.description}</span>
                          </Show>
                        </Show>
                      </button>
                    );
                  }}
                </For>
              </>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}

export { SlashCommand };
