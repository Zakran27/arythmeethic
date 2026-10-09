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

// ISO → « 28/04/2025 à 09:03 » (heure locale du navigateur)
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

// 45 → « 45 min » ; 75 → « 1 h 15 » ; 120 → « 2 h »
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const m = min % 60;
  return `${Math.floor(min / 60)} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`;
}

// 'YYYY-MM-DD' (date murale, sans fuseau) → « mardi 14 octobre 2026 » / « jeudi 1er octobre 2026 »
export function formatDateLongFr(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .replace(/ 1 /, ' 1er ');
}

// '17:30' → « 17h30 » ; '09:00' → « 9h »
export function formatHeureFr(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${Number(h)}h${m === '00' ? '' : m}`;
}

// Année scolaire « 2026-2027 » : à partir de juin on parle déjà de l'année suivante
// (même seuil que procedures.annee_scolaire, cf. database/migration-meeting-oct26.sql).
export function anneeScolaire(d = new Date()): string {
  const start = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${start + 1}`;
}
