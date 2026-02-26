# TODO — A Rythme Ethic

> Projet Next.js 15 / Chakra UI v2 / Supabase / Yousign v3 / Brevo
> Stack : `app/admin/clients/[id]/page.tsx` (grosse page client), routes API dans `app/api/procedures/`, générateurs PDF dans `lib/`, types dans `types/index.ts`.

---

## 1. Contrats PDF — Problèmes communs aux deux types

### 1a. Accents dans les PDFs
Les générateurs utilisent `StandardFonts.Helvetica` (pdf-lib) qui ne supporte pas les caractères accentués. Le texte généré affiche des `?` ou des caractères manquants à la place des accents.

**Fix :** Embarquer une police TTF avec support Unicode via `fontkit`. Installer `@pdf-lib/fontkit`, télécharger une police libre (ex: Roboto ou NotoSans), la stocker dans `public/fonts/`, l'embarquer dans les générateurs :
```ts
import fontkit from '@pdf-lib/fontkit';
pdfDoc.registerFontkit(fontkit);
const fontBytes = await fetch('/fonts/Roboto-Regular.ttf').then(r => r.arrayBuffer());
const font = await pdfDoc.embedFont(fontBytes);
```
Idem pour le `fontBold`. Appliquer dans `lib/pdf-contract-generator.ts` ET `lib/pdf-contract-particulier-generator.ts`.

### 1b. Ajouter Florence comme 2ème signataire Yousign
Actuellement on n'ajoute qu'un seul signataire (le client/parent/jeune). Il faut ajouter Florence en second signataire sur chaque demande de signature.

**Email Florence :** `florence.louazel@ARythmeEthic.onmicrosoft.com`

**Fix dans les deux routes** (`contractualisation-ecole/route.ts` ET `contractualisation-particulier/route.ts`) :
- Après `addSigner(...)` pour le client, appeler `addSigner(...)` une seconde fois pour Florence
- Créer un 2ème champ signature dans le PDF pour Florence (côté gauche : "Signature salarié(e)") — les coordonnées sont déjà dans le PDF, il faut juste les retourner depuis le générateur
- Modifier les générateurs pour retourner `{ signaturePage, signatureX, signatureY, florenceSignatureX, florenceSignatureY }` (Florence signe dans la colonne gauche, sous "Signature salarie :")

---

## 2. Contrat École (`lib/pdf-contract-generator.ts`)

### 2a. Ajustement de la position de signature
Le champ signature Yousign est actuellement positionné trop haut. Descendre `signatureY` de ~30 points dans le générateur (réduire le `sigLabelY - 55` à `sigLabelY - 80` ou tester).

### 2b. Article 3 en annexe + upload dans la modale
L'article 3 du contrat (prestations, modules, tarifs) doit être une **annexe séparée** uploadée par l'utilisateur au moment de lancer la contractualisation.

**Fix :**
- Dans la modale contractualisation école (`page.tsx`) : ajouter un `<Input type="file" accept=".pdf" />` pour uploader "Annexe Article 3"
- Dans `contractualisation-ecole/route.ts` : recevoir le fichier (via `FormData` au lieu de JSON), uploader l'annexe comme un 2ème document signable dans Yousign (`/signature_requests/{id}/documents` une 2ème fois)
- Le tarif (voir 2c) peut être inclus dans cette annexe

### 2c. Demander le tarif dans la modale
Ajouter un champ "Tarif horaire (€)" dans la modale de contractualisation école. Ce tarif remplace le montant actuellement fixe dans l'Article 7 du PDF.

**Fix :** Ajouter `tarif` au body envoyé à l'API, le passer au générateur, l'utiliser dans l'Article 7 (`lib/pdf-contract-generator.ts` ligne ~Article 7).

---

## 3. Contrat Particulier (`lib/pdf-contract-particulier-generator.ts`)

### 3a. Supprimer la durée de période d'essai
La section "Période d'essai" (§2 du contrat) doit être retirée complètement.

**Fix :**
- Supprimer le champ `dureePeriodeEssai` de l'interface `ContractParticulierData`
- Supprimer la section dans le PDF (bloc `write("Periode d'essai"...)`)
- Supprimer le state `contractDureePeriodeEssai` dans `page.tsx`
- Supprimer le champ correspondant dans la modale
- Supprimer du body de la requête API dans le handler et dans la validation de la route

