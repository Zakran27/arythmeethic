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
      "Envoyé au client/parent avec le PDF récapitulatif. Vous éditez le texte d'introduction ; le tableau des montants, la mention « Premier rendez-vous réalisé le … » (si besoin) et la note « pièce jointe » sont ajoutés automatiquement.",
    variables: ['clientName', 'moisLabel'],
    wired: true,
  },
  {
    key: 'contact-notif',
    name: 'Notification de contact (à Florence)',
    description:
      "Email reçu par Florence quand le formulaire « Prendre contact » est rempli. Vous éditez seulement le texte d'introduction ; le récapitulatif du formulaire est ajouté automatiquement.",
    variables: [],
    wired: true,
  },
  {
    key: 'preparation-rdv1',
    name: 'Préparation du 1er rendez-vous',
    description:
      "Email envoyé pour préparer le premier rendez-vous (liste des documents à apporter). Si le texte ne contient pas {{rdvDate}}, un encadré « Rendez-vous prévu le … à … » est ajouté automatiquement en bas de l'email.",
    variables: ['recipientName', 'jeuneName', 'rdvDate', 'rdvHeure'],
    wired: true,
  },
  {
    key: 'confirmation-accompagnement',
    name: "Confirmation du souhait d'accompagnement",
    description:
      "Email envoyé après le 1er rendez-vous pour confirmer (Oui / Non) le souhait d'accompagnement (bouton « Donner ma réponse » ajouté automatiquement).",
    variables: ['recipientName', 'jeunePrenom', 'anneeScolaire'],
    wired: true,
  },
  {
    key: 'debut-accompagnement',
    name: "Début de l'accompagnement",
    description:
      "Email envoyé à la famille (parents et jeune) avant le premier cours. Le texte entre {{#premierCours}} et {{/premierCours}} n'apparaît que si une date de premier cours est saisie.",
    variables: ['recipientName', 'jeunePrenom', 'premierCours'],
    wired: true,
  },
  {
    key: 'preparation-accompagnement',
    name: "Préparation de l'accompagnement (emploi du temps, disponibilités)",
    description:
      "Email envoyé au parent 1 (automatiquement à partir du 20 août aux familles qui ont confirmé l'accompagnement ou le renouvellement, ou depuis la fiche) avec le lien vers le formulaire : emploi du temps, contraintes extrascolaires, disponibilités. Bouton « Emploi du temps … – Remplir le formulaire » ajouté automatiquement.",
    variables: ['recipientName', 'jeunePrenom', 'anneeScolaire'],
    wired: true,
  },
  {
    key: 'preparation-accompagnement-relance',
    name: "Préparation de l'accompagnement — relance (auto)",
    description:
      'Relance automatique unique si le formulaire n’est pas rempli : le 2e vendredi de septembre (ou 7 jours après l’envoi s’il est plus tardif), ou depuis la Synthèse des disponibilités. Même bouton que l’email initial.',
    variables: ['recipientName', 'jeunePrenom', 'anneeScolaire'],
    wired: true,
  },
  {
    key: 'recueil-informations',
    name: 'Recueil d’informations (envoi du formulaire)',
    description:
      'Email avec le lien vers le formulaire de recueil d’informations (bouton « Compléter le formulaire » ajouté automatiquement).',
    variables: ['recipientName'],
    wired: true,
  },
  {
    key: 'contractualisation-particulier',
    name: 'Contractualisation — particulier',
    description:
      'Email envoyé au client pour signer le contrat (particulier). Bouton « Signer le document » ajouté automatiquement. La copie de contresignature de Florence n’est pas affectée.',
    variables: ['recipientName'],
    wired: true,
  },
  {
    key: 'contractualisation-ecole',
    name: 'Contractualisation — établissement',
    description:
      'Email envoyé au client pour signer le contrat de prestation (établissement). Bouton « Signer le document » ajouté automatiquement. La copie de contresignature de Florence n’est pas affectée.',
    variables: ['recipientName'],
    wired: true,
  },
  {
    key: 'contractualisation-particulier-relance',
    name: 'Contractualisation — relance particulier (auto)',
    description:
      'Relance automatique chaque semaine tant que le parent n’a pas signé le contrat. Bouton « Signer le document » + lien de secours ajoutés automatiquement.',
    variables: ['recipientName'],
    wired: true,
  },
  {
    key: 'contractualisation-ecole-relance',
    name: 'Contractualisation — relance établissement (auto)',
    description:
      'Relance automatique tous les 3 jours (jours ouvrés, ≈ 2 fois par semaine) tant que l’établissement n’a pas signé le contrat. Bouton « Signer le document » + lien de secours ajoutés automatiquement.',
    variables: ['recipientName'],
    wired: true,
  },
  {
    key: 'envoi-cv-casier',
    name: 'Envoi CV / casier judiciaire',
    description:
      'Email d’envoi des documents (CV, casier) — bouton « Télécharger les documents » ajouté automatiquement.',
    variables: ['recipientName'],
    wired: true,
  },
  {
    key: 'souhait-renouvellement',
    name: 'Souhait de renouvellement (lancement)',
    description:
      'Email demandant si le client souhaite renouveler (bouton « Donner ma réponse » ajouté automatiquement).',
    variables: ['recipientName', 'jeuneName'],
    wired: true,
  },
  {
    key: 'renouvellement-accuse',
    name: 'Renouvellement — accusé / avis Google',
    description:
      'Email de remerciement + demande d’avis Google après réponse au renouvellement (bouton « Laisser un avis Google » ajouté automatiquement).',
    variables: ['recipientName'],
    wired: true,
  },
  {
    key: 'cron-renouvellement-envoi',
    name: 'Renouvellement — envoi automatique (cron)',
    description:
      'Email automatique de lancement du renouvellement (bouton « Donner ma réponse » ajouté automatiquement).',
    variables: ['recipientName', 'jeuneName'],
    wired: true,
  },
  {
    key: 'cron-renouvellement-relance',
    name: 'Renouvellement — relance (cron)',
    description:
      'Email automatique de relance du renouvellement (bouton « Donner ma réponse » ajouté automatiquement).',
    variables: ['recipientName', 'jeuneName'],
    wired: true,
  },
  {
    key: 'cron-fin-de-contrat-relance',
    name: 'Fin de contrat — relance (cron)',
    description:
      'Email automatique de relance des documents de fin de contrat (liste des documents manquants + bouton ajoutés automatiquement).',
    variables: ['recipientName'],
    wired: true,
  },
  {
    key: 'fin-de-contrat',
    name: 'Fin de contrat (lancement)',
    description:
      'Email de lancement de la procédure de fin de contrat (bouton « Déposer les documents » + message de clôture ajoutés automatiquement).',
    variables: ['recipientName'],
    wired: true,
  },
  {
    key: 'fin-de-contrat-signature',
    name: 'Fin de contrat — signature des documents',
    description:
      'Envoyé au parent une fois les 3 documents déposés, puis à nouveau quand Florence a signé le reçu pour solde de tout compte. Un bouton « Signer le document » par document à signer est ajouté automatiquement (avec la mention du solde en attente de Florence si besoin).',
    variables: ['recipientName'],
    wired: true,
  },
  {
    key: 'fin-de-contrat-signature-relance',
    name: 'Fin de contrat — relance signature (cron)',
    description:
      'Relance automatique hebdomadaire tant que le parent n’a pas signé tous les documents de fin de contrat (boutons « Signer le document » ajoutés automatiquement).',
    variables: ['recipientName'],
    wired: true,
  },
  {
    key: 'fin-de-contrat-document-signe',
    name: 'Fin de contrat — document signé',
    description:
      'Envoyé au parent dès qu’un document de fin de contrat est signé par tous, avec le PDF signé en pièce jointe.',
    variables: ['recipientName', 'documentLabel'],
    wired: true,
  },
];

