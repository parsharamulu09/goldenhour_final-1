import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceInputState = {
  isListening: boolean;
  interimTranscript: string;
  error: string | null;
  supported: boolean;
  startListening: () => void;
  stopListening: () => void;
};

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Web Speech API (SpeechRecognition) — single session, interim results, Chrome/Edge friendly.
 */
export function useVoiceInput(
  onFinalTranscript: (text: string) => void,
  onError?: (message: string) => void
): VoiceInputState {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognition | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const Ctor = getRecognitionCtor();
  const supported = Ctor !== null;

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    recRef.current = null;
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    if (!Ctor) {
      const msg = 'Speech recognition is not supported in this browser.';
      setError(msg);
      onErrorRef.current?.(msg);
      return;
    }

    stopListening();

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let finalText = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const t = r[0]?.transcript ?? '';
        if (r.isFinal) finalText += t;
      }
      setInterimTranscript(finalText);
      if (finalText.trim()) {
        onFinalRef.current(finalText.trim());
        stopListening();
      }
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      const msg =
        ev.error === 'no-speech'
          ? 'No speech detected. Try again.'
          : ev.error === 'not-allowed'
            ? 'Microphone permission denied.'
            : ev.error === 'audio-capture'
              ? 'No microphone found.'
              : `Recognition error: ${ev.error}`;
      setError(msg);
      onErrorRef.current?.(msg);
      stopListening();
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      const msg = 'Could not start microphone.';
      setError(msg);
      onErrorRef.current?.(msg);
      setIsListening(false);
    }
  }, [Ctor, stopListening]);

  useEffect(() => () => stopListening(), [stopListening]);

  return {
    isListening,
    interimTranscript,
    error,
    supported,
    startListening,
    stopListening,
  };
}
