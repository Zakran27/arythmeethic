import { Client } from '@/types';

/**
 * Articles du contrat de prestation « École / client pro ».
 *
 * Le texte par défaut est généré ici à partir de la fiche client, puis peut être
 * modifié article par article depuis l'interface d'administration avant envoi
 * pour signature. Les articles non modifiés restent toujours synchronisés avec
 * les données du client (tarif, année scolaire, volume horaire...).
 */

export interface ContractArticle {
  /** Identifiant stable, utilisé pour rattacher une modification à un article */
  id: string;
  title: string;
  /** Corps de l'article (voir lib/pdf-rich-text.ts pour la mise en forme) */
  body: string;
}

export interface ContractArticleOverride {
  id: string;
  title?: string;
  body?: string;
}

export interface ContractEcoleArticlesInput {
  client: Client;
  anneeScolaire: string;
  tarifHoraireHT?: number;
}

export const DEFAULT_TARIF_HORAIRE_HT = 44.8;
export const DEFAULT_FRAIS_KM = 0.636;

export function buildContractEcoleArticles({
  client,
  anneeScolaire,
  tarifHoraireHT = DEFAULT_TARIF_HORAIRE_HT,
}: ContractEcoleArticlesInput): ContractArticle[] {
  const formationTypeLabel =
    client.ecole_formation_type === 'initiale_en_alternance'
      ? 'Formation initiale / en alternance'
      : client.ecole_formation_type === 'continue'
        ? 'Formation continue'
        : '';

  const kmPrice = client.ecole_frais_km_prix
    ? Number(client.ecole_frais_km_prix)
    : DEFAULT_FRAIS_KM;

  const objetLines = [
    `  Enseignement dont le thème est : ${client.ecole_module_nom || ''}`,
    formationTypeLabel ? `  Type de formation : ${formationTypeLabel}` : null,
    `  Période : année scolaire ${anneeScolaire} à compter du 1er septembre et jusqu'au 31 août de l'année suivante`,
    `  Volume horaire de face à face pédagogique : ${client.ecole_module_heures || ''} heures`,
    `  Nombre prévisionnel d'apprenants : ${client.ecole_groupe_taille || ''}`,
    `  Intervenant(e) : Florence LOUAZEL - Diplôme : Diplôme d'ingénieur généraliste – ECAM Louis de Broglie`,
  ].filter(Boolean) as string[];

  return [
    {
      id: 'article-1',
      title: 'Article 1 : Nature du contrat',
      body: [
        "Le présent contrat est conclu dans le cadre d'une prestation de formation réalisée par le sous-traitant au bénéfice du donneur d'ordre.",
        "Le sous-traitant intervient en toute indépendance, sans exclusivité, et organise librement ses méthodes pédagogiques dans le respect du cadre fixé par le donneur d'ordre.",
      ].join('\n'),
    },
    {
      id: 'article-2',
      title: 'Article 2 : Objet du contrat',
      body: [
        ...objetLines,
        '',
        "!Toute réévaluation fera l'objet d'un avenant précisant le nouveau tarif horaire HT et prendra effet après signature des deux parties.",
      ].join('\n'),
    },
    {
      id: 'article-3',
      title: 'Article 3 : Durée du contrat',
      body: [
        "Le présent contrat est strictement limité à la prestation de formation visée à l'article 2.",
        "Il cesse de plein droit à son terme. Le présent contrat ne fait l'objet d'aucune reconduction tacite.",
      ].join('\n'),
    },
    {
      id: 'article-4',
      title: 'Article 4 : Obligations du sous-traitant',
      body: [
        "Le sous-traitant s'engage à :",
        "  - Communiquer au donneur d'ordre une copie de son attestation d'immatriculation au registre national des entreprises ;",
        '  - Préparer les cours ;',
        "  - Animer les cours dans le respect des objectifs fixés par le donneur d'ordre et le syllabus ;",
        '  - Mettre à disposition des apprenants les supports pédagogiques via une plateforme en ligne ;',
        "  - La validation de la présence des élèves sur l'ERP du donneur d'ordre ;",
        "  - Réaliser les évaluations écrites ou orales selon l'usage dans l'établissement ;",
        "  - Corriger les copies et saisir les notes sur l'ERP du donneur d'ordre.",
        '',
        "Le sous-traitant peut se faire remplacer par un intervenant de qualification équivalente, sous réserve d'information préalable du donneur d'ordre.",
        '',
        "Ces obligations sont exécutées librement par le sous-traitant, sans contrôle hiérarchique ni pouvoir disciplinaire du donneur d'ordre.",
        '',
        "L'utilisation des outils du donneur d'ordre est strictement limitée aux nécessités pédagogiques et administratives de la mission et ne saurait constituer un indice de subordination.",
      ].join('\n'),
    },
    {
      id: 'article-5',
      title: "Article 5 : Obligations du donneur d'ordre",
      body: [
        "Le donneur d'ordre s'engage à :",
        "  - Confier au sous-traitant la formation prévue à l'article 2 ;",
        '  - Prendre en charge la gestion administrative et logistique de la formation ;',
        "  - Transmettre au sous-traitant une copie des questionnaires de satisfaction remplis par les élèves à l'issue de la formation ;",
        "  - Prévenir le sous-traitant au moins 8 jours à l'avance en cas d'annulation ou de report.",
        '',
        "Pour des raisons de contraintes d'organisation, les dates d'intervention peuvent être modifiées selon des modalités convenues et validées par les deux parties.",
        '',
        "Toute annulation moins de 10 jours avant l'intervention donnera lieu à facturation de 25 % des heures prévues si aucun report n'est envisageable. Le report devra intervenir dans un délai maximum de deux (2) mois à compter de la date initialement prévue. À défaut, la facturation prévue s'appliquera.",
      ].join('\n'),
    },
    {
      id: 'article-6',
      title: 'Article 6 : Modalités financières',
      body: [
        `Le sous-traitant percevra une rémunération de ${tarifHoraireHT.toFixed(2)} euros HT par heure de face à face pédagogique.`,
        '',
        `Des frais de déplacement seront appliqués pour ${kmPrice.toFixed(3)} euros/kilomètre.`,
        '',
        "Le sous-traitant s'engage à éditer une facture mensuelle pour les heures réellement effectuées durant le mois, pendant toute la durée du contrat.",
        'Le paiement sera effectué selon les modalités suivantes :',
        '  paiement sous 30 jours à la réception de la facture ;',
        '  paiement par virement.',
        '',
        "En cas de défaut de paiement, des pénalités de retard seront appliquées pour chaque jour de retard (calculées à partir du lendemain de la date de règlement indiquée sur la facture) ainsi qu'une indemnité forfaitaire de recouvrement.",
        "Les pénalités de retard sont calculées au taux de trois (3) fois le taux d'intérêt légal, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 euros, conformément à l'article L.441-10 du Code de commerce.",
      ].join('\n'),
    },
    {
      id: 'article-7',
      title: 'Article 7 : Résiliation anticipée',
      body: [
        "En cas de manquement grave à l'une des obligations contractuelles ou en cas de force majeure dûment reconnue, chaque partie pourra résilier le présent contrat de manière anticipée, par lettre recommandée avec accusé de réception, moyennant un préavis de 2 semaines.",
        "Les prestations effectuées jusqu'à la date de résiliation devront être intégralement réglées. Les sommes déjà perçues par le sous-traitant lui demeureront acquises.",
      ].join('\n'),
    },
    {
      id: 'article-8',
      title: 'Article 8 : Litige',
      body: [
        "En cas de litige relatif à l'interprétation ou l'exécution du présent contrat, les parties s'efforceront de le résoudre à l'amiable. À défaut, le litige sera porté devant les tribunaux compétents du ressort du siège social du sous-traitant.",
      ].join('\n'),
    },
    {
      id: 'article-9',
      title: 'Article 9 : Protection des données personnelles',
      body: [
        "Le sous-traitant s'engage à respecter les obligations issues du Règlement Général sur la Protection des Données (RGPD). Il ne conservera ni n'utilisera les données personnelles auxquelles il pourrait avoir accès en dehors du strict cadre de sa mission.",
      ].join('\n'),
    },
    {
      id: 'article-10',
      title: 'Article 10 : Dispositions diverses',
      body: [
        '  Le présent contrat ne crée entre les parties aucun lien de subordination, le sous-traitant demeurant libre et responsable du contenu de la formation dans le respect du syllabus ;',
        "  Toute modification éventuelle de la présente convention fera l'objet d'un avenant signé par les parties ;",
        "  Le sous-traitant dispose d'une propriété intellectuelle et/ou artistique sur le contenu de sa formation ;",
        "  Le donneur d'ordre bénéficie d'un droit d'usage strictement limité à l'exécution du présent contrat, à l'exclusion de toute exploitation ultérieure.",
      ].join('\n'),
    },
    {
      id: 'article-11',
      title: 'Article 11 : Référence client et utilisation du nom et du logo',
      body: [
        "Le Donneur d'ordre autorise le Prestataire à mentionner sa dénomination sociale et à reproduire son logo à titre de référence client, exclusivement afin d'informer les tiers de l'existence d'une relation contractuelle présente ou passée entre les Parties.",
        '',
        'Cette utilisation est strictement encadrée comme suit :',
        '',
        "**Finalité de l'usage**",
        "L'utilisation du nom et du logo est autorisée uniquement à titre informatif dans les supports de communication du Prestataire dédiés à ses références clients (site internet, propositions commerciales, plaquettes, présentations).",
        '',
        "**Absence d'assimilation à une promotion ou recommandation**",
        "Cette utilisation ne vaut ni partenariat, ni recommandation, ni validation des services du Prestataire par le Donneur d'ordre.",
        '',
        "**Conditions d'utilisation du logo**",
        "Le Prestataire s'engage à :",
        "  - utiliser exclusivement le logo fourni par le Donneur d'ordre ;",
        '  - ne procéder à aucune modification, altération ou ajout de texte ;',
        '  - ne pas mettre le logo en avant par rapport aux autres références clients ;',
        '  - limiter la reproduction à une utilisation raisonnable et proportionnée sur un même support.',
        '',
        '**Usages interdits**',
        "Toute utilisation du nom ou du logo en dehors des cas ci-dessus, notamment sur des produits, campagnes publicitaires, témoignages, études de cas détaillées ou pages dédiées, nécessite l'autorisation écrite préalable du Donneur d'ordre.",
        '',
        '**Durée et retrait**',
        "L'autorisation est accordée pour une durée indéterminée.",
        "Le Donneur d'ordre peut retirer cette autorisation à tout moment par email envoyé à florence.louazel@ARythmeEthic.fr, avec accusé de réception, sous réserve qu'un email de confirmation du Prestataire soit adressé pour valider la réception.",
        "Le Prestataire disposera alors d'un délai de trente (30) jours à compter de la confirmation de réception pour cesser tout usage.",
      ].join('\n'),
    },
    {
      id: 'article-12',
      title: 'Article 12 : Confidentialité',
      body: [
        "Le sous-traitant s'engage à conserver strictement confidentielles toutes les informations, documents et données de toute nature dont il pourrait avoir connaissance dans le cadre de l'exécution du présent contrat, et notamment les informations pédagogiques, administratives, commerciales ou stratégiques du donneur d'ordre.",
        "Cette obligation de confidentialité s'applique pendant toute la durée du contrat et subsiste pendant une durée de cinq (5) ans après son expiration ou sa résiliation.",
        '',
        'Ne sont pas considérées comme confidentielles les informations :',
        '  tombées dans le domaine public sans faute du sous-traitant ;',
        '  déjà connues du sous-traitant avant leur communication ;',
        '  obtenues légalement auprès de tiers.',
      ].join('\n'),
    },
    {
      id: 'article-13',
      title: 'Article 13 : Assurance – Responsabilité civile professionnelle',
      body: [
        "Le sous-traitant déclare être titulaire d'une assurance de responsabilité civile professionnelle couvrant les dommages corporels, matériels et immatériels pouvant résulter de l'exécution de la prestation de formation.",
        "Une attestation d'assurance en cours de validité pourra être fournie au donneur d'ordre sur simple demande.",
        "La responsabilité du sous-traitant est limitée aux dommages directs prouvés et ne saurait en aucun cas couvrir les dommages indirects, pertes d'exploitation ou préjudices commerciaux.",
      ].join('\n'),
    },
    {
      id: 'article-14',
      title: 'Article 14 : Non-exclusivité',
      body: [
        "Le présent contrat n'emporte aucune obligation d'exclusivité.",
        "Le sous-traitant demeure libre de fournir des prestations similaires ou concurrentes à d'autres établissements, organismes ou entreprises, y compris pendant la durée du présent contrat, sous réserve du respect de ses obligations de confidentialité et de loyauté.",
      ].join('\n'),
    },
    {
      id: 'article-15',
      title: 'Article 15 : Force majeure',
      body: [
        "Aucune des parties ne pourra être tenue responsable de l'inexécution ou du retard dans l'exécution de l'une quelconque de ses obligations lorsque cette inexécution résulte d'un cas de force majeure au sens de l'article 1218 du Code civil.",
        'Sont notamment considérés comme cas de force majeure : les catastrophes naturelles, incendies, pandémies, grèves, conflits sociaux, interruptions des réseaux de communication ou de transport, décisions administratives, ou toute autre circonstance indépendante de la volonté des parties.',
        "La partie invoquant un cas de force majeure devra en informer l'autre partie dans les meilleurs délais. L'exécution du contrat sera suspendue pendant la durée du cas de force majeure.",
      ].join('\n'),
    },
    {
      id: 'article-16',
      title: 'Article 16 : Cession du contrat',
      body: [
        "Le présent contrat est conclu intuitu personae à l'égard du sous-traitant.",
        "Il ne pourra être cédé, transféré ou apporté, en tout ou partie, par le donneur d'ordre, à quelque titre que ce soit, sans l'accord préalable et écrit du sous-traitant.",
      ].join('\n'),
    },
  ];
}

/** Applique les modifications saisies par l'utilisateur sur les articles par défaut. */
export function applyArticleOverrides(
  defaults: ContractArticle[],
  overrides: ContractArticleOverride[] | null | undefined
): ContractArticle[] {
  if (!overrides || overrides.length === 0) return defaults;

  const byId = new Map(overrides.filter(o => o && o.id).map(o => [o.id, o]));

  return defaults.map(article => {
    const override = byId.get(article.id);
    if (!override) return article;
    return {
      id: article.id,
      title: typeof override.title === 'string' ? override.title : article.title,
      body: typeof override.body === 'string' ? override.body : article.body,
    };
  });
}

/** Parse (avec garde-fous) le JSON de modifications transmis par le client. */
export function parseArticleOverrides(raw: unknown): ContractArticleOverride[] {
  if (!raw || typeof raw !== 'string') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("[Contrat] Modifications d'articles illisibles, valeurs par défaut utilisées");
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'
    )
    .map(item => ({
      id: String(item.id),
      title: typeof item.title === 'string' ? item.title : undefined,
      body: typeof item.body === 'string' ? item.body : undefined,
    }));
}
