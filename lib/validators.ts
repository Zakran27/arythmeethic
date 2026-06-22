// Shared validators for form inputs (emails, French phone numbers).
// Empty values are considered valid here — "required" is handled separately by the forms.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value?: string | null): boolean {
  if (!value) return true;
  const v = value.trim();
  return v === '' || EMAIL_REGEX.test(v);
}

// Accepts French numbers: 0X XX XX XX XX, +33 X XX XX XX XX, 0033 X XX XX XX XX
// (separators espaces / points / tirets tolérés).
export function isValidPhone(value?: string | null): boolean {
  if (!value) return true;
  const v = value.trim();
  if (v === '') return true;
  const digits = v.replace(/[\s.\-()]/g, '');
  return (
    /^0[1-9]\d{8}$/.test(digits) || // 0612345678
    /^\+33[1-9]\d{8}$/.test(digits) || // +33612345678
    /^0033[1-9]\d{8}$/.test(digits) // 0033612345678
  );
}

// Returns the list of formData keys whose value is an invalid email / phone.
// A key is treated as an email field if its name contains "email", as a phone
// field if it contains "phone".
export function findInvalidContactFields(formData: Record<string, unknown>): {
  invalidEmails: string[];
  invalidPhones: string[];
} {
  const invalidEmails: string[] = [];
  const invalidPhones: string[] = [];
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value !== 'string' || value.trim() === '') continue;
    const k = key.toLowerCase();
    if (k.includes('email') && !isValidEmail(value)) invalidEmails.push(key);
    else if (k.includes('phone') && !isValidPhone(value)) invalidPhones.push(key);
  }
  return { invalidEmails, invalidPhones };
}
