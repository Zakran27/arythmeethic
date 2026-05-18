// Format a French phone number for display, in groups of 2 digits.
// Examples:
//   "0612345678"     -> "06 12 34 56 78"
//   "+33612345678"   -> "+33 6 12 34 56 78"
//   "33612345678"    -> "+33 6 12 34 56 78"
//   anything else    -> input returned as-is (best-effort grouping if 8-10 digits)
export function formatPhone(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  // International French format: +33XXXXXXXXX (11 digits incl. country code)
  if ((hasPlus || digits.startsWith('33')) && digits.startsWith('33') && digits.length === 11) {
    const national = digits.slice(2); // 9 digits after country code
    const head = national.slice(0, 1);
    const rest = national.slice(1);
    const groups = rest.match(/.{1,2}/g)?.join(' ') ?? rest;
    return `+33 ${head} ${groups}`;
  }

  // Standard French: 10 digits starting with 0
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.match(/.{1,2}/g)?.join(' ') ?? digits;
  }

  // Generic even-length number: group by 2
  if (digits.length >= 8 && digits.length % 2 === 0) {
    return digits.match(/.{1,2}/g)?.join(' ') ?? digits;
  }

  // Fallback: return original input
  return trimmed;
}
