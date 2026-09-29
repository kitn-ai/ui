import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Button } from '../button/button';
import { DefaultPromptInput } from './default-input';

// The send button, on its own, because its shape is a decision a host makes and the kit's
// other stories used to answer it wrongly: ten hand-composed
// `<Button variant="default" size="sm">Send</Button>` squares, which is `rounded-md`, inside
// a frame whose radius is 24px. That is the shape a reader copied, and the shape that reads
// wrong in both layouts — so the three cases below sit side by side and each says what it is.
//
// THE FIRST CASE RENDERS THE COMPONENT rather than re-drawing it. A story that copies the
// markup it documents is a copy that can drift, and this file exists because the kit's
// stories had already drifted from the component once.
//
// What the default IS, and why: `DefaultPromptInput` sends with `size="icon-sm"` (28px, the
// same as every other control in the row) at `rounded-full`. The shared size is what makes it
// read as belonging to the frame. The glyph is an up arrow because that is where the
// references landed, not because anything pins it there.

const meta = {
  title: 'Components/PromptInput/SendButton',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The composer submits through a round icon-only button. The default is a 28px circle ' +
          'carrying an up arrow, and because every part of it is public a host can equally ' +
          'submit through a labelled square or through a circle with a different glyph.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default: what the component renders, not a re-drawing of it. */
export const TheDefault: Story = {
  render: () => (
    <div style={{ width: '640px' }}>
      <DefaultPromptInput
        value=""
        placeholder="Ask anything..."
        onValueChange={() => {}}
        onSubmit={() => {}}
        onSuggestionClick={() => {}}
      />
    </div>
  ),
  parameters: {
    docs: {
      source: {
        language: 'html',
        code: `<!-- the send button is part of the composer; nothing to configure -->
<kai-prompt-input id="input"></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/web-components';
  document.getElementById('input').placeholder = 'Ask anything...';
</script>`,
      },
    },
  },
};

/** A labelled square, which is the other legitimate answer: a host who wants words on the
 *  button builds one from public parts and puts it in the actions row. */
export const LabelledSquare: Story = {
  render: () => <Button variant="default" size="sm">Send</Button>,
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import { Button } from '@kitn.ai/ui';

<Button variant="default" size="sm">Send</Button>`,
      },
    },
  },
};

/** A circle with a different glyph. The up arrow is where the references landed; the icon is
 *  the host's, so a submit that means "return" can say so. */
export const DifferentGlyph: Story = {
  render: () => (
    <Button size="icon-sm" class="rounded-full" aria-label="Send and return">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 10 4 15 9 20" />
        <path d="M20 4v7a4 4 0 0 1-4 4H4" />
      </svg>
    </Button>
  ),
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import { Button } from '@kitn.ai/ui';

<Button size="icon-sm" class="rounded-full" aria-label="Send and return">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="9 10 4 15 9 20" />
    <path d="M20 4v7a4 4 0 0 1-4 4H4" />
  </svg>
</Button>`,
      },
    },
  },
};
