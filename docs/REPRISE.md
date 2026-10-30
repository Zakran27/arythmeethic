# A Rythme Ethic — reprise de contexte (pour Claude Code en local)

Site de **Florence Louazel** (« Flo »), cours particuliers de maths + interventions en écoles (Nantes).
Site vitrine public + back-office `/admin` (Florence et Thomas, les 2 seuls comptes admin) + formulaires publics
envoyés par email aux familles / écoles. Thomas (propriétaire du repo) pilote, Florence utilise le back-office au quotidien.

Backlog et notes de meetings : **`TODO.md`** (à lire en début de session).

## Règles de travail (demandées par Thomas)

- **Échanges en français.** Code, commentaires et messages de commit dans le style existant (commentaires FR, commits en anglais `feat(scope): …`).
- **Mode plan d'abord** : quand Thomas envoie des notes / demandes, on analyse et on propose ; **on ne code pas avant son « go »**.
- **Pas de branche ni de PR** : commit et push **directement sur `main`**. Un push sur `main` = déploiement Vercel.
- **Migrations SQL** : `database/schema.sql` est **obsolète**. État réel = schema.sql + `database/migration-*.sql` + ajouts passés à la main. Pas de MCP Supabase dispo en cloud : on écrit le SQL, Thomas le colle dans le **SQL Editor Supabase**, et on **ne pousse le code qui l'utilise qu'après sa confirmation** (sinon la prod plante sur une colonne absente). En local, si le MCP Supabase est branché : `list_tables` / `apply_migration` (l'élicitation peut être refusée en silence par le Code tab desktop → passer par le SQL Editor).
- **Dire non / « je ne sais pas »** quand un truc est infaisable, trop complexe ou non vérifié. Ne jamais annoncer une vérif non faite.
- **Respecter la charte** : couleurs `brand` / `accent` Chakra, emails via `renderEmailShell` (en-tête dégradé sable, bouton `#2ba1bd`).
- Refacto opportuniste autorisée (« ponytail » = commentaire `// ponytail:` pour signaler une simplification assumée / dette connue).

## Stack

Next.js 15.0.5 (App Router) · TypeScript · Chakra UI v2 · Supabase (Postgres + RLS + Storage bucket privé `client-files`) ·
Vercel (crons dans `vercel.json`) · **Brevo** (emails/SMS transactionnels) · **DocuSeal** (signatures, API `api.docuseal.com`) ·
pdf-lib (génération PDF) · unpdf (lecture texte des PDF uploadés) · TipTap (`components/RichTextEditor.tsx`).

## Vérifications avant push

```bash
npx tsc --noEmit -p .
npx next lint --file <fichiers modifiés>          # des warnings prettier préexistent ailleurs
node lib/heures-report.check.mjs                   # auto-tests (Node ≥ 22.18, types TS retirés nativement)
node lib/format.check.mjs
node lib/validators.check.mjs
node lib/fin-de-contrat-spots.check.mjs
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy \
  SUPABASE_SERVICE_ROLE_KEY=dummy npx next build   # le build plante sans ces variables
```

## Architecture (repères)

- **Auth** : `middleware.ts` — toutes les routes `/api` exigent une session **sauf** la liste `PUBLIC_API`
  (contact, `formulaire/*`, download, `cron/*`, `storage/upload`, GET google-reviews). ⚠️ Vérifie la session, **pas le rôle admin** (cf. audit dans TODO.md).
- **Supabase** : `lib/supabase-server.ts` (`createServiceRoleClient` = contourne le RLS, serveur uniquement) ; `lib/supabase-client.ts` (navigateur, RLS `is_admin()`).
- **Emails** : `lib/brevo.ts` `sendEmail` (multi-destinataires, PJ, ne jette jamais). Templates éditables par Florence dans `/admin/email-templates` : registre + défauts dans `lib/email-templates.ts`, lecture `getEmailTemplate(key)` + `renderTemplate()`. Anciennes routes : copies locales de `sendBrevoEmail` (à migrer au fil de l'eau).
- **Procédures** : `lib/procedures.ts` `launchProcedure` (procédure DRAFT → email → historique `MAIL_ENVOYE`, supprimée si l'email échoue), `findDraftProcedure` (formulaires à token). Historique = `procedure_status_history` (enum `procedure_status_label`).
- **Contrats DocuSeal** : `lib/docuseal.ts` (client API), `lib/signatures.ts` (synchro statut, versions V{n} par année scolaire, `cancelContractSignature`). Pas de webhook : synchro par le cron quotidien `/api/cron/signatures` (7 h) et au clic « Télécharger le contrat signé ».
- **Relances** : `lib/relances.ts` (`hasAutoRelances`, `canCancelSignature`) + colonne `procedures.relances_stoppees` respectée par tous les crons ; route `POST /api/procedures/[id]/relances` (stop | resume | cancel-signature).
- **Fin de contrat** : `lib/fin-de-contrat.ts` (lancement, constantes `FDC_*`), `lib/fin-de-contrat-signatures.ts` (création des 3 signatures DocuSeal, suivi par le cron signatures), `lib/fin-de-contrat-spots.ts` (position des cases : repère texte « SIGNATURE DE L'EMPLOYEUR », etc., sinon position des modèles Urssaf/France Travail).
- **Heures / CESU** : `lib/heures-report.ts` (`computeReports` = compteur de report, `heuresFacturees`), récap mensuel `app/api/heures-realisees/recap-email/route.ts` (PDF + email), modales `app/admin/clients/[id]/HeuresRealiséesModal.tsx`, `SendRecapModal.tsx`, `app/admin/clients/DeclarerHeuresModal.tsx` (envoi groupé).
- **Fiche client** : `app/admin/clients/[id]/page.tsx` (~4400 lignes, composant client) + `lib/hooks/useClientDetail.ts`.
- **Crons** (`vercel.json`, publics car `CRON_SECRET` non défini, idempotents sauf renouvellement-envoi) : signatures (7 h/j), preparation-accompagnement (16 h/j), fin-de-contrat-relance (tous les 3 j), renouvellement-relance (vendredi), renouvellement-envoi (15 juin). `?dry=1` = simulation sur signatures et préparation.

## Flux métier clés

- **Particulier** : Recueil d'infos → Préparation RDV 1 (date/heure) → Confirmation accompagnement (Oui/Non) → Contractualisation (DocuSeal, CDD CESU) → Préparation accompagnement (EDT + dispos, campagne auto le 20 août, relance 2e vendredi de sept.) → Début accompagnement → déclarations mensuelles d'heures (récap au parent) → Souhait de renouvellement (juin) → Fin de contrat.
- **Fin de contrat** : le parent dépose 3 PDF (non signés, PDF only) → attestation employeur + certificat de travail : signature du parent seul, liens immédiats ; reçu pour solde de tout compte : Florence signe d'abord, le parent reçoit son lien au cron de 7 h suivant → chaque PDF signé remplace l'original et part au parent en PJ ; relance hebdo.
- **1er RDV** (état au 13/10) : facturé sur le mois où il est saisi, à la durée exacte, ligne dédiée dans le récap. ⚠️ Demande du 29/10 (TODO C2) : heures entières facturées, le reste au compteur.
- **École** : contrat de prestation avec articles éditables avant envoi (`docs/contrat-articles-editables.md`), relances signature tous les 3 jours ouvrés.

## État au 30/10/2026

Livré (tout sur `main`) : lots 1–9 du meeting d'octobre (onglets Liste d'attente / Suivi prise de contact / Suivi CESU / Synthèse des disponibilités, fiches réorganisées, compteur de report, procédures RDV1 / confirmation / préparation / début d'accompagnement, recueil neuroatypie + parent administratif + situation familiale, versions de contrat, signatures DocuSeal de fin de contrat), 1er RDV facturé au mois choisi, Stopper / Reprendre les relances + Annuler la signature, vrai message d'erreur Supabase sur la fiche.

Pas encore testé en réel : parcours complet de signature de fin de contrat (vérifier que le parent ne reçoit pas l'email DocuSeal en double) ; récap d'octobre avec ligne 1er RDV (Hélène WATTEZ 1,47 h, Vanessa Bulan 1,73 h).

À faire : voir **`TODO.md`** — meeting du 29/10 (blocs A à F : corrections rapides, relecteur de contrat pro, actions en masse Suivi CESU, 1er RDV, adresse normalisée, interrupteur liste d'attente, pages Partenaires et Ressources Lycée/Collège, CMS) + audit sécurité/perf du 19/10 (priorité : `CRON_SECRET` sur Vercel, fermer `/api/storage/upload` public, `requireAdmin()`, renouvellement-envoi idempotent, mise à jour Next).

## Pièges connus

- Erreurs Supabase = objets simples, pas des `Error` (`instanceof Error` les masque) — cf. `fetchErrorMessage` dans `useClientDetail.ts`.
- `message` d'une `Error` n'est pas énumérable : ne pas spreader une erreur pour la copier.
- Limite Vercel 4,5 Mo par corps de requête : préférer les URL d'upload signées (`signedUploadUrl` dans `lib/procedures.ts`).
- Supabase renvoie 1 000 lignes max par requête par défaut.
- Les PDF uploadés par les familles contiennent des données personnelles (NIR…) : ne jamais les committer ; tests sur PDF synthétiques.
