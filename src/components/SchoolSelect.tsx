import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

type SchoolOption = { id: number; name: string; tafsili_code?: string };

interface SchoolSelectProps {
  schools: SchoolOption[];
  value: number | string;
  onChange: (value: number | string) => void;
  className?: string;
  includeAll?: boolean;
  allValue?: number | string;
  allLabel?: string;
  optionLabel?: (school: SchoolOption) => string;
  placeholder?: string;
  disabled?: boolean;
}

export const SchoolSelect: React.FC<SchoolSelectProps> = ({
  schools,
  value,
  onChange,
  className = '',
  includeAll = false,
  allValue = 0,
  allLabel = 'همه مدارس و مراکز',
  optionLabel,
  placeholder = 'جستجوی نام مدرسه یا مرکز...',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const filteredSchools = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fa');
    if (!normalized) return schools;
    return schools.filter((school) => {
      const label = optionLabel ? optionLabel(school) : school.name;
      return `${school.name} ${label} ${school.id}`.toLocaleLowerCase('fa').includes(normalized);
    });
  }, [schools, query, optionLabel]);

  const selectedSchool = schools.find((school) => String(school.id) === String(value));
  const selectedLabel = includeAll && String(value) === String(allValue)
    ? allLabel
    : selectedSchool
      ? (optionLabel ? optionLabel(selectedSchool) : selectedSchool.name)
      : 'انتخاب مدرسه یا مرکز';

  const choose = (nextValue: number | string) => {
    onChange(nextValue);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setOpen((current) => !current); setQuery(''); }}
        className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-[#e5dde8] bg-white px-3 py-2.5 text-right text-xs font-bold text-[#341648] shadow-sm transition hover:border-[#9b78a5] focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown size={15} className={`shrink-0 text-[#80658a] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-[80] mt-2 w-full min-w-[min(19rem,85vw)] overflow-hidden rounded-2xl border border-[#e5dde8] bg-white shadow-xl">
          <div className="border-b border-[#f0eaf2] p-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-[#e5dde8] bg-[#fcfaff] px-3">
              <Search size={15} className="shrink-0 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent py-2.5 text-xs outline-none placeholder:text-gray-400"
              />
            </div>
            <div className="mt-1.5 px-1 text-[10px] text-gray-400">{filteredSchools.length} مرکز</div>
          </div>
          <div role="listbox" className="max-h-64 overflow-y-auto p-1.5">
            {includeAll && (
              <button
                type="button"
                role="option"
                aria-selected={String(value) === String(allValue)}
                onClick={() => choose(allValue)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-right text-xs transition hover:bg-purple-50 ${String(value) === String(allValue) ? 'bg-purple-50 font-black text-[#62205f]' : 'text-gray-700'}`}
              >
                <span>{allLabel}</span>
                {String(value) === String(allValue) && <Check size={15} className="shrink-0 text-[#62205f]" />}
              </button>
            )}
            {filteredSchools.map((school) => {
              const active = String(value) === String(school.id);
              return (
                <button
                  key={school.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(school.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-right text-xs transition hover:bg-purple-50 ${active ? 'bg-purple-50 font-black text-[#62205f]' : 'text-gray-700'}`}
                >
                  <span className="min-w-0 truncate">{optionLabel ? optionLabel(school) : school.name}</span>
                  {active && <Check size={15} className="shrink-0 text-[#62205f]" />}
                </button>
              );
            })}
            {filteredSchools.length === 0 && <div className="px-3 py-6 text-center text-xs text-gray-400">مدرسه‌ای با این نام پیدا نشد.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolSelect;
