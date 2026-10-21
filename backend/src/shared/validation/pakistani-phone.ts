/** Pakistani mobile: 11 digits, starts with 03 (e.g. 03001234567). */
export const PAKISTANI_MOBILE_REGEX = /^03\d{9}$/;

export const PAKISTANI_PHONE_MESSAGE =
  'Enter a valid Pakistani mobile number (11 digits, e.g. 03001234567).';

export function normalizePakistaniPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  } else if (digits.startsWith('3') && digits.length === 10) {
    digits = `0${digits}`;
  }
  return digits;
}

export function isValidPakistaniPhone(input: string): boolean {
  return PAKISTANI_MOBILE_REGEX.test(normalizePakistaniPhone(input));
}