export function getEmailTemplateMeta(key: string): EmailTemplateMeta | undefined {
  return EMAIL_TEMPLATES.find(t => t.key === key);
}

// Substitution simple `{{var}}` -> valeur. Valeurs insérées telles quelles
// (les templates sont rédigés par une admin de confiance, et certaines
// variables comme {{montantsTable}} sont du HTML).
// Section `{{#var}}…{{/var}}` : contenu conservé seulement si `var` est non vide.
export function substituteVars(template: string, vars: Record<string, string>): string {
  return template
    .replace(
      /\{\{#([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_m, name: string, inner: string) => (vars[name] ? inner : '')
    )
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, name: string) =>
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name] ?? '') : ''
    );
}

export interface RenderedTemplate {
  subject: string;
  html: string;
}

// Habillage de marque (en-tête + pied) appliqué automatiquement autour du corps
// éditable. `dynamicBlock` (optionnel) = blocs calculés injectés après le corps
// (ex. tableau des montants du récap). Fonction pure → utilisable client + serveur.
export function renderEmailShell(bodyHtml: string, dynamicBlock = ''): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica','Arial',sans-serif;background-color:#fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr><td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(to bottom,#f9f3ee,#efe3d7);border-radius:16px 16px 0 0;">
          <h1 style="margin:0;color:#6e3a25;font-family:'Georgia',serif;font-size:28px;font-weight:600;">A Rythme Ethic</h1>
          <p style="margin:10px 0 0 0;color:#c3826e;font-size:16px;">Accompagnement humain et bienveillant</p>
        </td></tr>
        <tr><td style="padding:40px;color:#7b4a31;font-size:16px;line-height:1.6;">
          ${bodyHtml}
          ${dynamicBlock}
        </td></tr>
        <tr><td style="padding:30px 40px;background-color:#f9f3ee;border-radius:0 0 16px 16px;text-align:center;">
          <a href="https://arythmeethic.fr" style="text-decoration:none;color:inherit;display:block;">
            <p style="margin:0;color:#6e3a25;font-size:14px;font-weight:600;">Florence Louazel</p>
            <p style="margin:5px 0 0 0;color:#a97761;font-size:13px;">A Rythme Ethic</p>
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Sujet + HTML complet (habillage de marque) d'un template brut (cf. getEmailTemplate côté serveur).
export function renderTemplate(
  t: RenderedTemplate,
  vars: Record<string, string>,
  dynamicBlock = ''
): RenderedTemplate {
  return {
    subject: substituteVars(t.subject, vars),
    html: renderEmailShell(substituteVars(t.html, vars), dynamicBlock),
  };
}

