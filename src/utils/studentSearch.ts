import { Student } from '../types';
import { toLatinDigits } from './persianInput';

/**
 * Normalizes Persian/Arabic text, numbers, punctuation and spacing for robust live searching.
 * Handles Persian digits (۰-۹), Arabic digits (٠-٩), Arabic Yeh (ي، ى), Arabic Kaf (ك),
 * Alef variants (آ، أ، إ), Heh variants (ة، ۀ), Vav (ؤ), diacritics/erab, tatweel, and spacing.
 */
export const normalizeSearchText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return toLatinDigits(String(value))
    .normalize('NFKC')
    .toLowerCase()
    // Fold Arabic/Persian letter variants
    .replace(/[يىئ]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ۀة]/g, 'ه')
    .replace(/ؤ/g, 'و')
    // Remove diacritics / harakat (fatha, damma, kasra, tanween, tashdeed) & tatweel
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    // Replace half-spaces (ZWNJ), non-breaking spaces, punctuation, dashes with a single space
    .replace(/[\u200b-\u200f\u202a-\u202e\ufeff\s_\-.,/\\|()؛:،]+/g, ' ')
    .trim();
};

/**
 * Tokenized multi-word search matcher:
 * Checks whether all search terms in the query match within the candidate text(s).
 * Supports:
 * - Substring matching
 * - Multi-word out-of-order matching (e.g. "علی حسینی" matches "حسینی، سید علی")
 * - Spaceless match (e.g. "علی محمدی" matches "علیمحمدی" or "علی‌محمدی")
 * - Persian/English digit transparency (e.g. "۰۹۱۳" matches "0913")
 */
export const matchTokens = (target: string, query: string): boolean => {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return true;

  const normTarget = normalizeSearchText(target);
  if (!normTarget) return false;

  // Direct substring match
  if (normTarget.includes(normQuery)) return true;

  // Spaceless match (e.g. "علی محمدی" matches "علیمحمدی" or "علی‌محمدی")
  const spacelessTarget = normTarget.replace(/\s+/g, '');
  const spacelessQuery = normQuery.replace(/\s+/g, '');
  if (spacelessTarget.includes(spacelessQuery)) return true;

  // Multi-word token match: every token in the query must match either with space or without
  const tokens = normQuery.split(' ').filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every((token) => normTarget.includes(token) || spacelessTarget.includes(token));
  }

  return false;
};

/**
 * Matches a student record against a search query across all relevant fields:
 * Name, National ID, Grade, Phone numbers, School name, Parsian code.
 */
export const matchesStudentSearch = (student: Partial<Student>, query: string): boolean => {
  if (!query || !query.trim()) return true;

  const combined = [
    student.name,
    student.national_id,
    student.grade,
    student.phone,
    student.father_phone,
    student.mother_phone,
    student.school_name,
    student.parsian_code,
  ]
    .filter(Boolean)
    .join(' ');

  return matchTokens(combined, query);
};
