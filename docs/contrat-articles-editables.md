# Contrat École : modification des articles avant envoi

Depuis la popup **Contractualisation** (fiche client École, admin), le texte de chaque
article du contrat de prestation peut être modifié avant la prévisualisation du PDF et
l'envoi pour signature DocuSeal.

## Comment ça marche

- `lib/contract-ecole-articles.ts` contient le texte par défaut des 16 articles, généré à
  partir de la fiche client (tarif horaire, année scolaire, volume horaire, module...).
- La popup charge ces textes via `GET /api/procedures/contractualisation-ecole/articles`,
  puis envoie uniquement les **articles modifiés** (`articleOverrides`, JSON) à l'aperçu
  (`.../preview`) et à l'envoi (`.../contractualisation-ecole`).
- Les articles non modifiés restent donc toujours synchronisés avec la fiche client : si le
  tarif change, l'article 6 se met à jour tout seul.
- Les modifications valent pour l'envoi en cours uniquement (rien n'est stocké en base) ;
  les identifiants des articles modifiés sont tracés dans `audit_log`.

## Mise en forme du texte (éditeur)

Le texte revient à la ligne automatiquement, la mise en page du PDF ne peut donc pas être
cassée. Quelques marqueurs en début de ligne :

| Saisie      | Rendu dans le PDF          |
| ----------- | -------------------------- |
| `**Texte**` | ligne en gras (sous-titre) |
| `- Texte`   | puce                       |
| `!Texte`    | ligne en rouge             |
| `  Texte`   | ligne indentée             |
| ligne vide  | saut de paragraphe         |

Vider le titre **et** le texte d'un article le retire du contrat (attention à la
numérotation des articles suivants, qui fait partie de leur titre).

## Fichiers concernés

- `lib/contract-ecole-articles.ts` — textes par défaut + application des modifications
- `lib/pdf-rich-text.ts` — mise en forme et retour à la ligne automatique dans le PDF
- `lib/pdf-contract-generator.ts` — génération du PDF (préambule, articles, signatures)
- `app/api/procedures/contractualisation-ecole/articles/route.ts` — textes par défaut
- `app/admin/clients/[id]/page.tsx` — éditeur dans la popup de contractualisation
