import { defineWebComponent } from '../define/define';
import { VoiceInput, type VoiceInputController } from '../../components/voice/voice-input';

interface Props extends Record<string, unknown> {
  //
  // Registers the tail of the chain, and the type is a function-valued property
  // (`el.transcribe = async blob => '...'`) because a value-returning callback can't be
  // modelled as a fire-and-forget event.
  /** Transcriber the host supplies: records audio, returns the text. **Function-valued property.** */
  transcribe?: (audio: Blob) => Promise<string>;
  /** Disable the mic button (non-interactive). */
  disabled?: boolean;
  // Attribute: `recognition-lang` -- the plain `lang` attribute is reserved by
  // `HTMLElement` and can't be a custom-element property. No effect when `transcribe` is
  // set or the browser lacks SpeechRecognition.
  /** BCP-47 language tag for the native `SpeechRecognition` path (e.g. `en-US`). Attribute: `recognition-lang`. */
  recognitionLang?: string;
  /** Emit live partial transcripts (`kai-transcript-interim`) during native
   *  recognition. Attribute: `interim`. No-op on the transcribe/fallback paths. */
  interim?: boolean;
}

/** Events fired by `<kai-voice-input>`. */
interface Events {
  // For hosts that prefer to handle transcription themselves instead of via the
  // `transcribe` property. Also the unsupported-fallback signal: no `transcribe`, no
  // SpeechRecognition, so only the blob is produced (no text).
  /** Raw audio captured, before transcription. */
  'kai-audio-captured': { blob: Blob };
  /** Final transcript: the `transcribe` property resolved, OR native
   *  `SpeechRecognition` produced final text (no `transcribe` set). */
  'kai-transcription': { text: string };
  /** Live partial transcript during native recognition (only when `interim` is
   *  set). Fires repeatedly before the final `kai-transcription`. */
  'kai-transcript-interim': { text: string };
  // Lets the host drive its own UI (waveform, push-to-talk indicator) in sync with the
  // mic. Fires on real transitions only (manual click and programmatic start()/stop()),
  // never on mount.
  /** Recording started or stopped. */
  'kai-recording-change': { recording: boolean };
  // `detail.source` names the failing side (`recognition` on `<kai-voice-input>`,
  // `synthesis` on `<kai-voice-output>`), `detail.error` carries the platform error code,
  // the thrown exception's name, or `no-result` when recognition ended with no error and
  // no text (the user said nothing), and `detail.message` is human-readable. Deliberate
  // cancellation does not fire.
  /** A voice session failed, so no failure is ever silent. `detail.error` is the platform error code or the thrown name. */
  'kai-voice-error': { source: 'recognition'; error: string; message: string };
}
// With no `transcribe` property it uses the browser's `SpeechRecognition`: Chrome and Safari, none
// in Firefox, and cloud-based in Chrome. Where neither path is available it records the blob and
// emits `kai-audio-captured` with no text, so an unsupported browser degrades to capture rather
// than to silence.
/**
 * A microphone button that records and transcribes speech.
 */
defineWebComponent<Props, Events>('kai-voice-input', {
  transcribe: undefined,
  disabled: false,
  recognitionLang: undefined,
  interim: false,
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
      hasTranscribe={typeof props.transcribe === 'function'}
      lang={props.recognitionLang}
      interim={flag('interim')}
      onTranscribe={async (blob) => {
        dispatch('kai-audio-captured', { blob });
        return props.transcribe ? props.transcribe(blob) : '';
      }}
      onTranscription={(text) => dispatch('kai-transcription', { text })}
      onInterim={(text) => dispatch('kai-transcript-interim', { text })}
      onRecordingChange={(recording) => dispatch('kai-recording-change', { recording })}
      onError={(detail) => dispatch('kai-voice-error', detail)}
      controllerRef={(c) => (controller = c)}
    />
  );
});
