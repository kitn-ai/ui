import { createSignal, onCleanup } from 'solid-js';

export interface UseVoiceRecorderOptions {
  mimeType?: string;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}) {
  const mimeType = options.mimeType ?? 'audio/webm;codecs=opus';
  const [isRecording, setIsRecording] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  let mediaRecorder: MediaRecorder | undefined;
  let chunks: Blob[] = [];
  let resolveBlob: ((blob: Blob) => void) | undefined;

  async function start(): Promise<Blob> {
    setError(null);
    chunks = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        resolveBlob?.(blob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      return new Promise<Blob>((resolve) => { resolveBlob = resolve; });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
      setIsRecording(false);
      throw err;
    }
  }

  function stop() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  }

  onCleanup(() => stop());

  return { isRecording, error, start, stop };
}
