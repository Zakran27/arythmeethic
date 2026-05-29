# TODO

## 🔴 Retours Florence (28 mai 2026) — Call Thomas/Florence — À FAIRE prochaine session

> Liste des retours captés pendant le call du 28/05. À traiter en bloc à la prochaine session. Ordre suggéré : petits items rapides (1, 4, 5, 6) → moyens (2, 3, 7, 8, 10, 11) → gros chantier (12). Item 9 = question pure, réponse ci-dessous, rien à faire.
>
> **⚠️ Pour la DB : utiliser le MCP Supabase, PAS lire `database/schema.sql`** — le fichier local n'est pas toujours à jour vs. la DB réelle (plusieurs tables comme `heures_realisees` ont été créées directement dans Supabase). Utiliser :
> - `mcp__supabase__list_tables` pour voir les tables et colonnes réelles
> - `mcp__supabase__execute_sql` (ou `_read_only`) pour inspecter les contraintes / valeurs existantes
> - `mcp__supabase__apply_migration` pour appliquer les changements de schéma (préférable à donner un SQL à Thomas à copier-coller)
> - `mcp__supabase__get_advisors` après chaque migration pour détecter les pbs de sécurité / perf

### 1. Bouton "Retour" à côté de "Modifier" sur la fiche client
**Demande Florence :** ajouter un bouton "Retour" à côté du bouton "Modifier" dans le header de la fiche client. Le retour doit ramener à la **liste correspondante au type/statut du client** (liste Prospects si on regarde un Prospect, liste Clients si on regarde un Client, liste Archivés si on regarde un Archivé — voir item 2).

**État actuel du code :**
- [app/admin/clients/\[id\]/page.tsx:978-985](app/admin/clients/[id]/page.tsx) — actuellement le header n'a que `<Button>Modifier</Button>` et `<Button>Supprimer</Button>`. Aucun bouton retour, l'utilisateur doit utiliser le navigateur.
- La page liste [app/admin/clients/page.tsx:137-142](app/admin/clients/page.tsx) sépare déjà `prospectsList` et `clientsList` via le `client_status` et utilise probablement des onglets ou une route avec query param. À vérifier comment la page liste détecte l'onglet actif (state local ou query param ?). Si state local, le "Retour" devra reconstruire l'URL `/admin/clients?tab=prospects|clients|archives` (ou équivalent) — donc passer la page liste en query-param synchronisé.

**Stratégie pressentie :**
- Ajouter `<Button variant="outline" onClick={() => router.push('/admin/clients?tab=...')}>Retour</Button>` dans le `HStack` ligne 978 de [app/admin/clients/\[id\]/page.tsx](app/admin/clients/[id]/page.tsx).
- L'onglet cible est dérivé du `client.client_status` (`'Prospect' → tab=prospects`, `'Client' → tab=clients`, `'Archivé' → tab=archives` — voir item 2 pour le 3e statut).
- Côté liste [app/admin/clients/page.tsx](app/admin/clients/page.tsx) : lire un query param `?tab=...` au mount pour ouvrir le bon onglet.

---

### 2. Bouton "Archiver" + onglet "Archivés" dans l'admin
**Demande Florence :** ajouter un bouton "Archiver" sur la fiche client. Quand un client est archivé, on stocke la **date d'archivage** et il devient un 3e type (en plus de Client et Prospect). Donc :
- Nouvel onglet "Archivés" dans l'admin (`/admin/clients`), à côté de "Clients" et "Prospects".
- Dans la liste des archivés, afficher la **date d'archivage** comme colonne.

**État actuel du code :**
- DB : avant de toucher au schéma, utiliser `mcp__supabase__list_tables` pour vérifier les colonnes/contraintes réelles de la table `clients` (la contrainte `client_status` peut différer de schema.sql local).
- Type [types/index.ts:14](types/index.ts) : `export type ClientStatus = 'Prospect' | 'Client'` → étendre à `'Prospect' | 'Client' | 'Archivé'`.
- Liste [app/admin/clients/page.tsx:137-142](app/admin/clients/page.tsx) : filtres `prospectsList` et `clientsList`. À ajouter `archivedList = clients.filter(c => c.client_status === 'Archivé')`.
- Fiche [app/admin/clients/\[id\]/page.tsx:978](app/admin/clients/[id]/page.tsx) : header avec boutons Modifier/Supprimer. Ajouter "Archiver".
- Édition [app/admin/clients/\[id\]/EditClientModal.tsx:426-427](app/admin/clients/[id]/EditClientModal.tsx) : Select pour `client_status`. Ajouter l'option "Archivé".

