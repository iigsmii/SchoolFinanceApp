import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Check } from 'lucide-react';
import { normalizePersianCleanText } from '../utils/persianInput';

interface PersianVoiceTypingButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  showQuickChars?: boolean;
}

// Augment window for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export const PersianVoiceTypingButton: React.FC<PersianVoiceTypingButtonProps> = ({
  onTranscript,
  className = '',
  size = 'sm',
  showQuickChars = true,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [recentInserted, setRecentInserted] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'fa-IR';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        if (!event.results) return;
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0]?.transcript || '';
        const cleanText = normalizePersianCleanText(transcript);
        if (cleanText) {
          onTranscript(cleanText);
        }
      };

      recognition.onerror = (event: any) => {
        // Handle common speech errors gracefully without crashing
        if (event.error !== 'no-speech') {
          console.debug('Speech recognition error:', event.error);
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.debug('Failed to initialize speech recognition:', e);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.debug('Could not start recognition:', err);
        setIsListening(false);
      }
    }
  };

  const insertQuickText = (text: string, label: string) => {
    onTranscript(text);
    setRecentInserted(label);
    setTimeout(() => setRecentInserted(null), 1200);
  };

  const isSmall = size === 'sm';

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* Voice Recognition Button */}
      {isSupported ? (
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? 'در حال شنیدن گفتار شما... کلیک برای توقف' : 'تایپ صوتی دقیق فارسی (گفتار به نوشتار)'}
          className={`inline-flex items-center gap-1.5 transition-all select-none font-bold rounded-xl border ${
            isSmall ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'
          } ${
            isListening
              ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-400/30 animate-pulse'
              : 'bg-white hover:bg-purple-50 text-purple-900 border-purple-200 hover:border-purple-300 shadow-2xs'
          }`}
        >
          {isListening ? (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
              <Mic className={isSmall ? 'w-3.5 h-3.5 text-rose-600' : 'w-4 h-4 text-rose-600'} />
              <span>شنیدن فعال...</span>
            </>
          ) : (
            <>
              <Mic className={isSmall ? 'w-3.5 h-3.5 text-purple-700' : 'w-4 h-4 text-purple-700'} />
              <span>تایپ صوتی</span>
            </>
          )}
        </button>
      ) : null}

      {/* Quick Persian Typing Helper Buttons (ZWNJ, Punctuation) */}
      {showQuickChars && (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertQuickText('\u200c', 'نیم‌فاصله')}
            title="درج نیم‌فاصله فارسی (Shift + Space)"
            className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-purple-50 active:bg-purple-100 text-[#341648] border border-gray-200 text-[10px] font-semibold transition-colors"
          >
            نیم‌فاصله
          </button>

          <button
            type="button"
            onClick={() => insertQuickText(' ریال', 'ریال')}
            title="درج پسوند ریال"
            className="px-1.5 py-0.5 rounded-lg bg-gray-100 hover:bg-purple-50 text-gray-700 border border-gray-200 text-[10px] font-semibold transition-colors"
          >
            ریال
          </button>

          {recentInserted && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 animate-in fade-in">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>{recentInserted} درج شد</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