### 3b. Préremplir le salaire horaire depuis la fiche client
Dans la modale contractualisation particulier, le champ "Salaire horaire net" doit être prérempli avec la valeur stockée sur le client.

**Prérequis :** Ajouter un champ `tarif_horaire` (numeric) sur le client :
- Migration Supabase : `ALTER TABLE clients ADD COLUMN tarif_horaire numeric(6,2);`
- `types/index.ts` : ajouter `tarif_horaire?: number` au type `Client`
- `NewClientModal.tsx` : ajouter le champ dans la section Particulier
- `EditClientModal.tsx` : idem
- Affichage sur la fiche client (`page.tsx`)

**Préremplissage :** Dans le state initial de la modale, initialiser `contractSalaireHoraireNet` avec `client.tarif_horaire?.toString() ?? ''`.

### 3c. Ajustement de la position de signature
Le champ signature Yousign est trop haut. Descendre la signature en modifiant le calcul dans le générateur (`sigLabelY - 55` → tester `-80` ou `-100`).

---

## 4. Déclaration des heures (clients Particulier)

> Table Supabase : `heures_realisees` (id, client_id, mois, heures, tarif_horaire, km, bareme_km, created_at). Modal : `app/admin/clients/[id]/HeuresRealiséesModal.tsx`. API : `app/api/heures-realisees/route.ts`.

### 4a. Ajouter distance domicile→cours sur la fiche client
Pour éviter de ressaisir les km à chaque déclaration, stocker la distance entre chez le client et l'adresse du cours.

**Fix :**
- Migration : `ALTER TABLE clients ADD COLUMN distance_km numeric(5,1);`
- `types/index.ts` : `distance_km?: number`
- `NewClientModal.tsx` + `EditClientModal.tsx` : ajouter champ "Distance domicile → cours (km)" dans la section Particulier
- Afficher sur la fiche client

### 4b. Modale de déclaration : nb de déplacements × distance stockée
Au lieu de saisir les km directement, saisir le "nombre de déplacements réalisés". Les km se calculent automatiquement.

**Fix dans `HeuresRealiséesModal.tsx` :**
- Remplacer le champ `km` par `nb_deplacements` (number)
- Afficher en lecture seule : `km = nb_deplacements × client.distance_km`
- Passer `km` calculé à l'API (pas `nb_deplacements`)
- Pré-remplir `tarif_horaire` avec `client.tarif_horaire`

### 4c. Ajouter "temps à reporter"
Ajouter un champ optionnel pour les minutes/heures non facturables reportées au mois suivant.

**Fix :**
- Migration : `ALTER TABLE heures_realisees ADD COLUMN temps_a_reporter numeric(4,2) DEFAULT 0;`
- Ajouter champ "Temps à reporter (h)" dans `HeuresRealiséesModal.tsx`
- L'afficher dans le tableau de la fiche client

### 4d. Bouton "Déclarer heures" dans la liste clients
Sur `app/admin/clients/page.tsx`, ajouter un bouton "Déclarer heures" qui ouvre un flow multi-étapes :
- **Étape 1 :** Liste des clients Particulier avec cases à cocher (sélection multiple)
- **Étape 2 :** Pour chaque client sélectionné, formulaire de déclaration (heures, nb_déplacements, tarif pré-rempli)
- **Étape 3 :** Bouton "Envoyer récap" → envoyer un email récapitulatif aux parents sélectionnés (via Brevo)

### 4e. Bouton global modifier barème km
Ajouter un bouton (dans la liste clients ou dans une future page paramètres) pour modifier le barème kilométrique global.

**Deux options :**
- Option simple : stocker dans une table `settings` (`key/value`) et mettre à jour via API
- Option rapide : bouton qui met à jour `bareme_km` sur tous les clients d'un coup via une requête Supabase

---

## 5. Clients professionnels (École) — Données

### 5a. Renommer "date max de paiement" → "date max d'envoi de la facture"
Dans `EditClientModal.tsx` et sur la fiche client, renommer le label du champ `ecole_facturation_date_max_paiement`.

