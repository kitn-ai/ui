import { defineWebComponent } from './define';
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

/** Events fired by `<kai-voice-input>`. */
interface Events {
  /** Raw audio captured (before transcription) — for hosts that prefer to
   *  handle transcription themselves instead of via the `transcribe` property. */
  'kai-audio-captured': { blob: Blob };
  /** Transcription completed (the `transcribe` property resolved). */
  'kai-transcription': { text: string };
}

/**
 * `<kai-voice-input>` — a mic button that records and transcribes. The
 * canonical **function-property** element: set `el.transcribe` to your async
 * transcriber. Also emits `kai-audio-captured` (raw blob) and `kai-transcription` (text).
 */
defineWebComponent<Props, Events>('kai-voice-input', {
  transcribe: undefined,
  disabled: false,
}, (props, { dispatch, flag }) => (
  <VoiceInput
    disabled={flag('disabled')}
    onTranscribe={async (blob) => {
      dispatch('kai-audio-captured', { blob });
      return props.transcribe ? props.transcribe(blob) : '';
    }}
    onTranscription={(text) => dispatch('kai-transcription', { text })}
  />
));
