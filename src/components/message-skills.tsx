import { Show, For, type JSX, splitProps } from "solid-js";
import { cn } from "../utils/cn";

// --- MessageSkills ---

export interface Skill {
  id: string;
  name: string;
}

export interface MessageSkillsProps {
  skills: Skill[];
  class?: string;
}

/**
 * Displays skill badges above a message to indicate which skills
 * were active when the message was generated.
 */
function MessageSkills(props: MessageSkillsProps) {
  return (
    <Show when={props.skills.length > 0}>
      <div class={cn("flex items-center gap-1 flex-wrap", props.class)}>
        <For each={props.skills}>
          {(skill) => (
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-400/10 text-violet-400">
              {skill.name}
            </span>
          )}
        </For>
      </div>
    </Show>
  );
}

export { MessageSkills };
