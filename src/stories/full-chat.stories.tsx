import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { ChatScene } from "./chat-scene";

const meta: Meta = {
  title: "Examples/Full Chat App",
  parameters: {
    // Render inline in docs so the embedded example inherits the dark-mode
    // class (a non-inline iframe would stay light). Bounded to a sensible height.
    docs: { story: { inline: true, height: "640px" } },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <ChatScene />,
};
