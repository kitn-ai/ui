import { defineWebComponent } from './define';
import { VoiceInput, type VoiceInputController } from '../components/voice-input';

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
  /** Recording started or stopped — lets the host drive its own UI (waveform,
   *  push-to-talk indicator) in sync with the mic. Fires on real transitions
   *  only (manual click and programmatic start()/stop()), never on mount. */
  'kai-recording-change': { recording: boolean };
}

/**
 * `<kai-voice-input>` — a mic button that records and transcribes. The
 * canonical **function-property** element: set `el.transcribe` to your async
 * transcriber. Also emits `kai-audio-captured` (raw blob) and `kai-transcription` (text).
 */
defineWebComponent<Props, Events>('kai-voice-input', {
  transcribe: undefined,
  disabled: false,
}, (props, { dispatch, flag, expose }) => {
  // Pattern C: the VoiceInput component owns useVoiceRecorder; it hands up a
  // start/stop controller and an onRecordingChange callback. The facade captures
  // the controller and exposes delegating methods (start/stop both run the same
  // record→transcribe path as the mic click, so manual + programmatic emit the
  // same kai-audio-captured/kai-transcription/kai-recording-change events).
  let controller: VoiceInputController | undefined;
  expose({
    /** Begin recording programmatically (e.g. push-to-talk bound to a global
     *  key). Runs the same getUserMedia path as clicking the mic; no-ops if
     *  already recording. */
    start: () => controller?.start(),
    /** Stop the in-progress recording, producing the blob (→ kai-audio-captured)
     *  and running transcription. Pairs with start() for push-to-talk. */
    stop: () => controller?.stop(),
  });

  return (
    <VoiceInput
      disabled={flag('disabled')}
      onTranscribe={async (blob) => {
        dispatch('kai-audio-captured', { blob });
        return props.transcribe ? props.transcribe(blob) : '';
      }}
      onTranscription={(text) => dispatch('kai-transcription', { text })}
      onRecordingChange={(recording) => dispatch('kai-recording-change', { recording })}
      controllerRef={(c) => (controller = c)}
    />
  );
});
