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

// Téléphone comparable : chiffres seuls, +33 / 0033 → 0 (« +33 6 12… » = « 06 12… »).
export function normalizePhone(value?: string | null): string {
  const d = (value || '').replace(/\D/g, '');
  if (d.startsWith('0033')) return '0' + d.slice(4);
  if (d.startsWith('33') && d.length === 11) return '0' + d.slice(2);
  return d;
}

type Contacts = Record<string, unknown>;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const sameEmail = (a: unknown, b: unknown) =>
  !!text(a) && text(a).toLowerCase() === text(b).toLowerCase();

// Dédoublonnage (règle stricte, meeting oct. 2026) : les téléphones renseignés des parents et du
// jeune sont tous différents ; l'email du jeune ≠ ceux des parents (les deux parents PEUVENT
// partager un email). Valeurs vides ignorées. Renvoie { champ: message } (sur le 2e champ).
export function findDuplicateContacts(d: Contacts): Record<string, string> {
  const errors: Record<string, string> = {};
  const [p1, p2, pj] = [d.phone_parent1, d.phone_parent2, d.phone_jeune].map(v =>
    normalizePhone(text(v))
  );
  if (p2 && p2 === p1) {
    errors.phone_parent2 = 'Les deux parents doivent avoir des numéros différents.';
  }
  if (pj && (pj === p1 || pj === p2)) {
    errors.phone_jeune = 'Le jeune doit avoir son propre numéro, différent de celui des parents.';
  }
  if (sameEmail(d.email_jeune, d.email_parent1) || sameEmail(d.email_jeune, d.email_parent2)) {
    errors.email_jeune =
      'Le jeune doit avoir sa propre adresse email, différente de celle des parents.';
  }
  return errors;
}

export const RECUEIL_CONTACT_KEYS = ['parent1', 'parent2', 'jeune'].flatMap(who =>
  ['first_name', 'last_name', 'phone', 'email'].map(field => `${field}_${who}`)
);

// Recueil des informations (formulaire public) : tout est obligatoire (Parent 2 seulement s'il y a
// deux parents, sinon ignoré), puis formats, puis doublons. Même règle côté navigateur et API.
export function findRecueilContactErrors(d: Contacts, deuxParents: boolean) {
  const c: Contacts = deuxParents ? d : { ...d, phone_parent2: '', email_parent2: '' };
  const errors = findDuplicateContacts(c);
  for (const key of RECUEIL_CONTACT_KEYS) {
    if (!deuxParents && key.endsWith('parent2')) continue;
    const v = text(c[key]);
    if (!v) errors[key] = 'Champ obligatoire';
    else if (key.startsWith('email') && !isValidEmail(v)) errors[key] = 'Email invalide';
    else if (key.startsWith('phone') && !isValidPhone(v)) {
      errors[key] = 'Numéro invalide (ex : 06 12 34 56 78)';
    }
  }
  return errors;
}

// Pièces jointes du recueil (bilans, emploi du temps) : PDF ou image, 15 Mo max par fichier.
export const RECUEIL_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
// Extension acceptée → seul type MIME admis (imposé à l'envoi, revérifié dans le Storage)
export const UPLOAD_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

// Extension acceptée (en minuscules) ou null
export function uploadExtension(filename: unknown): string | null {
  const ext = (typeof filename === 'string' && /\.(\w+)$/.exec(filename)?.[1].toLowerCase()) || '';
  return Object.hasOwn(UPLOAD_MIME, ext) ? ext : null;
}