// Bouton CTA standard, réutilisé comme bloc dynamique dans les emails à lien.
export function emailButton(href: string, label: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0;"><a href="${href}" style="display:inline-block;background-color:#2ba1bd;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:8px;font-size:16px;font-weight:500;">${label}</a></td></tr></table>`;
}

// Bouton « Signer le document » + lien de secours (emails de signature DocuSeal).
export function signatureLinkBlock(link: string): string {
  return (
    emailButton(link, 'Signer le document') +
    `<p style="margin:20px 0 0 0;color:#a97761;font-size:14px;line-height:1.6;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/><a href="${link}" style="color:#2ba1bd;word-break:break-all;">${link}</a></p>`
  );
}

// Modèle par défaut proposé dans l'éditeur (bouton « charger le modèle par
// défaut ») pour les templates câblés. Sert de point de départ éditable ; tant
// qu'il n'est pas enregistré, la route garde son HTML d'origine (recap-heures :
// la route utilise ce contenu par défaut dans l'habillage de marque).
// Corps par défaut (texte éditable uniquement — l'habillage de marque et les
// blocs calculés sont ajoutés automatiquement par la route via renderEmailShell).
export const DEFAULT_TEMPLATE_CONTENT: Record<string, RenderedTemplate> = {
  'recap-heures': {
    subject: 'Récapitulatif heures - {{clientName}} - {{moisLabel}}',
    html: `<p>Bonjour,</p><p>Veuillez trouver ci-dessous le récapitulatif des heures pour <strong>{{clientName}}</strong> — <strong>{{moisLabel}}</strong>.</p>`,
  },
  'preparation-rdv1': {
    subject: 'A Rythme Ethic - Préparation du premier rendez-vous',
    html: `<p>Bonjour {{recipientName}},</p><p>Je vous confirme notre premier rendez-vous le <strong>{{rdvDate}} à {{rdvHeure}}</strong>.</p><p>Afin de préparer au mieux notre premier rendez-vous avec {{jeuneName}}, je vous invite à rassembler les documents suivants :</p><ul><li>Les 3 derniers bulletins de notes</li><li>Les 2 dernières évaluations de mathématiques</li><li>Le(s) cahier(s) ou classeur de mathématiques</li></ul><p>Ces éléments me permettront de mieux comprendre le parcours scolaire et d'adapter mon accompagnement.</p><p>Si vous avez des questions, n'hésitez pas à me contacter.</p>`,
  },
  'souhait-renouvellement': {
    subject: "A Rythme Ethic - Souhaitez-vous poursuivre l'accompagnement ?",
    html: `<p>Bonjour {{recipientName}},</p><p>L'année scolaire touche à sa fin et je tenais à vous remercier pour la confiance que vous m'avez accordée pour l'accompagnement de {{jeuneName}}.</p><p>Afin de préparer sereinement la rentrée prochaine, j'aimerais savoir si vous envisagez de poursuivre l'accompagnement l'année suivante.</p><p>Bien sûr, votre réponse n'est en aucun cas un engagement. C'est simplement une indication qui m'aidera à organiser mon planning pour la rentrée.</p><p>Si vous avez déjà une idée, vous pouvez me faire part de votre souhait en cliquant sur le bouton ci-dessous :</p>`,
  },
  'cron-renouvellement-envoi': {
    subject: "A Rythme Ethic - Souhaitez-vous poursuivre l'accompagnement ?",
    html: `<p>Bonjour {{recipientName}},</p><p>L'année scolaire touche à sa fin et je tenais à vous remercier pour la confiance que vous m'avez accordée pour l'accompagnement de {{jeuneName}}.</p><p>Afin de préparer la rentrée prochaine, <strong>souhaitez-vous poursuivre l'accompagnement l'année suivante ?</strong></p><p>Merci de me faire part de votre décision en cliquant sur le bouton ci-dessous :</p>`,
  },
  'cron-renouvellement-relance': {
    subject: 'A Rythme Ethic - Rappel : Votre avis sur le renouvellement',
    html: `<p>Bonjour {{recipientName}},</p><p>Je me permets de vous relancer concernant le renouvellement de l'accompagnement de {{jeuneName}} pour l'année prochaine.</p><p><strong>Votre réponse m'aiderait à organiser au mieux mon planning pour la rentrée.</strong></p><p>Cela ne prend que quelques secondes :</p>`,
  },
  'renouvellement-accuse': {
    subject: 'A Rythme Ethic - Votre avis compte !',
    html: `<p>Bonjour {{recipientName}},</p><p>Merci pour votre réponse concernant le renouvellement de l'accompagnement !</p><p>Si vous avez été satisfait(e) de nos échanges et du suivi de votre enfant, <strong>pourriez-vous prendre quelques instants pour laisser un avis Google ?</strong></p><p>Votre témoignage est précieux et aide d'autres familles à découvrir mes services.</p>`,
  },
  'recueil-informations': {
    subject: 'A Rythme Ethic - Formulaire de recueil des informations',
    html: `<p>Bonjour {{recipientName}},</p><p>Afin de préparer au mieux notre collaboration, je vous invite à compléter le formulaire de recueil des informations en cliquant sur le bouton ci-dessous.</p><p>Ce formulaire me permettra de mieux connaître votre situation et d'adapter mon accompagnement.</p>`,
  },
  'envoi-cv-casier': {
    subject: 'A Rythme Ethic - Documents à télécharger',
    html: `<p>Bonjour {{recipientName}},</p><p>Je vous transmets ci-dessous les documents demandés (CV actualisé et/ou extrait de casier judiciaire).</p><p>Cliquez sur le bouton ci-dessous pour accéder à la page de téléchargement :</p>`,
  },
  'contractualisation-particulier': {
    subject: 'A Rythme Ethic - Signature du contrat',
    html: `<p>Bonjour {{recipientName}},</p><p>Florence Louazel vous invite à signer le contrat d'accompagnement A Rythme Ethic.</p>`,
  },
  'contractualisation-ecole': {
    subject: 'A Rythme Ethic - Signature du contrat',
    html: `<p>Bonjour {{recipientName}},</p><p>Florence Louazel vous invite à signer le contrat de prestation A Rythme Ethic.</p>`,
  },
  'contractualisation-particulier-relance': {
    subject: 'A Rythme Ethic - Rappel : signature du contrat',
    html: `<p>Bonjour {{recipientName}},</p><p>Je me permets de revenir vers vous : le contrat d'accompagnement A Rythme Ethic n'est pas encore signé.</p><p>Vous pouvez le signer en quelques clics grâce au bouton ci-dessous.</p>`,
  },
  'contractualisation-ecole-relance': {
    subject: 'A Rythme Ethic - Rappel : signature du contrat',
    html: `<p>Bonjour {{recipientName}},</p><p>Je me permets de revenir vers vous : le contrat de prestation A Rythme Ethic n'est pas encore signé.</p><p>Vous pouvez le signer en quelques clics grâce au bouton ci-dessous.</p>`,
  },
  'fin-de-contrat': {
    subject: 'A Rythme Ethic - Fin de contrat - documents à transmettre',
    html: `<p>Bonjour {{recipientName}},</p><p>L'accompagnement de votre enfant touche à sa fin.</p><p>Pourriez-vous effectuer les démarches sur le site du CESU pour mettre fin à mon contrat qui me lie à vous ? Il est possible de réaliser la déclaration du mois en cours en même temps.</p><p><a href="https://www.cesu.urssaf.fr/info/accueil/question-du-moment/comment-gerer-la-fin-de-contrat.html">Procédure CESU - comment gérer la fin de contrat</a></p><p>Une fois que vous aurez ces trois documents, merci de me les transmettre via le formulaire ci-dessous :</p><ul><li>Reçu pour solde de tout compte</li><li>Attestation employeur</li><li>Certificat de travail</li></ul><p><strong>Inutile de les signer :</strong> une fois les 3 documents déposés, vous recevrez par email un lien pour les signer électroniquement.</p>`,
  },
  'fin-de-contrat-signature': {
    subject: 'A Rythme Ethic - Fin de contrat : documents à signer',
    html: `<p>Bonjour {{recipientName}},</p><p>Merci pour l'envoi des documents de fin de contrat. Il ne reste plus qu'à les signer électroniquement, en quelques clics, grâce aux boutons ci-dessous.</p>`,
  },
  'fin-de-contrat-signature-relance': {
    subject: 'A Rythme Ethic - Rappel : documents de fin de contrat à signer',
    html: `<p>Bonjour {{recipientName}},</p><p>Je me permets de revenir vers vous : certains documents de fin de contrat ne sont pas encore signés.</p><p>Vous pouvez les signer en quelques clics grâce aux boutons ci-dessous.</p>`,
  },
  'fin-de-contrat-document-signe': {
    subject: 'A Rythme Ethic - {{documentLabel}} signé',
    html: `<p>Bonjour {{recipientName}},</p><p>Vous trouverez ci-joint le document <strong>{{documentLabel}}</strong> signé. Il remplace la version que vous m'aviez transmise.</p><p>Belle journée,</p>`,
  },
  'cron-fin-de-contrat-relance': {
    subject: 'A Rythme Ethic - Rappel : documents de fin de contrat',
    html: `<p>Bonjour {{recipientName}},</p><p>Je me permets de revenir vers vous concernant la fin de contrat. Il manque encore les document(s) suivant(s) :</p>`,
  },
  'confirmation-accompagnement': {
    subject: "A Rythme Ethic - Confirmation de votre souhait d'accompagnement",
    html: `<p>Bonjour {{recipientName}},</p><p>Suite à notre premier rendez-vous, après réflexion, vous pouvez confirmer votre souhait d'accompagnement pour l'année scolaire {{anneeScolaire}}.</p><p>Il vous suffit de cliquer sur le bouton ci-dessous :</p>`,
  },
  'debut-accompagnement': {
    subject: "A Rythme Ethic - Début de l'accompagnement",
    html: `<p>Bonjour {{recipientName}},</p><p>{{#premierCours}}Notre premier cours aura lieu le <strong>{{premierCours}}</strong>. Ce créneau sera la règle de base pour nos rencontres ; bien sûr, chaque semaine nous échangerons avec {{jeunePrenom}} si nous devons le déplacer. Par la suite, je prendrai les rendez-vous directement avec {{jeunePrenom}} afin de l'accompagner vers plus d'autonomie.{{/premierCours}}</p><p>Merci de préparer les éléments suivants :</p><ul><li>Dernières évaluations</li><li>Cahier/classeur de maths</li><li>Livre de maths s'il y en a un</li><li>Calculatrice</li><li>Feuilles pour faire les exercices</li><li>Fiches cartonnées pour fiches de révision/méthode</li><li>Crayons</li><li>Éventuellement ardoise pour le brouillon ou sinon des feuilles de brouillon</li><li>Liste des éléments prioritaires à aborder si possible, sinon je composerai avec les éléments le moment venu</li></ul><p>À très bientôt,</p>`,
  },
  'preparation-accompagnement': {
    subject: "A Rythme Ethic - Préparation de l'accompagnement {{anneeScolaire}}",
    html: `<p>Bonjour {{recipientName}},</p><p>Vous avez souhaité donner suite au bilan ou vous souhaitez continuer l'accompagnement de l'année passée.</p><p>Afin de m'organiser et de recueillir les disponibilités de {{jeunePrenom}}, je vous invite à répondre au formulaire dès que vous aurez reçu l'emploi du temps de l'année scolaire {{anneeScolaire}}.</p><p>Je reprendrai contact avec vous par la suite.</p>`,
  },
  'preparation-accompagnement-relance': {
    subject: "A Rythme Ethic - Rappel : préparation de l'accompagnement {{anneeScolaire}}",
    html: `<p>Bonjour {{recipientName}},</p><p>Je me permets de revenir vers vous : afin d'organiser l'accompagnement de {{jeunePrenom}} pour l'année scolaire {{anneeScolaire}}, pourriez-vous compléter le formulaire avec son emploi du temps et ses disponibilités ?</p><p>Cela ne prend que quelques minutes :</p>`,
  },
  'contact-notif': {
    subject: 'Nouveau message du site - A Rythme Ethic',
    html: `<p>Un nouveau message a été envoyé via le formulaire de contact du site.</p>`,
  },
};
