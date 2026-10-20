import { Student } from '../types';

/**
 * Normalize Persian/Arabic text and digits before searching.
 * This makes searches work whether users type Persian digits, Arabic digits,
 * Arabic Yeh/Kaf, or Persian characters and spacing copied from spreadsheets.
 */
export const normalizeSearchText = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('fa')
    // Fold Arabic/Persian spelling variants before comparing.
    .replace(/[يىئ]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ۀة]/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    // Ignore diacritics, tatweel, zero-width and bidirectional formatting marks.
    .replace(/[\u064B-\u065F\u0670\u0640\u200b-\u200f\u202a-\u202e\ufeff]/g, '')
    // Ignore spaces and punctuation so «علی محمدی», «علی‌محمدی» and «علیمحمدی» match.
    .replace(/[^\p{L}\p{N}]/gu, '');

export const matchesStudentSearch = (student: Partial<Student>, query: string): boolean => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const fields = [
    student.name,
    student.national_id,
    student.grade,
    student.phone,
    student.father_phone,
    student.mother_phone,
    student.school_name,
    student.parsian_code,
  ].map(normalizeSearchText);

  return fields.some((field) => field.includes(normalizedQuery));
};
