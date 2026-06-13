import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-voice-input': JSX.HTMLAttributes<HTMLElement> & {
        disabled?: boolean | string;
      };
    }
  }
}

/** Render `<kitn-voice-input>` with a stub `transcribe` function-property. */
function VoiceElement(props: { disabled?: boolean }) {
  let el: (HTMLElement & { transcribe?: (audio: Blob) => Promise<string> }) | undefined;
  onMount(() => {
    if (!el) return;
    // transcribe MUST be set as a JS property — a value-returning callback
    // can't be modelled as an attribute.
    el.transcribe = async () => {
      await new Promise((r) => setTimeout(r, 400));
      return 'transcribed text';
    };
    el.addEventListener('transcription', (e) => {
      const ev = e as CustomEvent<{ text: string }>;
      console.log('transcription', ev.detail.text);
    });
  });
  return (
    <kitn-voice-input
      ref={(e) => (el = e as HTMLElement)}
      disabled={props.disabled ? true : undefined}
      style={{ display: 'inline-block', padding: '40px' }}
    />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-voice-input id="voice"></kitn-voice-input>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const voice = document.getElementById('voice');
  // transcribe is a FUNCTION property — your async transcriber
  voice.transcribe = async (blob) => {
    const text = await myTranscriptionApi(blob);
    return text;
  };
  voice.addEventListener('transcription', (e) => console.log(e.detail.text));
</script>`;

const meta = {
  title: 'Web Components/kitn-voice-input',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-voice-input>` is the framework-agnostic **web component** for a mic button that records and transcribes audio — isolated in **Shadow DOM**. It is the canonical **function-property** element.',
          '**When to use:** adding voice dictation to an input in a non-Solid app. In SolidJS, use the `VoiceInput` primitive.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, then set the `transcribe` **function property** (`el.transcribe = async blob => '...'`) — a value-returning callback can't be modelled as an event. It also emits `audiocaptured` (raw blob) and `transcription` (text) **CustomEvents**.",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A working mic button wired to a stub transcriber. */
export const Default: Story = {
  render: () => <VoiceElement />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** A disabled mic button (non-interactive). */
export const Disabled: Story = {
  render: () => <VoiceElement disabled />,
};