### 5b. Simplifier les champs de facturation
Remplacer les champs `ecole_facturation_type` et `ecole_facturation_moment_paiement` par un seul champ `ecole_periode_facturation` avec deux options : `"fin_mois_en_cours"` ou `"mois_suivant"`.

**Fix :**
- Migration : ajouter colonne, migrer les données existantes, supprimer les anciennes
- Mettre à jour `types/index.ts`, `EditClientModal.tsx`, affichage fiche client

### 5c. Recueil des informations — Ajouter sections notes + facturation
Dans le formulaire de recueil des infos envoyé aux établissements (route `preparation-rdv1` ou équivalent école), ajouter :
- Section "Modalités de facturation" (date max, période, conditions)
- Section "Saisie des notes élèves" (responsable, accès)

---

## 6. Site vitrine (`app/page.tsx`)

### 6a. Corrections texte
- **"Enseignante & formatrice"** → remplacer par **"Formatrice"** uniquement (badge hero + tout autre occurrence)
- **Enseignement supérieur** → ajouter `"Modules de management"` dans la liste des prestations
- **Photo "Accompagnement privé"** (DSC08964) : `objectPosition="center top"` → tester `"center 30%"` pour cadrer plus bas

### 6b. Simplifier les CTA
Trop de boutons "contact". Supprimer les boutons secondaires "Je suis un établissement" / "Je représente un établissement" dans le hero et dans la section CTA. Garder uniquement **un bouton "Prendre contact"** qui ouvre le modal avec choix du type.

### 6c. Remplacer "Ma pédagogie" par section vidéo
Supprimer la section "Ma pédagogie" (photo + texte + citation).
La remplacer par une section **"Découvrez qui je suis"** avec :
- Un bouton ancré dans la page (dans le hero ou autre) : `<a href="#decouvrir">` qui scrolle vers la section
- Un embed vidéo (URL à fournir — YouTube ou autre). Placeholder `<Box>` en attendant.

### 6d. Carrousel avis Google
Ajouter une section avec les avis Google en carrousel.
- **Option simple :** avis saisis manuellement dans un tableau `reviews[]` dans le code
- **Option avancée :** Google Places API (nécessite clé API `GOOGLE_PLACES_API_KEY` dans `.env`)
- UI : carrousel avec framer-motion ou `embla-carousel-react` (à installer si besoin)

### 6e. Formulaire "Prendre contact" — Particulier
Dans `components/ContactModal.tsx` :
- Renommer l'option `"Parent"` → `"Parent d'enfant mineur"`
- Ajouter une case à cocher : **"Démarche volontaire du jeune"** (visible uniquement pour les types Particulier)

**Champ DB à ajouter :**
- Migration : `ALTER TABLE clients ADD COLUMN demarche_volontaire boolean DEFAULT false;`
- `types/index.ts` : `demarche_volontaire?: boolean`
- `ContactModal.tsx` : checkbox + envoyer via le formulaire de contact (stocker en DB)
- `NewClientModal.tsx` + `EditClientModal.tsx` : checkbox dans section Particulier
- Fiche client (`page.tsx`) : afficher la valeur

---

## 7. Yousign — Fiabilité

### 7a. Vérification dashboard Yousign
Si le toast est vert mais que l'email n'arrive pas : vérifier dans le **dashboard Yousign sandbox** que la signature request est bien créée. L'env sandbox ne délivre pas les emails aux adresses réelles — basculer sur la clé production (`YOUSIGN_API_URL=https://api.yousign.app/v3`) pour les tests réels.

### 7b. Gap silencieux DB post-Yousign
Après l'activation Yousign, si la mise à jour du statut en DB (`SIGN_REQUESTED`) échoue, elle est actuellement silencieuse (juste `console.error`). La procédure reste en `DRAFT` dans l'UI malgré un toast vert.
→ À traiter : soit remonter un toast d'avertissement, soit inclure dans la même transaction.

---

## 8. Fichiers de référence
Les templates PDF/Excel de référence sont dans `/templates/` à la racine du projet :
- `FORMULAIRE_Cours_particuliers.pdf` — formulaire contrat particulier
- `FORMULAIRE_Pro.pdf` — formulaire contrat école
- `Exemple recap annuel.pdf` — exemple récapitulatif annuel heures
- `Temps de cours particuliers 2025-2026.xlsx` — tableau de suivi des heures
