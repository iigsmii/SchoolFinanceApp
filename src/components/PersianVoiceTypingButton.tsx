import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { normalizePersianCleanText } from '../utils/persianInput';

interface PersianVoiceTypingButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md';
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
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'fa-IR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        if (event.results && event.results.length > 0) {
          const rawTranscript = event.results[0][0].transcript;
          const cleanText = normalizePersianCleanText(rawTranscript);
          if (cleanText) {
            onTranscript(cleanText);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.debug('Speech recognition error:', event.error);
        setIsListening(false);
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
          recognitionRef.current.stop();
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

  if (!isSupported) {
    return null;
  }

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={isListening ? 'در حال شنیدن... برای توقف کلیک کنید' : 'تایپ صوتی فارسی (گفتار به نوشتار)'}
      className={`inline-flex items-center gap-1.5 transition-all select-none ${
        isSmall ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      } rounded-lg border font-semibold ${
        isListening
          ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse shadow-xs'
          : 'bg-white hover:bg-purple-50 text-purple-800 border-purple-200 shadow-2xs'
      } ${className}`}
    >
      {isListening ? (
        <>
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
          <Mic className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <span>در حال شنیدن...</span>
        </>
      ) : (
        <>
          <Mic className={isSmall ? 'w-3.5 h-3.5 text-purple-700' : 'w-4 h-4 text-purple-700'} />
          <span>تایپ صوتی</span>
        </>
      )}
    </button>
  );
};
