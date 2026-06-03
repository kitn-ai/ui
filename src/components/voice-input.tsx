import { splitProps, Show, For, createSignal } from 'solid-js';
import { cn } from '../utils/cn';
import { Button } from '../ui/button';
import { Tooltip } from '../ui/tooltip';
import { useVoiceRecorder } from '../primitives/use-voice-recorder';

export interface VoiceInputProps {
  onTranscribe: (audio: Blob) => Promise<string>;
  onTranscription: (text: string) => void;
  disabled?: boolean;
  class?: string;
}

export function VoiceInput(props: VoiceInputProps) {
  const [local] = splitProps(props, ['onTranscribe', 'onTranscription', 'disabled', 'class']);
  const { isRecording, start, stop } = useVoiceRecorder();
  const [isProcessing, setIsProcessing] = createSignal(false);

  async function handleClick() {
    if (isRecording()) {
      stop();
    } else {
      try {
        const blob = await start();
        setIsProcessing(true);
        try {
          const text = await local.onTranscribe(blob);
          if (text.trim()) local.onTranscription(text.trim());
        } finally {
          setIsProcessing(false);
        }
      } catch {
        setIsProcessing(false);
      }
    }
  }

  // Mic icon (not recording)
  const MicIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );

  // Square stop icon (recording)
  const StopIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );

  // Spinner (processing transcription)
  const Spinner = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );

  return (
    <div class={cn('relative inline-flex items-center justify-center', local.class)}>
      {/* Animated pulse rings when recording */}
      <Show when={isRecording()}>
        <For each={[0, 1, 2]}>
          {(index) => (
            <div
              class="absolute inset-0 animate-ping rounded-full border-2 border-red-400/30"
              style={{
                "animation-delay": `${index * 0.3}s`,
                "animation-duration": "2s",
              }}
            />
          )}
        </For>
      </Show>

      <Tooltip content={isProcessing() ? 'Transcribing...' : isRecording() ? 'Stop recording' : 'Voice input'}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleClick}
          disabled={local.disabled || isProcessing()}
          class={cn(
            'relative z-10 rounded-full transition-all duration-300',
            isRecording() && 'bg-destructive text-white hover:bg-destructive/80',
          )}
        >
          <Show when={isProcessing()}>
            <Spinner />
          </Show>
          <Show when={!isProcessing() && isRecording()}>
            <StopIcon />
          </Show>
          <Show when={!isProcessing() && !isRecording()}>
            <MicIcon />
          </Show>
        </Button>
      </Tooltip>
    </div>
  );
}
