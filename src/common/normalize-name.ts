const DIACRITICS_REGEX = /[̀-ͯ]/g;

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
