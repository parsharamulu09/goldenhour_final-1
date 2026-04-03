import React from 'react';
import { Loader2, MicOff } from 'lucide-react';

export interface GlobalVoiceAssistantBarProps {
  supported: boolean;
  isListening: boolean;
  interimTranscript: string;
  error: string | null;
  onStart: () => void;
}

/**
 * Single global mic control for the Hospital Clinical Update section.
 */
const GlobalVoiceAssistantBar: React.FC<GlobalVoiceAssistantBarProps> = ({
  supported,
  isListening,
  interimTranscript,
  error,
  onStart,
}) => {
  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-slate-50 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          title={isListening ? 'Listening…' : 'Speak clinical update'}
          disabled={!supported || isListening}
          onClick={onStart}
          className={`shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl border-2 flex items-center justify-center text-2xl transition-all ${
            isListening
              ? 'border-red-500 bg-red-50 text-red-600 shadow-lg shadow-red-500/25 animate-pulse cursor-wait'
              : 'border-blue-300 bg-white text-slate-700 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
          aria-pressed={isListening}
        >
          {isListening ? <Loader2 className="w-7 h-7 animate-spin" aria-hidden /> : <span aria-hidden>🎤</span>}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-800">Voice clinical update</p>
          <p className="text-xs font-bold text-slate-600 mt-0.5">
            {isListening ? (
              <span className="text-red-600">Listening… speak one clear sentence.</span>
            ) : (
              'Tap the mic, then describe vitals, symptoms, injuries, and treatment in one go.'
            )}
          </p>
          {interimTranscript && isListening && (
            <p className="text-[11px] text-blue-700 font-semibold mt-2 truncate italic border-l-2 border-blue-400 pl-2">
              {interimTranscript}
            </p>
          )}
          {error && !isListening && (
            <p className="text-[11px] text-amber-700 font-bold mt-2 flex items-center gap-1.5">
              <MicOff className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalVoiceAssistantBar;