**Migration via `mcp__supabase__apply_migration` :**
```sql
-- Étendre la contrainte client_status
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_client_status_check
  CHECK (client_status IN ('Prospect', 'Client', 'Archivé'));

-- Ajouter la date d'archivage
ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_at timestamptz;
```
→ Appliquer avec `mcp__supabase__apply_migration` (name: `add_archived_status`). Vérifier ensuite avec `mcp__supabase__get_advisors`.

**Stratégie pressentie :**
- Bouton "Archiver" sur la fiche client : ouvre une confirmation puis `UPDATE clients SET client_status='Archivé', archived_at=now() WHERE id=?`.
- Si déjà archivé, le bouton devient "Désarchiver" (`UPDATE ... SET client_status='Prospect', archived_at=null`) — ou Florence choisit dans un Select le nouveau statut.
- Onglet "Archivés" dans la liste avec colonne supplémentaire "Archivé le JJ/MM/AAAA".
- ⚠️ Vérifier impact sur le bouton "Déclarer des heures" global → exclure les archivés.
- ⚠️ Couplé avec l'item 1 (bouton Retour doit aussi connaître l'onglet "archives").

---

### 3. Adresse des cours différente — checkbox conditionnelle
**Demande Florence :** dans le formulaire client (création + édition) et sur la fiche client, ajouter une case à cocher "Adresse des cours différente de l'adresse du client". Si cochée, afficher un second bloc de champs d'adresse "Adresse des cours". Sinon, ne rien afficher.

**État actuel du code :**
- DB : utiliser `mcp__supabase__list_tables` (schema=public, table=clients) pour récupérer les noms exacts des colonnes adresse existantes (`adresse` / `address` / `street` / `ville` / `code_postal` / etc.). Adapter la migration ci-dessous aux noms réels.
- Formulaires : [app/admin/clients/NewClientModal.tsx](app/admin/clients/NewClientModal.tsx) (création) et [app/admin/clients/\[id\]/EditClientModal.tsx](app/admin/clients/[id]/EditClientModal.tsx) (édition). Grep `adresse` ou `address` pour trouver les champs existants à dupliquer.
- Fiche : [app/admin/clients/\[id\]/page.tsx](app/admin/clients/[id]/page.tsx) — afficher l'adresse de cours quand elle existe.

