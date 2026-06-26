import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { VoiceInput } from './voice-input';
import { componentDescription } from '../stories/docs/element-controls';

/** Sample transcription handler — resolves the recorded audio to text. */
const transcribe = async (_audio: Blob): Promise<string> => {
  await new Promise((r) => setTimeout(r, 1200));
  return 'Hello from the microphone';
};

const meta = {
  title: 'Components/Elements/VoiceInput',
  component: VoiceInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A microphone button that records audio, shows recording (pulse rings) and processing (spinner) states, then hands the audio off for transcription.',
        '**When to use:** to let users dictate input by voice instead of typing — speech-to-text for the prompt field.',
        '**How to use:** provide `onTranscribe(audio)` returning a `Promise<string>` (your STT call) and `onTranscription(text)` to receive the result. Click toggles recording; transcription runs automatically on stop. Set `disabled` to block input.',
        '**Placement:** inside the prompt input action bar, next to send and other input actions.',
      ]),
    },
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disables the button (also disabled while transcribing).',
      table: { defaultValue: { summary: 'false' } },
    },
    class: {
      control: 'text',
      description: 'Additional CSS classes for the container.',
    },
    onTranscribe: {
      action: 'transcribe',
      description: 'Receives the recorded audio `Blob` and must resolve to the transcribed text.',
      table: { category: 'Events' },
    },
    onTranscription: {
      action: 'transcription',
      description: 'Called with the final transcribed text (trimmed, non-empty).',
      table: { category: 'Events' },
    },
    onRecordingChange: {
      action: 'recordingChange',
      description: 'Fired with `true` when recording starts and `false` when it stops.',
      table: { category: 'Events' },
    },
  },
  args: {
    disabled: false,
    onTranscribe: transcribe,
    onTranscription: fn(),
    onRecordingChange: fn(),
  },
  render: (args) => <VoiceInput {...args} />,
} satisfies Meta<typeof VoiceInput>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { VoiceInput } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — click the mic to record (requires mic permission). */
export const Playground: Story = {
  ...src(`<VoiceInput
  onTranscribe={async (audio) => {
    const res = await transcribeAudio(audio); // your STT call
    return res.text;
  }}
  onTranscription={(text) => setInput((v) => v + text)}
/>`),
};

export const Disabled: Story = {
  args: { disabled: true },
  ...src(`<VoiceInput
  disabled
  onTranscribe={transcribe}
  onTranscription={(text) => setInput(text)}
/>`),
};
