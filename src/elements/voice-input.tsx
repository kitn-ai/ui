import { defineKitnElement } from './define';
import { VoiceInput } from '../components/voice-input';

interface Props extends Record<string, unknown> {
  /**
   * Transcriber the host supplies — records audio, returns the text. This is a
   * **function-valued property** (`el.transcribe = async blob => '...'`) because
   * a value-returning callback can't be modelled as a fire-and-forget event.
   */
  transcribe?: (audio: Blob) => Promise<string>;
  /** Disable the mic button (non-interactive). */
  disabled?: boolean;
}

/** Events fired by `<kitn-voice-input>`. */
interface Events {
  /** Raw audio captured (before transcription) — for hosts that prefer to
   *  handle transcription themselves instead of via the `transcribe` property. */
  audiocaptured: { blob: Blob };
  /** Transcription completed (the `transcribe` property resolved). */
  transcription: { text: string };
}

/**
 * `<kitn-voice-input>` — a mic button that records and transcribes. The
 * canonical **function-property** element: set `el.transcribe` to your async
 * transcriber. Also emits `audiocaptured` (raw blob) and `transcription` (text).
 */
defineKitnElement<Props, Events>('kitn-voice-input', {
  transcribe: undefined,
  disabled: false,
}, (props, { dispatch, flag }) => (
  <VoiceInput
    disabled={flag('disabled')}
    onTranscribe={async (blob) => {
      dispatch('audiocaptured', { blob });
      return props.transcribe ? props.transcribe(blob) : '';
    }}
    onTranscription={(text) => dispatch('transcription', { text })}
  />
));