**Migration via `mcp__supabase__apply_migration` (name: `add_adresse_cours`) :**
```sql
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS adresse_cours text,
  ADD COLUMN IF NOT EXISTS code_postal_cours text,
  ADD COLUMN IF NOT EXISTS ville_cours text;
```
(ajuster les noms `adresse_cours / code_postal_cours / ville_cours` pour matcher la convention des colonnes existantes — vérifier d'abord avec `mcp__supabase__list_tables`)

**Stratégie pressentie :**
- Checkbox `adresse_cours_differente` (booléen local, pas en DB) qui contrôle l'affichage conditionnel.
- Si checkbox cochée et qu'on a `adresse_cours` non vide → afficher le bloc d'adresse cours. Sinon le bloc est masqué et les valeurs vidées au submit.
- Sur la fiche, afficher "Adresse des cours : ..." uniquement si différente de l'adresse principale.

---

### 4. Détrompeur sur les numéros de téléphone (tous les champs)
**Demande Florence :** ajouter une validation des numéros de téléphone sur **tous les champs téléphone** dans les formulaires pour empêcher la saisie de numéros invalides.

**État actuel du code :**
- Champs téléphone côté admin : `phone1`, `phone_parent1`, `phone_parent2`, `phone_jeune` dans [NewClientModal.tsx](app/admin/clients/NewClientModal.tsx) et [EditClientModal.tsx](app/admin/clients/[id]/EditClientModal.tsx).
- Champ téléphone côté contact : [components/ContactModal.tsx](components/ContactModal.tsx).
- Une formatte téléphone partielle a déjà été ajoutée (cf commit afdaf94 "format tél"), mais sans validation bloquante apparente. À vérifier.

**Stratégie pressentie :**
- Côté client : regex stricte FR `/^(?:(?:\+|00)33[\s.-]{0,3}(?:\(0\)[\s.-]{0,3})?|0)[1-9](?:(?:[\s.-]?\d{2}){4})$/` (accepte +33, 00 33, 0X, espaces et tirets). Afficher `FormErrorMessage` sous le champ tant que non valide.
- Bloquer la soumission tant que le téléphone (s'il est rempli) n'est pas valide.
- Bonus : auto-format en `06 12 34 56 78` pendant la frappe (déjà partiellement présent ?).

---

### 5. Détrompeur sur les emails (tous les champs)
**Demande Florence :** "Détrompeur sur les mails, checker si l'email est bon (si jamais on peut le faire)" → validation regex sur **tous les champs email** des formulaires (pas seulement Contact).

**État actuel du code :**
- Contact public : **DÉJÀ FAIT** — [app/api/contact/route.ts:6](app/api/contact/route.ts) `EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` + check 400 + validation client dans [ContactModal.tsx](components/ContactModal.tsx). Cf section "21 mai 2026 #4" plus bas.
- Admin (NewClient, EditClient) : aucune validation regex. `<Input type="email" />` HTML5 seulement.
- Autres formulaires : recueil-informations, fin-de-contrat, renouvellement — à vérifier.

**Stratégie pressentie :**
- Centraliser le regex dans `lib/validators.ts` ou `lib/format.ts` (déjà existant).
- Appliquer dans tous les formulaires admin avec `FormErrorMessage` sous chaque champ email.
- Bonus (optionnel) : vérification de domaine via DNS/MX record côté API (overkill probablement, regex suffit).

---

### 6. Tableau "Heures réalisées" — colonnes tronquées à droite
**Demande Florence :** dans la liste des heures réalisées (fiche client), les colonnes sont tronquées à droite. Réduire la taille des colonnes.

**État actuel du code :**
- [app/admin/clients/\[id\]/page.tsx ~ligne 1859](app/admin/clients/[id]/page.tsx) : tableau des heures réalisées avec colonnes Mois, Heures, Tarif, Total, Km, Barème, Frais km, À reporter, Total facturé, Actions.
- Récemment fix c28316a pour le responsive des boutons d'action. Mais les colonnes de données peuvent encore déborder selon le viewport.

**Stratégie pressentie :**
- Réduire les paddings (`px={2}` au lieu de `px={4}`).
- Format compact : "12h" au lieu de "12 heures", "01/2026" au lieu de "Janvier 2026".
- Ajouter `overflowX="auto"` sur la `TableContainer` parente si pas déjà présent.
- Considérer masquer certaines colonnes en mobile (`display={{ base: 'none', md: 'table-cell' }}`).
- Tester visuellement à 1280px et 1440px (largeurs courantes laptop).

---

### 7. Récap email — afficher les heures reportées des "mois précédents"
**Demande Florence :** ajouter la mention "des mois précédents" pour les heures à reporter dans le recap mensuel envoyé.

**État actuel du code :**
- [app/api/heures-realisees/recap-email/route.ts](app/api/heures-realisees/recap-email/route.ts) : email récap envoyé manuellement. Inclut déjà `temps_a_reporter` (cumul implémenté via commit 8265a80).
- À vérifier : le mail dit-il bien "X heures reportées des mois précédents" ou seulement "À reporter : Xh" ?

**Stratégie pressentie :**
- Modifier le template HTML du recap pour expliciter : "incluant Xh reportées des mois précédents (cumul depuis mois M)".
- Lien avec l'item 8 (cas d'annulation) : la ligne récap doit aussi montrer les heures d'annulation facturées.
- ⚠️ Possiblement déjà fait par 8265a80 — vérifier le contenu actuel de l'email avant d'estimer le scope.

---

### 8. Cas d'annulation dans la déclaration d'heures
**Demande Florence :** dans la modale "Déclarer des heures", ajouter une **checkbox "Cas d'annulation"** qui révèle un champ "Nombre d'heures à facturer en cas d'annulation". Ces heures doivent apparaître dans le récap envoyé.

**État actuel du code :**
- Modale [app/admin/clients/DeclarerHeuresModal.tsx](app/admin/clients/DeclarerHeuresModal.tsx) : champs Mois, Heures, Tarif, Km, Barème, "Temps à reporter". Pas de notion d'annulation.
- DB : vérifier le schéma actuel de `heures_realisees` avec `mcp__supabase__list_tables` (la table n'est PAS dans `database/schema.sql` local — elle a été créée directement dans Supabase via les migrations `database/migration-*.sql`).
- Récap email [app/api/heures-realisees/recap-email/route.ts](app/api/heures-realisees/recap-email/route.ts) : à enrichir pour inclure les heures d'annulation.

**Migration via `mcp__supabase__apply_migration` (name: `add_heures_annulation`) :**
```sql
ALTER TABLE heures_realisees
  ADD COLUMN IF NOT EXISTS heures_annulation numeric DEFAULT 0;
```
(stocker juste les heures, la "case cochée" se déduit de `heures_annulation > 0`)

**Stratégie pressentie :**
- Dans la modale, ajouter `<Checkbox>Cas d'annulation ce mois-ci</Checkbox>`. Si cochée → afficher `<NumberInput>Heures à facturer (annulation)</NumberInput>`. Sinon → masquer + reset à 0.
- À l'insert/update de `heures_realisees`, stocker `heures_annulation`.
- Mettre à jour le calcul du total facturé : `total = (heures × tarif) + (heures_annulation × tarif) + frais_km + ...`.
- Dans le récap email, ajouter une ligne "Heures d'annulation facturées : Xh × Y€ = Z€" quand `heures_annulation > 0`.
- Mettre à jour le tableau de la fiche client pour afficher la colonne "Annulation".

---

### 9. ✅ Réponse à Florence — Notification email sur les formulaires
**Question Florence :** "L'envoi d'email à Florence, c'était bien quand quelqu'un remplit le formulaire 'Prendre contact' uniquement ?"

**Réponse vérifiée dans le code :**
> **OUI, uniquement le formulaire "Prendre contact"** ([components/ContactModal.tsx](components/ContactModal.tsx) → [app/api/contact/route.ts:221-311](app/api/contact/route.ts)).
>
> Aucun autre formulaire ne déclenche de notification à Florence :
> - `app/formulaire/recueil-informations/[token]` (rempli par les clients après envoi de la procédure) — pas de notif
> - `app/formulaire/recueil-informations-ecole/page.tsx` — pas de notif
> - `app/formulaire/fin-de-contrat/[token]` — pas de notif
> - `app/formulaire/renouvellement/[token]` — pas de notif
>
> Variables d'env utilisées : `FLORENCE_NOTIF_EMAIL` (override) → fallback sur `BREVO_SENDER_EMAIL` → fallback hardcodé sur `florence.louazel@arythmeethic.fr`.

**Action requise** : NONE — purement informatif. Si Florence veut étendre aux autres formulaires, créer un nouvel item.

---

### 10. Uniformiser les salutations dans les emails — juste le prénom pour les particuliers
**Demande Florence :** dans tous les emails envoyés aux particuliers, uniformiser la salutation. Aujourd'hui on a différentes formulations (`Bonjour ${firstName}`, `Bonjour ${firstName} ${lastName}`, `Bonjour ${recipientName}` où `recipientName` peut être "Prénom Nom"). Florence veut **uniquement le prénom** partout pour les particuliers.

**État actuel du code (inventaire) :**
- [app/api/procedures/preparation-rdv1/route.ts:142](app/api/procedures/preparation-rdv1/route.ts) — `Bonjour ${recipientName}` (recipientName = "Prénom Nom")
- [app/api/procedures/contractualisation-particulier/route.ts:81](app/api/procedures/contractualisation-particulier/route.ts) — `Bonjour ${toName}` (= "Prénom Nom")
- [app/api/procedures/recueil-informations/route.ts:251](app/api/procedures/recueil-informations/route.ts) — `Bonjour ${recipientName}` (déjà = `first_name` ✅)
- [app/api/procedures/envoi-cv-casier/send-email/route.ts:183](app/api/procedures/envoi-cv-casier/send-email/route.ts) — `Bonjour ${recipientName}`
- [app/api/procedures/souhait-renouvellement/route.ts:89](app/api/procedures/souhait-renouvellement/route.ts) — `Bonjour ${recipientName}`
- [app/api/procedures/contractualisation-ecole/route.ts:81](app/api/procedures/contractualisation-ecole/route.ts) — `Bonjour ${toName}` (école → laisser "Prénom Nom" ? ou aussi prénom seul ?)
- [app/api/formulaire/renouvellement/route.ts:88](app/api/formulaire/renouvellement/route.ts) — `Bonjour ${recipientName}`
- [app/api/heures-realisees/recap-email/route.ts:208](app/api/heures-realisees/recap-email/route.ts) — `Bonjour,` (générique, à personnaliser ?)
- [app/api/cron/renouvellement-envoi/route.ts:96](app/api/cron/renouvellement-envoi/route.ts) — `Bonjour ${recipientName}`
- [app/api/cron/renouvellement-relance/route.ts:101](app/api/cron/renouvellement-relance/route.ts) — `Bonjour ${recipientName}`
- [app/api/cron/fin-de-contrat-relance/route.ts:52](app/api/cron/fin-de-contrat-relance/route.ts) — `Bonjour ${recipientName}`
- [lib/fin-de-contrat.ts:66](lib/fin-de-contrat.ts) — `Bonjour ${recipientName}`

**Stratégie pressentie :**
- Modifier chaque endroit pour passer `firstName` seul (extraire `recipientName.split(' ')[0]` ou utiliser directement `client.first_name_parent1` etc).
- Pour les écoles : à confirmer avec Florence (prénom suffit ou Prénom Nom ?). Item parle de "particuliers" donc on garde "Prénom Nom" pour les écoles a priori.
- Pour le récap heures (`Bonjour,` générique) : ajouter le prénom du destinataire (parent1/parent2/jeune selon choix dans modale).
- ⚠️ Couplé avec item 12 (templates email dynamiques) — si on rend tout dynamique, cette uniformisation devient un attribut du template, pas du code.

---

### 11. Site vitrine — bouton "Formations suivies" dans la barre de navigation
**Demande Florence :** dans la barre de navigation du site (en haut, là où on a "Cours particuliers / Accompagnement / Établissements & associations"), ajouter à **gauche** de "Cours particuliers" un bouton **"Formations suivies"** qui mène à la page `/formations`.

**État actuel du code :**
- [components/Nav.tsx:36-69](components/Nav.tsx) — `<HStack>` avec 3 boutons : Cours particuliers, Accompagnement, Établissements & associations. Ces 3 boutons utilisent `onServiceClick(...)` pour scroller vers la section services de la page d'accueil.
- La page `/formations` existe : [app/formations/page.tsx](app/formations/page.tsx).

**Stratégie pressentie :**
- Avant le premier `<Button>` (ligne 39), ajouter un `<Link href="/formations">` Chakra qui ouvre `/formations` (pas un scroll). Style identique aux autres boutons.
- Texte : "Formations suivies".
- ⚠️ Sur la page `/formations`, garder le bouton retour vers `/` qui existe déjà (cf [app/formations/page.tsx](app/formations/page.tsx)).
- Le bouton ne doit PAS appeler `onServiceClick` (qui ne fonctionne que sur la home).

---

### 12. 🔨 GROS CHANTIER — Éditeur de templates emails dans l'admin
**Demande Florence :** ajouter un onglet dans l'admin (en-dessous de "Formations") qui permet à Florence de modifier **tous nos templates d'emails**. Tous les emails sortants doivent devenir dynamiques. Attention à ne rien casser.

**Scope confirmé avec Thomas (call 28/05) :** TOUS les emails sortants, soit ~13 templates :
1. **Contact** (notif Florence) — [app/api/contact/route.ts](app/api/contact/route.ts)
2. **Preparation RDV1** — [app/api/procedures/preparation-rdv1/route.ts](app/api/procedures/preparation-rdv1/route.ts)
3. **Recueil-informations** (envoi initial) — [app/api/procedures/recueil-informations/route.ts](app/api/procedures/recueil-informations/route.ts)
4. **Contractualisation particulier** — [app/api/procedures/contractualisation-particulier/route.ts](app/api/procedures/contractualisation-particulier/route.ts)
5. **Contractualisation école** — [app/api/procedures/contractualisation-ecole/route.ts](app/api/procedures/contractualisation-ecole/route.ts)
6. **Envoi CV/Casier** — [app/api/procedures/envoi-cv-casier/send-email/route.ts](app/api/procedures/envoi-cv-casier/send-email/route.ts)
7. **Souhait renouvellement** (lancement) — [app/api/procedures/souhait-renouvellement/route.ts](app/api/procedures/souhait-renouvellement/route.ts)
8. **Renouvellement** (formulaire rempli, accusé) — [app/api/formulaire/renouvellement/route.ts](app/api/formulaire/renouvellement/route.ts)
9. **Cron renouvellement envoi** (déclenchement auto) — [app/api/cron/renouvellement-envoi/route.ts](app/api/cron/renouvellement-envoi/route.ts)
10. **Cron renouvellement relance** — [app/api/cron/renouvellement-relance/route.ts](app/api/cron/renouvellement-relance/route.ts)
11. **Cron fin de contrat relance** — [app/api/cron/fin-de-contrat-relance/route.ts](app/api/cron/fin-de-contrat-relance/route.ts)
12. **Fin de contrat** (lancement) — [lib/fin-de-contrat.ts](lib/fin-de-contrat.ts)
13. **Récap heures réalisées** — [app/api/heures-realisees/recap-email/route.ts](app/api/heures-realisees/recap-email/route.ts)

**Architecture cible :**
- Table Supabase `email_templates(key text PK, name text, subject text, html text, variables jsonb, updated_at timestamptz)` — `variables` documente les placeholders supportés (ex: `{{firstName}}`, `{{lien}}`, `{{moisAnnee}}`).
- Page admin `/admin/email-templates/page.tsx` : liste des 13 templates avec nom lisible.
- Page édition `/admin/email-templates/[key]/page.tsx` : édition `subject` + `html` (textarea ou éditeur HTML simple comme [react-quill](https://www.npmjs.com/package/react-quill) ou TipTap), avec preview live et liste des variables supportées.
- Helper `lib/email-templates.ts` : `getTemplate(key)` qui fetch en DB, `renderTemplate(key, variables)` qui fait la substitution `{{var}} → value`.
- Refactor des 13 routes API ci-dessus pour appeler `renderTemplate(key, {...})` au lieu d'avoir le HTML en dur.

**Migration via `mcp__supabase__apply_migration` (name: `create_email_templates`) :**
```sql
CREATE TABLE IF NOT EXISTS email_templates (
  key text PRIMARY KEY,
  name text NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);
-- Seed initial avec les 13 templates HTML actuels (à copier depuis les routes)
-- Le seed sera fait via mcp__supabase__execute_sql, 1 INSERT par template
```
→ Après création, lancer `mcp__supabase__get_advisors` pour les pbs RLS/perf.

**Stratégie pressentie (phases) :**
1. **Phase 1 — Inventaire des variables** : pour chaque route, recenser les variables utilisées (`recipientName`, `formUrl`, `moisLabel`, `clientName`, `total`, etc.) → produire le `variables` jsonb par template.
2. **Phase 2 — Modèle DB + seed** : créer la table + seed initial à l'identique du HTML actuel (zéro régression).
3. **Phase 3 — Helper `renderTemplate`** : substitution `{{var}}` avec échappement HTML par défaut + variante `{{{var}}}` pour HTML brut (style Mustache/Handlebars). Tests unitaires.
4. **Phase 4 — Refactor des 13 routes** une par une, en remplaçant le HTML inline par `await renderTemplate('key', {...})`. À chaque template refactoré, tester l'envoi en réel (Brevo) pour vérifier le rendu.
5. **Phase 5 — Admin UI** : liste + édition + preview live. Bouton "Restaurer la version par défaut" qui re-seed depuis un fichier `lib/email-templates-defaults.ts`.
6. **Phase 6 — Auth/RLS** : seul Florence peut éditer. RLS Supabase sur la table.

**Garde-fous (attention à ne rien casser) :**
- ⚠️ **TESTER CHAQUE TEMPLATE** après refactor : envoyer un email en réel via une route de test ou en lançant la procédure correspondante.
- ⚠️ **Variables manquantes** : si Florence supprime une variable du template, `renderTemplate` doit la remplacer par `''` silencieusement (ne pas crasher).
- ⚠️ **Variables nouvelles** : Florence ne peut pas ajouter une variable inconnue (elle ne sera pas remplacée). Documenter clairement la liste des variables supportées par template.
- ⚠️ **HTML cassé** : valider que le HTML reste un email valide. Mettre une preview live pour qu'elle voie en temps réel.
- ⚠️ **Rollback facile** : garder les HTML défaut en code (`lib/email-templates-defaults.ts`) pour pouvoir restaurer si elle casse un template.

**Couplages :**
- Item 10 (uniformiser salutations) → devient un simple changement de template via cet onglet.
- Item 7 (mention "des mois précédents" dans récap) → idem.
- Préférence : faire l'item 12 EN PREMIER pour les items 7 et 10, sinon on fait le boulot deux fois.

---

## Backoffice / Contractualisation
- [x] Téléchargement du contrat signé (PDF) - bouton dans l'admin (fetch live DocuSeal)
- [x] Preview embed du PDF dans la modale de lancement de contractualisation
- [x] Tester avec une autre adresse mail pour vérifier le fonctionnement des emails de signature

## Site vitrine - Contenu & UX
*(toutes les tâches ci-dessous sont terminées - section conservée pour mémoire)*

## Avis Google
- [x] **Avis Google** - collés manuellement via le back-office (`/admin/avis`), stockés dans Supabase (`google_reviews`), affichés en carousel sur la home

## Référencement (SEO)
- [x] Métadonnées enrichies (`app/layout.tsx`), sitemap (`app/sitemap.ts`), robots (`app/robots.ts`), JSON-LD LocalBusiness
- [x] Soumettre à Google Search Console (vérification du domaine + sitemap)
- [x] Search Console connecté
- [x] Guide Search Console pour Florence

## Site vitrine - Évolutions ✅ DONE
- [x] **Carousel défilant pour les matières** (carousel auto-rotatif 9s/slide avec dots cliquables)
- [x] **Section "Découvrez qui je suis"** : vidéo placeholder retirée, surtitre "En vidéo" -> "À propos"
- [x] **Page "A Rythme Ethic se forme pour mieux vous accompagner"** (table + admin CRUD + export PDF + page publique + bouton)

## Authentification admin ✅ DONE
- [x] **Mot de passe oublié** : `/admin/forgot-password` + `/admin/reset-password`

## Emails - UX ✅ DONE
- [x] Footer cliquable vers la home dans tous les emails
- [x] Email avis Google : phrase bouche-à-oreille ajoutée

## DocuSeal
- [x] Désactivation des emails automatiques DocuSeal vérifiée

## Autonomie de Florence — Édition du site vitrine via /admin 🟡 À FAIRE

**Décision prise** : étendre l'interface `/admin` existante avec une section "Site vitrine" (Florence n'est pas tech du tout, donc pas de Git/GitHub/MDX/CMS tiers). Elle se connecte avec son compte admin existant et édite les textes/images via des formulaires Chakra UI classiques (comme la page `/admin/avis` ou `/admin/formations` qu'on a déjà).

### Architecture cible
- Stockage : table Supabase (probablement une seule table `site_content` clé/valeur, ou tables dédiées par section)
- Stockage images : bucket Supabase `client-files` (déjà existant) ou nouveau bucket public `site-content`
- Lecture côté public : `app/page.tsx` (et autres pages vitrine) lit depuis Supabase au build/SSR plutôt qu'avoir du contenu en dur
- Lecture côté admin : nouvelles pages `/admin/site/...` avec formulaires d'édition
- Auth : RLS Supabase + auth admin existante (cf `lib/hooks/useAuth.ts`)

### Sections candidates à rendre éditables (à confirmer avec Florence)
Inventaire actuel de `app/page.tsx` (942 lignes) :
1. **Hero** (ligne ~194) — titre principal + sous-titre + CTA
2. **Présentation Florence** (ligne ~292) — texte "À propos" + photo
3. **Services** (lignes ~390-558) — 3 cartes : Cours particuliers / Accompagnement / Établissements + leurs sous-textes
4. **Matières enseignées** — carousel défilant (constante `MATIERES` à identifier)
5. **Process** — `PARTICULIER_STEPS` et `ECOLE_STEPS` (lignes 22-42)
6. **Témoignages** — `<GoogleReviewsCarousel />` (déjà géré via `/admin/avis` ✅)
7. **Footer / Contact** — coordonnées + horaires

Autres pages potentiellement à éditer :
- `app/formations/page.tsx` (déjà géré via `/admin/formations` ✅)
- `app/mentions-legales/`, `app/politique-confidentialite/` — probablement à laisser en dur (rare modifs)

### Stratégie d'implémentation recommandée
1. **Phase 1 — Scope** : valider avec Florence quelles sections elle veut vraiment modifier (ne pas tout rendre dynamique). Probable MVP : Hero + Présentation + Services + Process steps.
2. **Phase 2 — Modèle de données** : table unique `site_content` avec colonnes `(section text PK, content jsonb, updated_at)`. Chaque section a un schéma JSON typé côté TS (`types/site-content.ts`).
3. **Phase 3 — Admin UI** : `/admin/site/page.tsx` (liste des sections) → `/admin/site/[section]/page.tsx` (édition). Réutiliser le pattern Chakra Form de `/admin/avis` et `/admin/formations`.
4. **Phase 4 — Lecture publique** : modifier `app/page.tsx` pour passer en RSC (Server Component) et fetcher le contenu depuis Supabase. Garder `revalidate: 60` pour ne pas exploser le SSR. Fallback sur les valeurs actuelles si la row est manquante (pas de régression).
5. **Phase 5 — Migration** : seed initial avec les valeurs actuelles hardcodées pour que Florence ait quelque chose à éditer.

### Prérequis techniques
- Stack existante : Next.js App Router, Chakra UI, Supabase, auth admin Supabase
- Patterns à réutiliser : voir [app/admin/avis/page.tsx](app/admin/avis/page.tsx) et [app/admin/formations/page.tsx](app/admin/formations/page.tsx) pour le pattern CRUD + auth admin
- Migration SQL : ajouter dans [database/schema.sql](database/schema.sql), créer un fichier de migration dans `database/migrations/` si on garde cette convention
- Upload image : route `/api/storage/upload` existe déjà (cf usage dans recueil-informations)

### Mot-clé prochaine session
> "On attaque l'autonomie Florence" ou "On fait le CMS admin"
> → reprendre depuis la **Phase 1 (validation du scope avec Florence)** ou directement implémenter le MVP si Florence valide le scope par défaut (Hero + Présentation + Services + Process).

## Contrats - mise à jour ✅ DONE
- [x] **Nouvelle version du contrat professionnel (école)** intégrée (Article 11 "Référence client" ajouté, articles renumérotés)
- [x] **PDF contrat particulier** : saut de page entre sections 4 et 5

## Contrats - nommage ✅ DONE
- [x] **Renommé partout** : `Contrat - <école|élève> - <année scolaire>` (filename PDF, écran signature DocuSeal, liste admin, téléchargement signé)

## Procédure "Fin de contrat" (Particulier) ✅ DONE
- [x] **Créer la procédure de fin de contrat** - 2 modes de lancement :
  - **A. Manuel** : bouton "Fin de contrat" dans la fiche client → modale (comme les autres procédures) pour choisir le destinataire de l'email
  - **B. Automatique** : déclenchée si la procédure "Souhait de renouvellement" reçoit une réponse "Non" (pas de souhait de renouveler)
  - Étape 1 : email "Fin de contrat" envoyé au destinataire, contenu :
    - "Bonjour [prénom], l'accompagnement de votre enfant touche à sa fin."
    - Lien CESU pour démarches de fin de contrat : https://www.cesu.urssaf.fr/info/accueil/question-du-moment/comment-gerer-la-fin-de-contrat.html
    - Demande de joindre les 3 documents via un formulaire d'upload (lien tokenisé) :
      - Reçu pour solde de tout compte
      - Attestation employeur (= Attestation simplifiée des particuliers employeurs)
      - Certificat de travail
    - Mention que Florence retournera les documents signés
    - Phrase de remerciement + mention que Florence fait des sessions de révisions Brevet/BAC ponctuelles
  - Étape 2 : formulaire d'upload côté client (route `/formulaire/fin-de-contrat/[token]`) — 3 emplacements pour les 3 documents
  - Étape 3 : **relance auto tous les 3 jours à 18h** tant que les 3 documents ne sont pas uploadés (cron, comme renouvellement-relance)
  - **PAS d'envoi de questionnaire de satisfaction** ici
  - **PAS d'envoi du mail avis Google** ici (déjà fait dans la procédure renouvellement avant cette étape, on évite le doublon)
  - L'envoi du récap des heures n'est PAS automatique dans cette procédure (le récap est déjà déclenchable manuellement depuis l'admin via `app/api/heures-realisees/recap-email`)

## Mise en ligne sur arythmeethic.fr
> Contexte : site Next.js déployé sur Vercel (auto-deploy depuis main). Florence a un compte Microsoft 365
> Florence a le compte `florence.louazel@arythmeethic.fr` dans Supabase auth.users.
> Les emails transactionnels sont envoyés via Brevo - la variable BREVO_SENDER_EMAIL est utilisée dans 10 routes API.
> Les contrats sont générés et envoyés pour signature via DocuSeal (app.docuseal.com, clé API dans DOCUSEAL_API_KEY).
> L'hébergement reste sur Vercel - le registrar sert uniquement à gérer le DNS.

### Étape 1 - Acheter le domaine
- [x] Acheter `arythmeethic.fr` sur OVH ✅

### Étape 2 - DNS (registrar OVH)
- [x] Enregistrement `A` : `@` → `76.76.21.21` ✅
- [x] Enregistrement `CNAME` : `www` → `cname.vercel-dns.com` ✅
- [x] Enregistrements Microsoft 365 (MX, SPF, CNAME Autodiscover) ✅
- [x] Enregistrements Brevo (DKIM x2, SPF, DMARC) ✅

### Étape 3 - Vercel ✅
- [x] `arythmeethic.fr` et `www.arythmeethic.fr` ajoutés ✅
- [x] `BREVO_SENDER_EMAIL` → `florence.louazel@arythmeethic.fr` ✅

### Étape 4 - Microsoft 365 ✅
- [x] Adresse `florence.louazel@arythmeethic.fr` créée + DNS validé ✅

### Étape 5 - Brevo ✅
- [x] Adresse expéditeur mise à jour → `florence.louazel@arythmeethic.fr` ✅

### Étape 6 - DocuSeal ✅
- [x] Pas d'email à configurer ✅

### Étape 6b - OVHcloud ✅
- [x] DNS vérifié et à jour ✅

### Étape 7 - Supabase ✅
- [x] Nouvel user `florence.louazel@arythmeethic.fr` créé avec rôle admin ✅
- [x] Ancien user supprimé ✅
- [x] Site URL → `https://arythmeethic.fr` mis à jour dans Authentication → URL Configuration ✅
