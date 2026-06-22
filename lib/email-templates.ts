// ─────────────────────────────────────────────────────────────────────────────
// Éditeur de templates emails (item 12).
//
// Principe (zéro régression) : chaque route conserve son HTML par défaut en dur.
// Tant qu'aucune ligne `email_templates` n'existe pour une clé donnée, l'email
// utilise EXACTEMENT le HTML actuel. Dès que Florence enregistre une version
// personnalisée, la route l'utilise à la place (variables `{{var}}` substituées).
//
// Une route est « câblée » (`wired: true`) quand elle appelle réellement
// `getEmailTemplateOverride(key, ...)`. Les autres sont listées pour information
// et seront câblées une par une (chacune testée par un envoi réel).
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailTemplateMeta {
  key: string;
  name: string;
  description: string;
  variables: string[]; // noms de variables `{{var}}` disponibles dans le template
  wired: boolean;
}

export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  {
    key: 'recap-heures',
    name: 'Récapitulatif des heures (mensuel)',
    description:
      "Envoyé au client/parent avec le PDF récapitulatif des heures du mois. Le tableau des montants est injecté automatiquement via {{montantsTable}}.",
    variables: ['clientName', 'moisLabel', 'montantsTable', 'total'],
    wired: true,
  },
  {
    key: 'contact-notif',
    name: 'Notification de contact (à Florence)',
    description: "Email reçu par Florence quand le formulaire « Prendre contact » est rempli.",
    variables: ['nom', 'email', 'telephone', 'message'],
    wired: false,
  },
  {
    key: 'preparation-rdv1',
    name: 'Préparation du 1er rendez-vous',
    description: 'Email envoyé pour préparer le premier rendez-vous.',
    variables: ['recipientName', 'lien'],
    wired: false,
  },
  {
    key: 'recueil-informations',
    name: 'Recueil d’informations (envoi du formulaire)',
    description: 'Email avec le lien vers le formulaire de recueil d’informations.',
    variables: ['recipientName', 'lien'],
    wired: false,
  },
  {
    key: 'contractualisation-particulier',
    name: 'Contractualisation — particulier',
    description: 'Email d’envoi du contrat à signer (particulier).',
    variables: ['recipientName', 'lien'],
    wired: false,
  },
  {
    key: 'contractualisation-ecole',
    name: 'Contractualisation — établissement',
    description: 'Email d’envoi du contrat à signer (établissement).',
    variables: ['recipientName', 'lien'],
    wired: false,
  },
  {
    key: 'envoi-cv-casier',
    name: 'Envoi CV / casier judiciaire',
    description: 'Email d’envoi des documents (CV, casier).',
    variables: ['recipientName', 'lien'],
    wired: false,
  },
  {
    key: 'souhait-renouvellement',
    name: 'Souhait de renouvellement (lancement)',
    description: 'Email demandant si le client souhaite renouveler.',
    variables: ['recipientName', 'lien'],
    wired: false,
  },
  {
    key: 'renouvellement-accuse',
    name: 'Renouvellement — accusé de réception',
    description: 'Email de confirmation après réponse au formulaire de renouvellement.',
    variables: ['recipientName'],
    wired: false,
  },
  {
    key: 'cron-renouvellement-envoi',
    name: 'Renouvellement — envoi automatique (cron)',
    description: 'Email automatique de lancement du renouvellement.',
    variables: ['recipientName', 'lien'],
    wired: false,
  },
  {
    key: 'cron-renouvellement-relance',
    name: 'Renouvellement — relance (cron)',
    description: 'Email automatique de relance du renouvellement.',
    variables: ['recipientName', 'lien'],
    wired: false,
  },
  {
    key: 'cron-fin-de-contrat-relance',
    name: 'Fin de contrat — relance (cron)',
    description: 'Email automatique de relance pour les documents de fin de contrat.',
    variables: ['recipientName', 'lien'],
    wired: false,
  },
  {
    key: 'fin-de-contrat',
    name: 'Fin de contrat (lancement)',
    description: 'Email de lancement de la procédure de fin de contrat.',
    variables: ['recipientName', 'lien'],
    wired: false,
  },
];

export function getEmailTemplateMeta(key: string): EmailTemplateMeta | undefined {
  return EMAIL_TEMPLATES.find(t => t.key === key);
}

// Substitution simple `{{var}}` -> valeur. Valeurs insérées telles quelles
// (les templates sont rédigés par une admin de confiance, et certaines
// variables comme {{montantsTable}} sont du HTML).
export function substituteVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name] ?? '') : ''
  );
}

export interface RenderedTemplate {
  subject: string;
  html: string;
}

// Modèle par défaut proposé dans l'éditeur (bouton « charger le modèle par
// défaut ») pour les templates câblés. Sert de point de départ éditable ; tant
// qu'il n'est pas enregistré, la route garde son HTML d'origine.
export const DEFAULT_TEMPLATE_CONTENT: Record<string, RenderedTemplate> = {
  'recap-heures': {
    subject: 'Récapitulatif heures - {{clientName}} - {{moisLabel}}',
    html: `<div style="font-family: 'Inter', Arial, sans-serif; background:#fafafa; padding:40px 20px;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    <div style="padding:40px 40px 20px; text-align:center; background:linear-gradient(to bottom,#f9f3ee,#efe3d7);">
      <h1 style="margin:0; color:#6e3a25; font-family:Georgia,serif; font-size:28px;">A Rythme Ethic</h1>
      <p style="margin:10px 0 0; color:#c3826e; font-size:16px;">Accompagnement humain et bienveillant</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#7b4a31; font-size:16px; line-height:1.6;">Bonjour,</p>
      <p style="color:#7b4a31; font-size:16px; line-height:1.6;">
        Veuillez trouver ci-joint le récapitulatif des heures pour <strong>{{clientName}}</strong> - <strong>{{moisLabel}}</strong>.
      </p>
      {{montantsTable}}
      <p style="margin-top:28px; color:#a97761; font-size:14px; line-height:1.6;">
        Le récapitulatif complet est également disponible en pièce jointe (PDF).
      </p>
    </div>
    <div style="padding:30px 40px; background:#f9f3ee; text-align:center;">
      <p style="margin:0; color:#6e3a25; font-size:14px; font-weight:600;">Florence Louazel</p>
      <p style="margin:5px 0 0; color:#a97761; font-size:13px;">A Rythme Ethic</p>
    </div>
  </div>
</div>`,
  },
};
