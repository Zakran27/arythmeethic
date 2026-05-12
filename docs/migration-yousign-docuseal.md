# Migration Yousign → DocuSeal

## Contexte

Yousign exige un plan à ~106 €/mois pour accéder à l'API. DocuSeal Pro coûte 20 €/mois + 0,20 €/document généré, ce qui est bien plus adapté à l'usage du site.

## Ce qui a changé

### Fichiers modifiés

- `app/api/procedures/contractualisation-ecole/route.ts`
- `app/api/procedures/contractualisation-particulier/route.ts`

### Ce qui n'a pas changé

- Les générateurs PDF (`lib/pdf-contract-generator.ts`, `lib/pdf-contract-particulier-generator.ts`) — inchangés
- Les générateurs PDF (`lib/pdf-contract-generator.ts`, `lib/pdf-contract-particulier-generator.ts`) — inchangés
- La base de données : la colonne `yousign_procedure_id` a été renommée en `docuseal_submission_id` (migration appliquée), `yousign_file_id` supprimée

### Résumé technique

L'ancienne intégration Yousign nécessitait 4 appels API (créer la demande → uploader le document → ajouter signataire × 2 → activer). DocuSeal remplace tout ça par **un seul appel** `POST /submissions/pdf` avec le PDF en base64, les signataires et les positions de signature.

Les coordonnées de signature sont converties :
- pdf-lib utilise un repère **bas-gauche** (y=0 en bas)
- DocuSeal utilise un repère **haut-gauche** (y=0 en haut)
- Formule : `y_docuseal = 1 - (y_pdflib / PAGE_H) - FIELD_H`

---

## Variables d'environnement — Actions requises

### Dans Vercel (Project Settings → Environment Variables)

1. **Supprimer** `YOUSIGN_API_KEY`
2. **Supprimer** `YOUSIGN_API_URL`
3. **Ajouter** `DOCUSEAL_API_KEY` = *(clé API DocuSeal Pro, disponible dans app.docuseal.eu → Settings → API)*

### Dans `.env.local`

```bash
# Supprimer :
# YOUSIGN_API_KEY=...
# YOUSIGN_API_URL=...

# Ajouter :
DOCUSEAL_API_KEY=your_docuseal_api_key
```

---

## Vérification

1. Ajouter `DOCUSEAL_API_KEY` dans `.env.local`
2. Lancer `npm run dev`
3. Ouvrir un client (École ou Particulier) dans l'admin et lancer la procédure de contractualisation
4. Vérifier dans le dashboard DocuSeal qu'une soumission apparaît avec 2 signataires et le PDF joint
5. Les deux signataires doivent recevoir un email d'invitation à signer
6. Vérifier que les cases de signature sont bien positionnées en bas de la dernière page du contrat

> **Note** : Si les signatures apparaissent à une position verticale incorrecte, ajuster la constante `FIELD_H` dans les routes (valeur actuelle : `0.09`). La direction de l'axe Y de DocuSeal peut nécessiter un ajustement lors des premiers tests.
