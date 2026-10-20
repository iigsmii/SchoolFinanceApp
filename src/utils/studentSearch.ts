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
    .replace(/[يىئ]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\u064B-\u065F\u0670\u0640\u200c\u200d\u200e\u200f\ufeff]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizedStudentFields = new WeakMap<object, string[]>();

export const matchesStudentSearch = (student: Partial<Student>, query: string): boolean => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  let fields = normalizedStudentFields.get(student as object);
  if (!fields) {
    fields = [
      student.name,
      student.national_id,
      student.grade,
      student.phone,
      student.father_phone,
      student.mother_phone,
      student.school_name,
      student.parsian_code,
    ].map(normalizeSearchText);
    normalizedStudentFields.set(student as object, fields);
  }

  return fields.some((field) => field.includes(normalizedQuery));
};
