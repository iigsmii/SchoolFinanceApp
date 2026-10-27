import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { toLatinDigits } from '../utils/persianInput';

interface PersianSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  buttonLabel?: string;
  accentColor?: string;
}

export const PersianSearchInput: React.FC<PersianSearchInputProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'جستجو...',
  className = '',
  autoFocus = false,
  buttonLabel = 'جستجو',
  accentColor = '#62205f',
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);

  // Sync internal value when external prop changes (e.g. cleared externally)
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const commitValue = (val: string) => {
    setInternalValue(val);
    onChange(val);
    if (onSearch) {
      onSearch(val);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalValue(val);
    // Always trigger live search update
    onChange(val);
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    // Native onInput ensures Android Gboard virtual keyboard events are caught
    const val = (e.target as HTMLInputElement).value;
    if (val !== internalValue) {
      setInternalValue(val);
      onChange(val);
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    const val = e.currentTarget.value;
    commitValue(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const current = inputRef.current?.value ?? internalValue;
      commitValue(current);
      inputRef.current?.blur();
    }
  };

  const handleExplicitSearchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Read directly from DOM to capture any uncommitted Persian IME buffer
    const domVal = inputRef.current ? inputRef.current.value : internalValue;
    commitValue(domVal);
  };

  const handleClear = () => {
    commitValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={internalValue}
          onChange={handleChange}
          onInput={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          className="w-full pl-9 pr-10 py-2.5 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-xs sm:text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f] focus:ring-1 focus:ring-[#62205f]/20 transition-all shadow-2xs"
        />

        {/* Search Icon */}
        <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

        {/* Clear Button (X) */}
        {internalValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 active:scale-90 transition-all"
            title="پاک کردن متن جستجو"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dedicated Search Action Button Requested by User */}
      <button
        type="button"
        onClick={handleExplicitSearchClick}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-sm hover:opacity-95 active:scale-95 transition-all shrink-0 cursor-pointer select-none"
        style={{ backgroundColor: accentColor }}
        title="اجرای جستجو"
      >
        <Search className="w-4 h-4" />
        <span>{buttonLabel}</span>
      </button>
    </div>
  );
};
