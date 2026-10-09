'use client';

import {
  Heading,
  Stack,
  Card,
  CardBody,
  Grid,
  GridItem,
  Text,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  HStack,
  Box,
  useDisclosure,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useToast,
  FormControl,
  FormLabel,
  Select,
  Icon,
  IconButton,
  Input,
  VStack,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Textarea,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiUpload,
  FiFile,
  FiX,
  FiTrash2,
  FiEdit3,
  FiRotateCcw,
} from 'react-icons/fi';
import { createClient } from '@/lib/supabase-client';
import { useClientDetail } from '@/lib/hooks/useClientDetail';
import { statusLabels, PERIODE_FACTURATION_LABELS } from '@/types';
import type { HeureRealisee } from '@/types';
import { computeReports, formatHeures } from '@/lib/heures-report';
import type { ContractArticle } from '@/lib/contract-ecole-articles';
import { formatPhone } from '@/lib/format';
import { EditClientModal } from './EditClientModal';
import { HeuresRealiséesModal } from './HeuresRealiséesModal';
import { SendRecapModal } from './SendRecapModal';
import { AddDocumentModal } from './AddDocumentModal';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { client, procedures, procedureHistory, documents, loading, error, refetch } =
    useClientDetail(clientId);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDuplicateOpen,
    onOpen: onDuplicateOpen,
    onClose: onDuplicateClose,
  } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancelDocRef = useRef<HTMLButtonElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{
    id: string;
    storage_path?: string | null;
    title?: string;
  } | null>(null);
  const {
    isOpen: isDeleteDocOpen,
    onOpen: onDeleteDocOpen,
    onClose: onDeleteDocClose,
  } = useDisclosure();
  const { isOpen: isAddDocOpen, onOpen: onAddDocOpen, onClose: onAddDocClose } = useDisclosure();
  const { isOpen: isRecueilOpen, onOpen: onRecueilOpen, onClose: onRecueilClose } = useDisclosure();
  const { isOpen: isRdv1Open, onOpen: onRdv1Open, onClose: onRdv1Close } = useDisclosure();
  const {
    isOpen: isRenouvellementOpen,
    onOpen: onRenouvellementOpen,
    onClose: onRenouvellementClose,
  } = useDisclosure();
  const {
    isOpen: isFinDeContratOpen,
    onOpen: onFinDeContratOpen,
    onClose: onFinDeContratClose,
  } = useDisclosure();
  const [selectedFinDeContratSigner, setSelectedFinDeContratSigner] = useState('');
  const {
    isOpen: isCvCasierOpen,
    onOpen: onCvCasierOpen,
    onClose: onCvCasierClose,
  } = useDisclosure();
  const {
    isOpen: isContractualisationOpen,
    onOpen: onContractualisationOpen,
    onClose: onContractualisationClose,
  } = useDisclosure();
  const {
    isOpen: isContractualisationParticulierOpen,
    onOpen: onContractualisationParticulierOpen,
    onClose: onContractualisationParticulierClose,
  } = useDisclosure();
  const [isLaunchingProcedure, setIsLaunchingProcedure] = useState(false);

  // Heures réalisées
  const { isOpen: isHeuresOpen, onOpen: onHeuresOpen, onClose: onHeuresClose } = useDisclosure();
  const {
    isOpen: isSendRecapOpen,
    onOpen: onSendRecapOpen,
    onClose: onSendRecapClose,
  } = useDisclosure();
  const [heuresRealisees, setHeuresRealisees] = useState<HeureRealisee[]>([]);
  const [editingHeure, setEditingHeure] = useState<HeureRealisee | null>(null);
  const [recapMois, setRecapMois] = useState<string | undefined>(); // mois présélectionné (Renvoyer)
  const [heuresLoading, setHeuresLoading] = useState(false);
  const now = new Date();
  const defaultFilterFrom = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const defaultFilterTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [heuresFilterFrom, setHeuresFilterFrom] = useState(defaultFilterFrom);
  const [heuresFilterTo, setHeuresFilterTo] = useState(defaultFilterTo);

  // Tout l'historique est chargé (le compteur de report en dépend) ; le filtre De/À ne
  // s'applique qu'à l'affichage.
  const fetchHeures = useCallback(async () => {
    setHeuresLoading(true);
    try {
      const { data, error } = await createClient()
        .from('heures_realisees')
        .select('*')
        .eq('client_id', clientId)
        .order('mois', { ascending: false });
      if (!error) setHeuresRealisees(data || []);
    } finally {
      setHeuresLoading(false);
    }
  }, [clientId]);
  const reports = useMemo(
    () => new Map(computeReports(heuresRealisees).map(l => [l.mois, l])),
    [heuresRealisees]
  );
  // Compteur global = solde après le dernier mois (rows triées par mois décroissant).
  const soldeReport = heuresRealisees.length
    ? (reports.get(heuresRealisees[0].mois)?.soldeApres ?? 0)
    : 0;
  const heuresAffichees = heuresRealisees.filter(
    h =>
      (!heuresFilterFrom || h.mois.slice(0, 7) >= heuresFilterFrom) &&
      (!heuresFilterTo || h.mois.slice(0, 7) <= heuresFilterTo)
  );

  useEffect(() => {
    if (clientId) fetchHeures();
  }, [fetchHeures]);

  const [defaultBaremeKm, setDefaultBaremeKm] = useState('0.636');
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings?.bareme_km) setDefaultBaremeKm(data.settings.bareme_km);
      })
      .catch(() => {});
  }, []);

  const [selectedRecueilEmail, setSelectedRecueilEmail] = useState('');
  const [selectedContractualisationSigner, setSelectedContractualisationSigner] = useState('');
  const [selectedAnneeScolaire, setSelectedAnneeScolaire] = useState('');
  const [selectedCvCasierEmail, setSelectedCvCasierEmail] = useState('');
  const [cvCasierFiles, setCvCasierFiles] = useState<File[]>([]);
  const [
    selectedContractualisationParticulierSigner,
    setSelectedContractualisationParticulierSigner,
  ] = useState('');
  const [selectedRdv1Email, setSelectedRdv1Email] = useState('');
  const [selectedRenouvellementEmail, setSelectedRenouvellementEmail] = useState('');
  const [contractDateDebut, setContractDateDebut] = useState('');
  const [contractDateFin, setContractDateFin] = useState('');
  const [contractSalaireHoraireNet, setContractSalaireHoraireNet] = useState('');
  const [contractTarifEcole, setContractTarifEcole] = useState('');
  const [contractAnnexeFiles, setContractAnnexeFiles] = useState<File[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [docsPage, setDocsPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const toast = useToast();

  // Calculate school year options (current and next)
  const getSchoolYearOptions = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // School year starts in September (month 9)
    // If we're before September, current school year is (year-1)-(year)
    // If we're after September, current school year is (year)-(year+1)
    let currentSchoolYearStart: number;
    if (currentMonth >= 9) {
      currentSchoolYearStart = currentYear;
    } else {
      currentSchoolYearStart = currentYear - 1;
    }

    const currentSchoolYear = `${currentSchoolYearStart}-${currentSchoolYearStart + 1}`;
    const nextSchoolYear = `${currentSchoolYearStart + 1}-${currentSchoolYearStart + 2}`;

    return [currentSchoolYear, nextSchoolYear];
  };

  const schoolYearOptions = getSchoolYearOptions();

  const contractProcedures = useMemo(
    () =>
      procedures.filter(
        p => p.procedure_type?.code === 'CONTRACTUALISATION' && p.docuseal_submission_id
      ),
    [procedures]
  );

  const [previewLoading, setPreviewLoading] = useState(false);
  const [ecolePreviewUrl, setEcolePreviewUrl] = useState<string | null>(null);
  const [particulierPreviewUrl, setParticulierPreviewUrl] = useState<string | null>(null);

  // ===== Articles du contrat École : texte par défaut + modifications manuelles =====
  const [contractArticles, setContractArticles] = useState<ContractArticle[]>([]);
  const [contractArticlesLoading, setContractArticlesLoading] = useState(false);
  const [contractArticleEdits, setContractArticleEdits] = useState<
    Record<string, { title: string; body: string }>
  >({});
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [showArticleEditor, setShowArticleEditor] = useState(false);

  // Charge le texte par défaut des articles (et le rafraîchit si l'année ou le tarif change).
  // Les articles modifiés à la main ne sont pas écrasés.
  useEffect(() => {
    if (!isContractualisationOpen || !selectedAnneeScolaire) return;
    let cancelled = false;
    setContractArticlesLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ clientId, anneeScolaire: selectedAnneeScolaire });
      if (contractTarifEcole) params.set('tarifHoraireHT', contractTarifEcole);
      fetch(`/api/procedures/contractualisation-ecole/articles?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          if (cancelled || !data.success) return;
          setContractArticles(data.articles as ContractArticle[]);
          setSelectedArticleId(prev => prev || (data.articles[0]?.id ?? ''));
        })
        .catch(() => {
          // Silencieux : sans éditeur, le contrat garde simplement ses textes par défaut
        })
        .finally(() => {
          if (!cancelled) setContractArticlesLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isContractualisationOpen, selectedAnneeScolaire, contractTarifEcole, clientId]);

  const contractArticleOverrides = useMemo(
    () =>
      Object.entries(contractArticleEdits).map(([id, value]) => ({
        id,
        title: value.title,
        body: value.body,
      })),
    [contractArticleEdits]
  );

  const currentArticle = contractArticles.find(a => a.id === selectedArticleId);
  const currentArticleEdit = selectedArticleId
    ? contractArticleEdits[selectedArticleId]
    : undefined;
  const currentArticleTitle = currentArticleEdit?.title ?? currentArticle?.title ?? '';
  const currentArticleBody = currentArticleEdit?.body ?? currentArticle?.body ?? '';

  // Une modification rend l'aperçu affiché obsolète : on le retire pour forcer sa régénération
  // (l'effet de nettoyage ci-dessous révoque l'URL blob précédente).
  const invalidateEcolePreview = () => setEcolePreviewUrl(null);

  const updateArticleDraft = (field: 'title' | 'body', value: string) => {
    if (!selectedArticleId) return;
    invalidateEcolePreview();
    const original = contractArticles.find(a => a.id === selectedArticleId);
    setContractArticleEdits(prev => {
      const base = prev[selectedArticleId] ?? {
        title: original?.title ?? '',
        body: original?.body ?? '',
      };
      const next = { ...base, [field]: value };
      const copy = { ...prev };
      // Revenu au texte d'origine : on retire la modification (l'article redevient dynamique)
      if (original && next.title === original.title && next.body === original.body) {
        delete copy[selectedArticleId];
      } else {
        copy[selectedArticleId] = next;
      }
      return copy;
    });
  };

  const resetArticle = (id: string) => {
    invalidateEcolePreview();
    setContractArticleEdits(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const resetContractArticlesState = () => {
    setContractArticleEdits({});
    setSelectedArticleId('');
    setShowArticleEditor(false);
    setContractArticles([]);
    setContractArticlesLoading(false);
  };

  useEffect(() => {
    return () => {
      if (ecolePreviewUrl) URL.revokeObjectURL(ecolePreviewUrl);
      if (particulierPreviewUrl) URL.revokeObjectURL(particulierPreviewUrl);
    };
  }, [ecolePreviewUrl, particulierPreviewUrl]);

  const handlePreviewEcole = async () => {
    if (!selectedAnneeScolaire) {
      toast({ title: 'Année scolaire requise', status: 'warning', duration: 2500 });
      return;
    }
    setPreviewLoading(true);
    try {
      const formData = new FormData();
      formData.append('clientId', clientId);
      formData.append('anneeScolaire', selectedAnneeScolaire);
      if (contractTarifEcole) formData.append('tarifHoraireHT', contractTarifEcole);
      if (contractArticleOverrides.length > 0) {
        formData.append('articleOverrides', JSON.stringify(contractArticleOverrides));
      }
      contractAnnexeFiles.forEach(f => formData.append('annexes', f));
      const res = await fetch('/api/procedures/contractualisation-ecole/preview', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      const blob = await res.blob();
      if (ecolePreviewUrl) URL.revokeObjectURL(ecolePreviewUrl);
      setEcolePreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      toast({
        title: 'Aperçu impossible',
        description: String(e),
        status: 'error',
        duration: 3500,
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewParticulier = async () => {
    if (
      !selectedContractualisationParticulierSigner ||
      !selectedAnneeScolaire ||
      !contractDateDebut ||
      !contractDateFin ||
      !contractSalaireHoraireNet
    ) {
      toast({ title: 'Tous les champs sont requis', status: 'warning', duration: 2500 });
      return;
    }
    setPreviewLoading(true);
    try {
      const [signerEmail, signerFirstName, signerLastName, signerPhone] =
        selectedContractualisationParticulierSigner.split('|');
      const res = await fetch('/api/procedures/contractualisation-particulier/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          anneeScolaire: selectedAnneeScolaire,
          dateDebut: contractDateDebut,
          dateFin: contractDateFin,
          salaireHoraireNet: contractSalaireHoraireNet,
          signerEmail,
          signerFirstName,
          signerLastName,
          signerPhone,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      const blob = await res.blob();
      if (particulierPreviewUrl) URL.revokeObjectURL(particulierPreviewUrl);
      setParticulierPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      toast({
        title: 'Aperçu impossible',
        description: String(e),
        status: 'error',
        duration: 3500,
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const handleDownloadSignedPdf = useCallback(
    async (procedureId: string) => {
      setDownloadingPdf(procedureId);
      try {
        const res = await fetch(`/api/procedures/${procedureId}/signed-pdf`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast({
            title: 'Téléchargement impossible',
            description:
              res.status === 409
                ? "Le contrat n'est pas encore signé par toutes les parties."
                : data.error || 'Erreur',
            status: res.status === 409 ? 'info' : 'error',
            duration: 4000,
          });
          return;
        }
        const blob = await res.blob();
        // Extract filename from Content-Disposition (server sets the proper name)
        let filename = `contrat_${procedureId}.pdf`;
        const cd = res.headers.get('content-disposition');
        if (cd) {
          const utf = /filename\*=UTF-8''([^;]+)/i.exec(cd);
          if (utf) {
            filename = decodeURIComponent(utf[1]);
          } else {
            const m = /filename="([^"]+)"/i.exec(cd);
            if (m) filename = m[1];
          }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        toast({ title: 'Erreur', description: String(e), status: 'error', duration: 4000 });
      } finally {
        setDownloadingPdf(null);
      }
    },
    [toast]
  );

  // Pagination for procedure history
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE;
    return procedureHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [procedureHistory, historyPage]);
  const totalHistoryPages = Math.ceil(procedureHistory.length / ITEMS_PER_PAGE);

  // Pagination for documents
  const paginatedDocs = useMemo(() => {
    const start = (docsPage - 1) * ITEMS_PER_PAGE;
    return documents.slice(start, start + ITEMS_PER_PAGE);
  }, [documents, docsPage]);
  const totalDocsPages = Math.ceil(documents.length / ITEMS_PER_PAGE);

  const handleClientUpdated = () => {
    refetch();
    onClose();
  };

  const handleArchiveToggle = async () => {
    if (!client) return;
    setIsArchiving(true);
    try {
      const supabase = createClient();
      const isArchived = client.client_status === 'Archivé';
      const { error } = await supabase
        .from('clients')
        .update({
          client_status: isArchived ? 'Client' : 'Archivé',
          archived_at: isArchived ? null : new Date().toISOString(),
        })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: isArchived ? 'Client désarchivé' : 'Client archivé',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      refetch();
    } catch {
      toast({
        title: 'Erreur',
        description: "Une erreur est survenue lors de l'archivage.",
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeleteClient = async () => {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('clients').delete().eq('id', clientId);

      if (error) throw error;

      // RGPD : effacer aussi les fichiers et les lignes documents liées aux procédures
      // (procedure_id passe à NULL à la suppression du client). Fait APRÈS la suppression :
      // un échec laisse des orphelins (comme avant) sans jamais perdre les fichiers d'un client.
      if (documents.length > 0) {
        const paths = documents.flatMap(d => (d.storage_path ? [d.storage_path] : []));
        if (paths.length > 0) {
          const { error: storageError } = await supabase.storage.from('client-files').remove(paths);
          if (storageError) console.error('Storage cleanup error:', storageError);
        }
        const { error: docsError } = await supabase
          .from('documents')
          .delete()
          .in(
            'id',
            documents.map(d => d.id)
          );
        if (docsError) console.error('Documents cleanup error:', docsError);
      }

      toast({
        title: 'Client supprimé',
        description: 'Le client a été supprimé avec succès.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      router.push('/admin/clients');
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
      onDeleteClose();
    }
  };

  const handleLaunchRecueilProcedure = async () => {
    if (!selectedRecueilEmail) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un destinataire.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLaunchingProcedure(true);
    try {
      const response = await fetch('/api/procedures/recueil-informations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, email: selectedRecueilEmail }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du lancement de la procédure');
      }

      toast({
        title: 'Procédure lancée',
        description: `Un email avec le formulaire a été envoyé à ${selectedRecueilEmail}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onRecueilClose();
      setSelectedRecueilEmail('');
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du lancement de la procédure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleLaunchRdv1Procedure = async () => {
    setIsLaunchingProcedure(true);
    try {
      const [rdv1Email, rdv1First, rdv1Last] = selectedRdv1Email.split('|');
      const response = await fetch('/api/procedures/preparation-rdv1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          recipientEmail: rdv1Email || undefined,
          recipientName: rdv1First ? `${rdv1First}${rdv1Last ? ' ' + rdv1Last : ''}` : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du lancement de la procédure');
      }

      toast({
        title: 'Procédure lancée',
        description: 'Un email de préparation du RDV 1 a été envoyé au client.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onRdv1Close();
      setSelectedRdv1Email('');
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du lancement de la procédure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleLaunchFinDeContratProcedure = async () => {
    setIsLaunchingProcedure(true);
    try {
      const [email, firstName, lastName] = selectedFinDeContratSigner.split('|');
      const response = await fetch('/api/procedures/fin-de-contrat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          recipientEmail: email,
          recipientFirstName: firstName,
          recipientLastName: lastName,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors du lancement');
      }
      toast({
        title: 'Procédure lancée',
        description: `Un email de fin de contrat a été envoyé à ${email}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onFinDeContratClose();
      setSelectedFinDeContratSigner('');
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleLaunchRenouvellementProcedure = async () => {
    setIsLaunchingProcedure(true);
    try {
      const [renouvEmail, renouvFirst, renouvLast] = selectedRenouvellementEmail.split('|');
      const response = await fetch('/api/procedures/souhait-renouvellement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          recipientEmail: renouvEmail || undefined,
          recipientName: renouvFirst
            ? `${renouvFirst}${renouvLast ? ' ' + renouvLast : ''}`
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du lancement de la procédure');
      }

      toast({
        title: 'Procédure lancée',
        description: 'Un email de demande de renouvellement a été envoyé au client.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onRenouvellementClose();
      setSelectedRenouvellementEmail('');
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du lancement de la procédure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleCvCasierFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setCvCasierFiles(prev => [...prev, ...Array.from(files)]);
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const removeCvCasierFile = (index: number) => {
    setCvCasierFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleLaunchCvCasierProcedure = async () => {
    if (!selectedCvCasierEmail) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un destinataire.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (cvCasierFiles.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez ajouter au moins un fichier.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLaunchingProcedure(true);
    try {
      // First, create the procedure
      const response = await fetch('/api/procedures/envoi-cv-casier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, email: selectedCvCasierEmail }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du lancement de la procédure');
      }

      const data = await response.json();

      // Then, upload the files
      for (const file of cvCasierFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('procedureId', data.procedureId);
        formData.append('title', file.name);
        formData.append('kind', 'SUPPORTING_DOC');
        formData.append('uploadedBy', 'ADMIN');

        await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });
      }

      // Finally, send the email with download link
      await fetch('/api/procedures/envoi-cv-casier/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedureId: data.procedureId }),
      });

      toast({
        title: 'Procédure lancée',
        description: `Un email avec le lien de téléchargement a été envoyé à ${selectedCvCasierEmail}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onCvCasierClose();
      setSelectedCvCasierEmail('');
      setCvCasierFiles([]);
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du lancement de la procédure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleLaunchContractualisationProcedure = async () => {
    if (!selectedContractualisationSigner || !client) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un signataire.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!selectedAnneeScolaire) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une année scolaire.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Parse the selected signer to get name and email
    // Format: "email|firstName|lastName|phone"
    const [signerEmail, signerFirstName, signerLastName, signerPhone] =
      selectedContractualisationSigner.split('|');

    setIsLaunchingProcedure(true);
    try {
      const formData = new FormData();
      formData.append('clientId', clientId);
      formData.append('signerEmail', signerEmail);
      formData.append('signerFirstName', signerFirstName);
      formData.append('signerLastName', signerLastName);
      if (signerPhone) formData.append('signerPhone', signerPhone);
      formData.append('anneeScolaire', selectedAnneeScolaire);
      if (contractTarifEcole) formData.append('tarifHoraireHT', contractTarifEcole);
      if (contractArticleOverrides.length > 0) {
        formData.append('articleOverrides', JSON.stringify(contractArticleOverrides));
      }
      contractAnnexeFiles.forEach(f => formData.append('annexes', f));

      const response = await fetch('/api/procedures/contractualisation-ecole', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du lancement de la procédure');
      }

      toast({
        title: 'Procédure lancée',
        description: `Une demande de signature a été envoyée à ${signerEmail}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      if (data.dbUpdateError) {
        toast({
          title: 'Attention',
          description:
            "La signature a été envoyée mais le statut en base de données n'a pas pu être mis à jour. Rechargez la page.",
          status: 'warning',
          duration: 10000,
          isClosable: true,
        });
      }

      onContractualisationClose();
      setSelectedContractualisationSigner('');
      setSelectedAnneeScolaire('');
      setContractTarifEcole('');
      setContractAnnexeFiles([]);
      resetContractArticlesState();
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description:
          err instanceof Error
            ? err.message
            : 'Une erreur est survenue lors du lancement de la procédure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleLaunchContractualisationParticulierProcedure = async () => {
    if (!selectedContractualisationParticulierSigner || !client) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un signataire.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!selectedAnneeScolaire) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une année scolaire.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!contractDateDebut || !contractDateFin || !contractSalaireHoraireNet) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs requis.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Parse the selected signer to get name and email
    // Format: "email|firstName|lastName|phone"
    const [signerEmail, signerFirstName, signerLastName, signerPhone] =
      selectedContractualisationParticulierSigner.split('|');

    setIsLaunchingProcedure(true);
    try {
      const response = await fetch('/api/procedures/contractualisation-particulier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          signerEmail,
          signerFirstName,
          signerLastName,
          signerPhone: signerPhone || undefined,
          anneeScolaire: selectedAnneeScolaire,
          dateDebut: contractDateDebut,
          dateFin: contractDateFin,
          salaireHoraireNet: parseFloat(contractSalaireHoraireNet),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du lancement de la procédure');
      }

      toast({
        title: 'Procédure lancée',
        description: `Une demande de signature a été envoyée à ${signerEmail}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      if (data.dbUpdateError) {
        toast({
          title: 'Attention',
          description:
            "La signature a été envoyée mais le statut en base de données n'a pas pu être mis à jour. Rechargez la page.",
          status: 'warning',
          duration: 10000,
          isClosable: true,
        });
      }

      onContractualisationParticulierClose();
      setSelectedContractualisationParticulierSigner('');
      setSelectedAnneeScolaire('');
      setContractDateDebut('');
      setContractDateFin('');
      setContractSalaireHoraireNet('');
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description:
          err instanceof Error
            ? err.message
            : 'Une erreur est survenue lors du lancement de la procédure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;

    setIsDeletingDoc(true);
    try {
      const supabase = createClient();

      // Delete from storage if path exists
      if (docToDelete.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('client-files')
          .remove([docToDelete.storage_path]);

        if (storageError) {
          console.error('Storage delete error:', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase.from('documents').delete().eq('id', docToDelete.id);

      if (dbError) throw dbError;

      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé avec succès.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression du document.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeletingDoc(false);
      setDocToDelete(null);
      onDeleteDocClose();
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="accent.500" />
      </Box>
    );
  }

  if (error || !client) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error || 'Client non trouvé'}
      </Alert>
    );
  }

  const isParticulier = client.type_client === 'Particulier';
  const isEcole = client.type_client === 'École';
  // Adresse des parents (repli de l'adresse des cours quand elle n'est pas renseignée)
  const adresseParents = [
    client.address_line1,
    [client.postal_code, client.city].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ');

  // Get display name for header
  const getDisplayName = () => {
    if (isEcole) {
      return client.organisation || `${client.first_name} ${client.last_name}`;
    }
    // For Particulier, prefer jeune name, then parent1 name
    if (client.first_name_jeune || client.last_name_jeune) {
      return `${client.first_name_jeune || ''} ${client.last_name_jeune || ''}`.trim();
    }
    if (client.first_name_parent1 || client.last_name_parent1) {
      return `${client.first_name_parent1 || ''} ${client.last_name_parent1 || ''}`.trim();
    }
    return `${client.first_name} ${client.last_name}`;
  };

  return (
    <Stack spacing={6}>
      <Stack
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', md: 'center' }}
        spacing={3}
      >
        <Heading color="brand.500" fontFamily="heading">
          {getDisplayName()}
        </Heading>
        <HStack spacing={3} flexShrink={0} flexWrap="wrap">
          <Button
            variant="ghost"
            onClick={() =>
              router.push(
                `/admin/clients?tab=${
                  client.client_status === 'Archivé'
                    ? 'archives'
                    : client.client_status === 'Client'
                      ? 'clients'
                      : 'prospects'
                }`
              )
            }
          >
            ← Retour
          </Button>
          <Button variant="outline" onClick={onOpen} borderColor="brand.500" color="brand.500">
            Modifier
          </Button>
          <Button
            variant="outline"
            onClick={onDuplicateOpen}
            borderColor="brand.500"
            color="brand.500"
          >
            Dupliquer
          </Button>
          <Button
            variant="outline"
            colorScheme={client.client_status === 'Archivé' ? 'green' : 'orange'}
            onClick={handleArchiveToggle}
            isLoading={isArchiving}
          >
            {client.client_status === 'Archivé' ? 'Désarchiver' : 'Archiver'}
          </Button>
          <Button variant="outline" colorScheme="red" onClick={onDeleteOpen}>
            Supprimer
          </Button>
        </HStack>
      </Stack>

      {/* Informations générales */}
      <Card bg="white" shadow="sm">
        <CardBody>
          <Stack spacing={4}>
            <Heading size="sm" color="brand.500" fontFamily="heading">
              Informations générales
            </Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
              <GridItem>
                <Text fontSize="sm" color="gray.500">
                  Statut
                </Text>
                <Badge colorScheme={client.client_status === 'Client' ? 'green' : 'orange'} mt={1}>
                  {client.client_status || 'Prospect'}
                </Badge>
              </GridItem>
              <GridItem>
                <Text fontSize="sm" color="gray.500">
                  Type
                </Text>
                <Text fontWeight="medium">{isEcole ? 'Établissement' : 'Particulier'}</Text>
              </GridItem>
              {isParticulier && (
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Sous-type
                  </Text>
                  <Text fontWeight="medium">
                    {client.sub_type === 'Jeune'
                      ? 'Jeune / Élève'
                      : client.sub_type === 'Parent'
                        ? 'Parent'
                        : '-'}
                  </Text>
                </GridItem>
              )}
              {isParticulier && (
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Niveau
                  </Text>
                  <Text fontWeight="medium">{client.niveau_eleve || '-'}</Text>
                </GridItem>
              )}
              {isParticulier && (
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Type de demande
                  </Text>
                  <Text fontWeight="medium">{client.demande_type || '-'}</Text>
                </GridItem>
              )}
            </Grid>
          </Stack>
        </CardBody>
      </Card>

      {/* ========== PARTICULIER - Tous les contacts ========== */}
      {isParticulier && (
        <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={4}>
          {/* Jeune */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">
                  Jeune / Élève
                </Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Nom complet
                  </Text>
                  <Text fontWeight="medium">
                    {client.first_name_jeune || client.last_name_jeune
                      ? `${client.first_name_jeune || ''} ${client.last_name_jeune || ''}`.trim()
                      : '-'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Téléphone
                  </Text>
                  <Text fontWeight="medium">{formatPhone(client.phone_jeune) || '-'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Email
                  </Text>
                  <Text fontWeight="medium">{client.email_jeune || '-'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Parent 1 */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">
                  Parent 1
                </Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Nom complet
                  </Text>
                  <Text fontWeight="medium">
                    {client.first_name_parent1 || client.last_name_parent1
                      ? `${client.first_name_parent1 || ''} ${client.last_name_parent1 || ''}`.trim()
                      : '-'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Téléphone
                  </Text>
                  <Text fontWeight="medium">{formatPhone(client.phone_parent1) || '-'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Email
                  </Text>
                  <Text fontWeight="medium">{client.email_parent1 || '-'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Parent 2 */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">
                  Parent 2
                </Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Nom complet
                  </Text>
                  <Text fontWeight="medium">
                    {client.first_name_parent2 || client.last_name_parent2
                      ? `${client.first_name_parent2 || ''} ${client.last_name_parent2 || ''}`.trim()
                      : '-'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Téléphone
                  </Text>
                  <Text fontWeight="medium">{formatPhone(client.phone_parent2) || '-'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Email
                  </Text>
                  <Text fontWeight="medium">{client.email_parent2 || '-'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>
        </Grid>
      )}

      {/* Lot 4 : emplacement réservé à la box « Suivi des prises de contact » (entre les contacts et Lieu des cours) */}

      {/* Lieu des cours - Particulier uniquement */}
      {isParticulier && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">
                Lieu des cours
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Adresse des cours
                  </Text>
                  {/* adresse_cours vide = cours au domicile des parents (case « adresse différente » non cochée) */}
                  <Text fontWeight="medium">{client.adresse_cours || adresseParents || '-'}</Text>
                  {!client.adresse_cours && adresseParents && (
                    <Text fontSize="xs" color="gray.500">
                      (identique à l&apos;adresse des parents)
                    </Text>
                  )}
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Distance domicile → cours
                  </Text>
                  <Text fontWeight="medium">
                    {client.distance_km != null ? `${client.distance_km} km` : '-'}
                  </Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* Informations scolaires - Particulier uniquement */}
      {isParticulier && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">
                Informations scolaires
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Établissement scolaire
                  </Text>
                  <Text fontWeight="medium">{client.etablissement_scolaire || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Moyenne maths
                  </Text>
                  <Text fontWeight="medium">{client.moyenne_maths || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Moyenne générale
                  </Text>
                  <Text fontWeight="medium">{client.moyenne_generale || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Démarche volontaire du jeune
                  </Text>
                  <Text fontWeight="medium">{client.demarche_volontaire ? 'Oui' : 'Non'}</Text>
                </GridItem>
                <GridItem colSpan={{ base: 1, md: 4 }}>
                  <Text fontSize="sm" color="gray.500">
                    Jours disponibles
                  </Text>
                  <Text fontWeight="medium">
                    {client.jours_disponibles && client.jours_disponibles.length > 0
                      ? client.jours_disponibles.join(', ')
                      : '-'}
                  </Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* Informations CESU - Particulier uniquement */}
      {isParticulier && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">
                Informations CESU
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Mode de facturation
                  </Text>
                  <Text fontWeight="medium">{client.mode_facturation || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Numéro CESU
                  </Text>
                  <Text fontWeight="medium">{client.numero_cesu || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Tarif horaire net
                  </Text>
                  <Text fontWeight="medium">
                    {client.tarif_horaire != null ? `${client.tarif_horaire.toFixed(2)} €/h` : '-'}
                  </Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* ========== ÉTABLISSEMENT - Informations module (tout en haut) ========== */}
      {isEcole && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">
                Informations module
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Nom du module
                  </Text>
                  <Text fontWeight="medium">{client.ecole_module_nom || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Nombre d'heures
                  </Text>
                  <Text fontWeight="medium">{client.ecole_module_heures || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Type de formation
                  </Text>
                  <Text fontWeight="medium">
                    {client.ecole_formation_type === 'initiale_en_alternance'
                      ? 'Initiale / Alternance'
                      : client.ecole_formation_type === 'continue'
                        ? 'Continue'
                        : '-'}
                  </Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Classe(s)
                  </Text>
                  <Text fontWeight="medium">{client.ecole_classes_noms || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Taille du groupe
                  </Text>
                  <Text fontWeight="medium">{client.ecole_groupe_taille || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Évaluations min.
                  </Text>
                  <Text fontWeight="medium">{client.ecole_evaluation_nombre_min || '-'}</Text>
                </GridItem>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <Text fontSize="sm" color="gray.500">
                    Période
                  </Text>
                  <Text fontWeight="medium">{client.ecole_module_periode || '-'}</Text>
                </GridItem>
                <GridItem colSpan={{ base: 1, md: 3 }}>
                  <Text fontSize="sm" color="gray.500">
                    Modalités d'évaluation
                  </Text>
                  <Text fontWeight="medium">{client.ecole_evaluation_modalites || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Notes élèves saisies par
                  </Text>
                  <Text fontWeight="medium">{client.ecole_notes_saisies_par || '-'}</Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* ========== ÉTABLISSEMENT CONTACT ========== */}
      {isEcole && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">
                Contact de l'établissement
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Nom complet
                  </Text>
                  <Text fontWeight="medium">
                    {client.first_name} {client.last_name}
                  </Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Téléphone
                  </Text>
                  <Text fontWeight="medium">{formatPhone(client.phone1) || '-'}</Text>
                </GridItem>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <Text fontSize="sm" color="gray.500">
                    Email
                  </Text>
                  <Text fontWeight="medium">{client.email}</Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* ========== ÉTABLISSEMENT - Responsables ========== */}
      {isEcole && (
        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={4}>
          {/* Responsable modules */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <HStack justify="space-between">
                  <Heading size="sm" color="brand.500" fontFamily="heading">
                    Responsable modules
                  </Heading>
                  {client.ecole_resp_modules_peut_negocier && (
                    <Badge colorScheme="green" fontSize="xs">
                      Habilité prix
                    </Badge>
                  )}
                </HStack>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Nom complet
                  </Text>
                  <Text fontWeight="medium">
                    {client.ecole_resp_modules_prenom || client.ecole_resp_modules_nom
                      ? `${client.ecole_resp_modules_prenom || ''} ${client.ecole_resp_modules_nom || ''}`.trim()
                      : '-'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Téléphone
                  </Text>
                  <Text fontWeight="medium">
                    {formatPhone(client.ecole_resp_modules_phone) || '-'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Email
                  </Text>
                  <Text fontWeight="medium">{client.ecole_resp_modules_email || '-'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Responsable autorisation prix */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">
                  Responsable autorisation prix
                </Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Nom complet
                  </Text>
                  <Text fontWeight="medium">
                    {client.ecole_resp_autorisation_prenom || client.ecole_resp_autorisation_nom
                      ? `${client.ecole_resp_autorisation_prenom || ''} ${client.ecole_resp_autorisation_nom || ''}`.trim()
                      : '-'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Téléphone
                  </Text>
                  <Text fontWeight="medium">
                    {formatPhone(client.ecole_resp_autorisation_phone) || '-'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Email
                  </Text>
                  <Text fontWeight="medium">{client.ecole_resp_autorisation_email || '-'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Responsable facturation */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">
                  Responsable facturation
                </Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Nom complet
                  </Text>
                  <Text fontWeight="medium">
                    {client.ecole_resp_facturation_prenom || client.ecole_resp_facturation_nom
                      ? `${client.ecole_resp_facturation_prenom || ''} ${client.ecole_resp_facturation_nom || ''}`.trim()
                      : '-'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Téléphone
                  </Text>
                  <Text fontWeight="medium">
                    {formatPhone(client.ecole_resp_facturation_phone) || '-'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Email
                  </Text>
                  <Text fontWeight="medium">{client.ecole_resp_facturation_email || '-'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Responsable planning */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">
                  Responsable planning
                </Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Nom complet
                  </Text>
                  <Text fontWeight="medium">
                    {client.ecole_resp_planning_prenom || client.ecole_resp_planning_nom
                      ? `${client.ecole_resp_planning_prenom || ''} ${client.ecole_resp_planning_nom || ''}`.trim()
                      : '-'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Téléphone
                  </Text>
                  <Text fontWeight="medium">
                    {formatPhone(client.ecole_resp_planning_phone) || '-'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Email
                  </Text>
                  <Text fontWeight="medium">{client.ecole_resp_planning_email || '-'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Responsable notes (seulement si les notes sont saisies par une personne tierce) */}
          {client.ecole_notes_saisies_par === 'Personne tierce' && (
            <Card bg="white" shadow="sm">
              <CardBody>
                <Stack spacing={3}>
                  <Heading size="sm" color="brand.500" fontFamily="heading">
                    Responsable notes
                  </Heading>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Nom complet
                    </Text>
                    <Text fontWeight="medium">
                      {client.ecole_resp_notes_prenom || client.ecole_resp_notes_nom
                        ? `${client.ecole_resp_notes_prenom || ''} ${client.ecole_resp_notes_nom || ''}`.trim()
                        : '-'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Téléphone
                    </Text>
                    <Text fontWeight="medium">
                      {formatPhone(client.ecole_resp_notes_phone) || '-'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Email
                    </Text>
                    <Text fontWeight="medium">{client.ecole_resp_notes_email || '-'}</Text>
                  </Box>
                </Stack>
              </CardBody>
            </Card>
          )}
        </Grid>
      )}

      {/* ========== ÉTABLISSEMENT - Informations structure ========== */}
      {isEcole && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">
                Informations structure
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    N° SIRET
                  </Text>
                  <Text fontWeight="medium">{client.ecole_siret || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    N° NDA
                  </Text>
                  <Text fontWeight="medium">{client.ecole_nda || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Région d'obtention NDA
                  </Text>
                  <Text fontWeight="medium">{client.ecole_nda_region || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Statut juridique
                  </Text>
                  <Text fontWeight="medium">{client.ecole_statut_juridique || '-'}</Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* ========== ÉTABLISSEMENT - Frais pris en charge ========== */}
      {isEcole && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">
                Frais pris en charge par l'établissement
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Frais du midi
                  </Text>
                  <Text fontWeight="medium">
                    {client.ecole_frais_midi_montant ? `${client.ecole_frais_midi_montant} €` : '-'}
                  </Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Conditions
                  </Text>
                  <Text fontWeight="medium">{client.ecole_frais_midi_conditions || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Remboursement déplacement
                  </Text>
                  <Badge
                    colorScheme={client.ecole_frais_deplacement_rembourse ? 'green' : 'gray'}
                    mt={1}
                  >
                    {client.ecole_frais_deplacement_rembourse ? 'Oui' : 'Non'}
                  </Badge>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Prix au kilomètre
                  </Text>
                  <Text fontWeight="medium">
                    {client.ecole_frais_km_prix ? `${client.ecole_frais_km_prix} €/km` : '-'}
                  </Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* ========== ÉTABLISSEMENT - Enseignant ========== */}
      {isEcole && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">
                Enseignant du contenu de la matière
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Prénom
                  </Text>
                  <Text fontWeight="medium">{client.ecole_enseignant_prenom || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Nom
                  </Text>
                  <Text fontWeight="medium">{client.ecole_enseignant_nom || '-'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Email
                  </Text>
                  <Text fontWeight="medium">{client.ecole_enseignant_email || '-'}</Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* ========== ÉTABLISSEMENT - Facturation ========== */}
      {isEcole && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">
                Facturation
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Date max d'envoi de la facture
                  </Text>
                  <Text fontWeight="medium">
                    {client.ecole_facturation_date_max_paiement
                      ? `Le ${client.ecole_facturation_date_max_paiement} du mois`
                      : '-'}
                  </Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Délai de paiement
                  </Text>
                  <Text fontWeight="medium">
                    {client.ecole_periode_facturation
                      ? PERIODE_FACTURATION_LABELS[client.ecole_periode_facturation]
                      : '-'}
                  </Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Tarif horaire HT
                  </Text>
                  <Text fontWeight="medium">
                    {client.tarif_horaire != null ? `${client.tarif_horaire.toFixed(2)} €/h` : '-'}
                  </Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* Souhait de renouvellement - Particulier uniquement, si réponse reçue */}
      {isParticulier && client.renouvellement_date_reponse && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">
                Souhait de renouvellement
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Souhaite renouveler
                  </Text>
                  <Badge colorScheme={client.renouvellement_souhaite ? 'green' : 'red'} mt={1}>
                    {client.renouvellement_souhaite ? 'Oui' : 'Non'}
                  </Badge>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Date de réponse
                  </Text>
                  <Text fontWeight="medium">
                    {new Date(client.renouvellement_date_reponse).toLocaleDateString('fr-FR')}
                  </Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">
                    Commentaire
                  </Text>
                  <Text fontWeight="medium">{client.renouvellement_commentaire || '-'}</Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* Adresse & Notes (Adresse : établissements seulement, les particuliers l'ont dans Lieu des cours) */}
      {(isEcole || client.notes) && (
        <Grid
          templateColumns={{ base: '1fr', md: isEcole && client.notes ? 'repeat(2, 1fr)' : '1fr' }}
          gap={4}
        >
          {isEcole && (
            <Card bg="white" shadow="sm">
              <CardBody>
                <Stack spacing={3}>
                  <Heading size="sm" color="brand.500" fontFamily="heading">
                    Adresse
                  </Heading>
                  <Text fontWeight="medium">
                    {client.address_line1 || '-'}
                    {client.postal_code && (
                      <>
                        <br />
                        {client.postal_code}
                      </>
                    )}
                    {client.city && ` ${client.city}`}
                    {client.country && (
                      <>
                        <br />
                        {client.country}
                      </>
                    )}
                  </Text>
                </Stack>
              </CardBody>
            </Card>
          )}

          {client.notes && (
            <Card bg="white" shadow="sm">
              <CardBody>
                <Stack spacing={3}>
                  <Heading size="sm" color="brand.500" fontFamily="heading">
                    Notes
                  </Heading>
                  <Text>{client.notes}</Text>
                </Stack>
              </CardBody>
            </Card>
          )}
        </Grid>
      )}

      {/* ========== HEURES RÉALISÉES - Particulier uniquement ========== */}
      {isParticulier && (
        <Card bg="white">
          <CardBody>
            <Stack spacing={4}>
              <Stack
                direction={{ base: 'column', md: 'row' }}
                justify="space-between"
                align={{ base: 'flex-start', md: 'center' }}
                spacing={2}
              >
                <Stack spacing={1}>
                  <Heading size="md" color="brand.500" fontFamily="heading" fontWeight="600">
                    Heures réalisées
                  </Heading>
                  <Badge
                    colorScheme={soldeReport < 0 ? 'red' : 'orange'}
                    fontSize="sm"
                    w="fit-content"
                  >
                    Solde à reporter : {formatHeures(soldeReport)}
                  </Badge>
                  <Text fontSize="xs" color="gray.500" maxW="lg">
                    Temps à reporter et 1ers RDV cumulés, moins les heures reportées facturées ou
                    prévues. Les « +X h » en italique sont prévisionnels : ils sont figés à
                    l&apos;envoi du récap ou par « Mettre à jour le compteur » (fenêtre
                    d&apos;envoi, sans e-mail). Pour corriger le compteur : Modifier un mois → «
                    Heures reportées facturées ».
                  </Text>
                </Stack>
                <Stack
                  direction={{ base: 'column', sm: 'row' }}
                  spacing={2}
                  w={{ base: '100%', md: 'auto' }}
                  flexShrink={0}
                >
                  <Button
                    variant="outline"
                    colorScheme="brand"
                    size="sm"
                    onClick={() => {
                      setRecapMois(undefined);
                      onSendRecapOpen();
                    }}
                    isDisabled={heuresRealisees.length === 0}
                    w={{ base: '100%', sm: 'auto' }}
                  >
                    Envoyer la déclaration mensuelle
                  </Button>
                  <Button
                    colorScheme="accent"
                    size="sm"
                    onClick={() => {
                      setEditingHeure(null);
                      onHeuresOpen();
                    }}
                    w={{ base: '100%', sm: 'auto' }}
                  >
                    + Déclarer des heures
                  </Button>
                </Stack>
              </Stack>

              {/* Filtres date range */}
              <Stack
                direction={{ base: 'column', md: 'row' }}
                spacing={3}
                align={{ base: 'stretch', md: 'flex-end' }}
              >
                <FormControl>
                  <FormLabel fontSize="xs" mb={1}>
                    De
                  </FormLabel>
                  <Input
                    type="month"
                    size="sm"
                    value={heuresFilterFrom}
                    onChange={e => setHeuresFilterFrom(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs" mb={1}>
                    À
                  </FormLabel>
                  <Input
                    type="month"
                    size="sm"
                    value={heuresFilterTo}
                    onChange={e => setHeuresFilterTo(e.target.value)}
                  />
                </FormControl>
              </Stack>

              {heuresLoading ? (
                <Box textAlign="center" py={4}>
                  <Spinner size="sm" color="accent.500" />
                </Box>
              ) : heuresAffichees.length > 0 ? (
                <TableContainer>
                  <Table size="sm" variant="simple" sx={{ 'th, td': { px: 2 } }}>
                    <Thead>
                      <Tr>
                        <Th>Mois</Th>
                        <Th isNumeric>Heures</Th>
                        <Th isNumeric>Tarif (€/h)</Th>
                        <Th isNumeric>Montant heures</Th>
                        <Th isNumeric>Km</Th>
                        <Th isNumeric>Barème km</Th>
                        <Th isNumeric>Montant km</Th>
                        <Th isNumeric>Total</Th>
                        <Th isNumeric>À reporter</Th>
                        <Th>Envoi récap</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {heuresAffichees.map(h => {
                        const line = reports.get(h.mois);
                        const reportIn = line?.reportIn ?? 0;
                        const rdvHeures = Number(h.premier_rdv_heures ?? 0);
                        const heuresBillees = h.heures + reportIn;
                        const montantHeures = heuresBillees * h.tarif_horaire;
                        const montantKm = h.km * h.bareme_km;
                        const montantAnnulation =
                          Number(h.heures_annulation ?? 0) * h.tarif_horaire;
                        const total = montantHeures + montantKm + montantAnnulation;
                        const moisDate = new Date(h.mois + 'T00:00:00');
                        const label = moisDate.toLocaleDateString('fr-FR', {
                          month: '2-digit',
                          year: 'numeric',
                        });
                        const sentAt = h.recap_email_sent_at
                          ? new Date(h.recap_email_sent_at)
                          : null;
                        return (
                          <Tr key={h.id} opacity={h.sans_declaration ? 0.5 : 1}>
                            <Td textTransform="capitalize">
                              {label}
                              {rdvHeures > 0 && (
                                <Badge colorScheme="purple" fontSize="2xs" ml={1}>
                                  1er RDV{' '}
                                  {h.premier_rdv_date
                                    ? new Date(h.premier_rdv_date + 'T00:00:00').toLocaleDateString(
                                        'fr-FR',
                                        { day: '2-digit', month: '2-digit' }
                                      )
                                    : ''}{' '}
                                  · {formatHeures(rdvHeures)}
                                </Badge>
                              )}
                            </Td>
                            <Td isNumeric>
                              {h.heures}h
                              {reportIn > 0 && (
                                <Tooltip
                                  label={
                                    line?.auto
                                      ? "Report prévisionnel : figé à l'envoi du récap"
                                      : 'Report facturé (figé)'
                                  }
                                  hasArrow
                                >
                                  <Text
                                    as="span"
                                    color="orange.500"
                                    fontSize="xs"
                                    ml={1}
                                    fontStyle={line?.auto ? 'italic' : undefined}
                                  >
                                    (+{reportIn}h)
                                  </Text>
                                </Tooltip>
                              )}
                              {Number(h.heures_annulation) > 0 && (
                                <Text as="span" color="red.500" fontSize="xs" ml={1}>
                                  (annul. {h.heures_annulation}h)
                                </Text>
                              )}
                            </Td>
                            <Td isNumeric>{h.tarif_horaire.toFixed(2)} €</Td>
                            <Td isNumeric>{montantHeures.toFixed(2)} €</Td>
                            <Td isNumeric>{h.km} km</Td>
                            <Td isNumeric>{h.bareme_km.toFixed(3)} €</Td>
                            <Td isNumeric>{montantKm.toFixed(2)} €</Td>
                            <Td isNumeric fontWeight="bold">
                              {total.toFixed(2)} €
                            </Td>
                            <Td isNumeric color={h.temps_a_reporter ? 'orange.500' : 'gray.400'}>
                              {h.temps_a_reporter ? `${h.temps_a_reporter}h` : '-'}
                              {line && (
                                <Text
                                  fontSize="2xs"
                                  color={line.soldeApres < 0 ? 'red.500' : 'gray.500'}
                                >
                                  cumul {formatHeures(line.soldeApres)}
                                </Text>
                              )}
                            </Td>
                            <Td>
                              {sentAt ? (
                                <Stack spacing={0}>
                                  <Badge colorScheme="green" fontSize="xs" w="fit-content">
                                    Envoyé le {sentAt.toLocaleDateString('fr-FR')}
                                  </Badge>
                                  {h.recap_email_to && (
                                    <Text fontSize="2xs" color="gray.500">
                                      à {h.recap_email_to}
                                    </Text>
                                  )}
                                  <Button
                                    size="xs"
                                    variant="link"
                                    colorScheme="brand"
                                    w="fit-content"
                                    onClick={() => {
                                      setRecapMois(h.mois);
                                      onSendRecapOpen();
                                    }}
                                  >
                                    Renvoyer
                                  </Button>
                                </Stack>
                              ) : h.sans_declaration ? (
                                <Badge colorScheme="gray" fontSize="xs">
                                  Pas de déclaration
                                </Badge>
                              ) : h.report_in != null ? (
                                <Badge colorScheme="gray" fontSize="xs">
                                  Compteur validé (sans e-mail)
                                </Badge>
                              ) : (
                                <Badge colorScheme="orange" fontSize="xs">
                                  Non envoyé
                                </Badge>
                              )}
                            </Td>
                            <Td isNumeric>
                              <Button
                                size="xs"
                                variant="outline"
                                colorScheme="brand"
                                onClick={() => {
                                  setEditingHeure(h);
                                  onHeuresOpen();
                                }}
                              >
                                Modifier
                              </Button>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Box textAlign="center" py={6}>
                  <Text color="gray.500" fontSize="sm">
                    Aucune heure déclarée pour cette période
                  </Text>
                </Box>
              )}
            </Stack>
          </CardBody>
        </Card>
      )}

      <Card bg="white">
        <CardBody>
          <Stack spacing={4}>
            <Heading size="md" color="brand.500" fontFamily="heading" fontWeight="600">
              Historique des procédures ({procedureHistory.length})
            </Heading>

            {/* Procedure Buttons - Different for Particulier vs École */}
            <HStack spacing={3} flexWrap="wrap">
              {isEcole ? (
                <>
                  <Button colorScheme="accent" size="sm" onClick={onRecueilOpen}>
                    Recueil des informations
                  </Button>
                  <Button
                    colorScheme="accent"
                    size="sm"
                    onClick={() => {
                      if (client?.tarif_horaire) {
                        setContractTarifEcole(client.tarif_horaire.toString());
                      }
                      onContractualisationOpen();
                    }}
                  >
                    Contractualisation
                  </Button>
                  <Button colorScheme="accent" size="sm" onClick={onCvCasierOpen}>
                    Envoyer CV/Casier
                  </Button>
                </>
              ) : (
                <>
                  <Button colorScheme="accent" size="sm" onClick={onRecueilOpen}>
                    Recueil des informations
                  </Button>
                  <Button colorScheme="accent" size="sm" onClick={onRdv1Open}>
                    Préparation RDV 1
                  </Button>
                  <Button
                    colorScheme="accent"
                    size="sm"
                    onClick={() => {
                      if (client?.tarif_horaire) {
                        setContractSalaireHoraireNet(client.tarif_horaire.toString());
                      }
                      onContractualisationParticulierOpen();
                    }}
                  >
                    Contractualisation
                  </Button>
                  <Button colorScheme="accent" size="sm" onClick={onRenouvellementOpen}>
                    Souhait de renouvellement
                  </Button>
                  <Button colorScheme="accent" size="sm" onClick={onFinDeContratOpen}>
                    Fin du contrat
                  </Button>
                </>
              )}
            </HStack>

            {procedureHistory.length > 0 ? (
              <>
                <Stack spacing={1}>
                  {paginatedHistory.map(entry => (
                    <Stack
                      key={entry.id}
                      direction={{ base: 'column', md: 'row' }}
                      py={2}
                      px={3}
                      bg="gray.50"
                      borderRadius="md"
                      justify="space-between"
                      align={{ base: 'flex-start', md: 'center' }}
                      spacing={1}
                    >
                      <HStack spacing={3} flex={1} flexWrap="wrap">
                        <Text fontWeight="medium" fontSize="sm">
                          {entry.procedure_label}
                        </Text>
                        <Badge
                          colorScheme={
                            entry.status === 'FORMULAIRE_REMPLI'
                              ? 'green'
                              : entry.status.includes('RELANCE')
                                ? 'orange'
                                : 'blue'
                          }
                          fontSize="xs"
                        >
                          {statusLabels[entry.status]}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="gray.500" flexShrink={0}>
                        {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Stack>
                  ))}
                </Stack>
                {totalHistoryPages > 1 && (
                  <HStack justify="center" pt={3} spacing={2}>
                    <IconButton
                      aria-label="Page précédente"
                      icon={<Icon as={FiChevronLeft} />}
                      size="sm"
                      variant="outline"
                      isDisabled={historyPage === 1}
                      onClick={() => setHistoryPage(p => p - 1)}
                    />
                    <Text fontSize="sm" color="gray.600">
                      Page {historyPage} / {totalHistoryPages}
                    </Text>
                    <IconButton
                      aria-label="Page suivante"
                      icon={<Icon as={FiChevronRight} />}
                      size="sm"
                      variant="outline"
                      isDisabled={historyPage === totalHistoryPages}
                      onClick={() => setHistoryPage(p => p + 1)}
                    />
                  </HStack>
                )}
              </>
            ) : (
              <Box textAlign="center" py={6}>
                <Text color="brand.400" mb={2}>
                  Aucune procédure pour le moment
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Utilisez les boutons ci-dessus pour lancer une procédure
                </Text>
              </Box>
            )}
          </Stack>
        </CardBody>
      </Card>

      {contractProcedures.length > 0 && (
        <Card bg="white">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="md" color="brand.500" fontFamily="heading" fontWeight="600">
                Contrats signés ({contractProcedures.length})
              </Heading>
              <Stack spacing={2}>
                {contractProcedures.map(p => (
                  <Stack
                    key={p.id}
                    direction={{ base: 'column', md: 'row' }}
                    py={2}
                    px={3}
                    bg="gray.50"
                    borderRadius="md"
                    justify="space-between"
                    align={{ base: 'flex-start', md: 'center' }}
                    spacing={2}
                  >
                    <Stack spacing={0} flex={1} minW={0}>
                      <Text fontWeight="medium" fontSize="sm">
                        {(() => {
                          const d = new Date(p.created_at);
                          const y = d.getFullYear();
                          const m = d.getMonth() + 1;
                          const schoolYear = m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
                          const isEcole = client?.type_client === 'École';
                          const label = isEcole
                            ? client?.organisation ||
                              `${client?.first_name ?? ''} ${client?.last_name ?? ''}`.trim()
                            : `${client?.first_name_jeune || ''} ${client?.last_name_jeune || ''}`.trim() ||
                              `${client?.first_name ?? ''} ${client?.last_name ?? ''}`.trim();
                          return `Contrat - ${label} - ${schoolYear}`;
                        })()}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(p.created_at).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Stack>
                    <Button
                      size="sm"
                      colorScheme="accent"
                      variant="outline"
                      isLoading={downloadingPdf === p.id}
                      onClick={() => handleDownloadSignedPdf(p.id)}
                    >
                      Télécharger le contrat signé
                    </Button>
                  </Stack>
                ))}
              </Stack>
              <Text fontSize="xs" color="gray.500">
                Le PDF est récupéré directement depuis DocuSeal. Si toutes les parties n&apos;ont
                pas encore signé, le téléchargement sera indisponible.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      )}

      <Card bg="white">
        <CardBody>
          <Stack spacing={4}>
            <Stack
              direction={{ base: 'column', md: 'row' }}
              justify="space-between"
              align={{ base: 'flex-start', md: 'center' }}
              spacing={2}
            >
              <Heading size="md" color="brand.500" fontFamily="heading" fontWeight="600">
                Documents ({documents.length})
              </Heading>
              <Button
                size="sm"
                colorScheme="accent"
                onClick={onAddDocOpen}
                w={{ base: '100%', md: 'auto' }}
              >
                + Ajouter un document
              </Button>
            </Stack>
            {documents.length > 0 ? (
              <>
                <Stack spacing={2}>
                  {paginatedDocs.map(doc => {
                    // Find the procedure for this document
                    const docProcedure = procedures.find(p => p.id === doc.procedure_id);
                    return (
                      <Stack
                        key={doc.id}
                        direction={{ base: 'column', md: 'row' }}
                        py={2}
                        px={3}
                        bg="gray.50"
                        borderRadius="md"
                        justify="space-between"
                        align={{ base: 'flex-start', md: 'center' }}
                        spacing={2}
                      >
                        <Stack spacing={0} flex={1} minW={0}>
                          <Text fontWeight="medium" fontSize="sm">
                            {doc.title}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            De :{' '}
                            {doc.procedure_id
                              ? docProcedure?.procedure_type?.label || 'Document'
                              : 'Ajout manuel'}{' '}
                            •{' '}
                            {new Date(doc.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                          {doc.original_filename && (
                            <Text fontSize="xs" color="gray.400" fontStyle="italic">
                              {doc.original_filename}
                            </Text>
                          )}
                        </Stack>
                        <HStack flexShrink={0}>
                          <Button
                            size="sm"
                            variant="outline"
                            colorScheme="accent"
                            onClick={async () => {
                              if (!doc.storage_path) return;
                              const supabase = createClient();
                              const { data } = await supabase.storage
                                .from('client-files')
                                .createSignedUrl(doc.storage_path, 60);
                              if (data?.signedUrl) {
                                window.open(data.signedUrl, '_blank');
                              }
                            }}
                          >
                            Ouvrir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="accent"
                            onClick={async () => {
                              if (!doc.storage_path) return;
                              const supabase = createClient();
                              const { data } = await supabase.storage
                                .from('client-files')
                                .download(doc.storage_path);
                              if (data) {
                                const url = URL.createObjectURL(data);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = doc.original_filename || doc.title || 'document';
                                a.click();
                                URL.revokeObjectURL(url);
                              }
                            }}
                          >
                            Télécharger
                          </Button>
                          <IconButton
                            aria-label="Supprimer le document"
                            icon={<Icon as={FiTrash2} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => {
                              setDocToDelete({
                                id: doc.id,
                                storage_path: doc.storage_path,
                                title: doc.title,
                              });
                              onDeleteDocOpen();
                            }}
                          />
                        </HStack>
                      </Stack>
                    );
                  })}
                </Stack>
                {totalDocsPages > 1 && (
                  <HStack justify="center" pt={3} spacing={2}>
                    <IconButton
                      aria-label="Page précédente"
                      icon={<Icon as={FiChevronLeft} />}
                      size="sm"
                      variant="outline"
                      isDisabled={docsPage === 1}
                      onClick={() => setDocsPage(p => p - 1)}
                    />
                    <Text fontSize="sm" color="gray.600">
                      Page {docsPage} / {totalDocsPages}
                    </Text>
                    <IconButton
                      aria-label="Page suivante"
                      icon={<Icon as={FiChevronRight} />}
                      size="sm"
                      variant="outline"
                      isDisabled={docsPage === totalDocsPages}
                      onClick={() => setDocsPage(p => p + 1)}
                    />
                  </HStack>
                )}
              </>
            ) : (
              <Box textAlign="center" py={6}>
                <Text color="brand.400">Aucun document pour le moment</Text>
              </Box>
            )}
          </Stack>
        </CardBody>
      </Card>

      <AddDocumentModal
        isOpen={isAddDocOpen}
        onClose={onAddDocClose}
        clientId={clientId}
        onSuccess={refetch}
      />

      {client && (
        <EditClientModal
          isOpen={isOpen}
          onClose={onClose}
          onSuccess={handleClientUpdated}
          client={client}
        />
      )}

      {/* Duplication : mêmes champs pré-remplis, nom vidé, crée un nouveau contact */}
      {client && (
        <EditClientModal
          mode="duplicate"
          isOpen={isDuplicateOpen}
          onClose={onDuplicateClose}
          onSuccess={newClientId => {
            onDuplicateClose();
            if (newClientId) router.push(`/admin/clients/${newClientId}`);
          }}
          client={client}
        />
      )}

      {/* Modal de confirmation - Recueil des informations */}
      <Modal
        isOpen={isRecueilOpen}
        onClose={() => {
          onRecueilClose();
          setSelectedRecueilEmail('');
        }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Lancer la procédure
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Vous êtes sur le point de lancer la procédure{' '}
              <strong>Recueil des informations</strong>.
            </Text>
            <Text mt={3} mb={4}>
              Un email sera envoyé avec un lien vers un formulaire pré-rempli pour compléter les
              informations du dossier.
            </Text>

            <FormControl isRequired>
              <FormLabel color="brand.600">Envoyer à</FormLabel>
              <Select
                placeholder="Sélectionner un destinataire"
                value={selectedRecueilEmail}
                onChange={e => setSelectedRecueilEmail(e.target.value)}
              >
                {isEcole ? (
                  // École: show all contact emails
                  <>
                    <option value={client?.email}>
                      {client?.first_name} {client?.last_name} &lt;{client?.email}&gt; (Contact
                      principal)
                    </option>
                    {client?.ecole_resp_modules_email && (
                      <option value={client.ecole_resp_modules_email}>
                        {client.ecole_resp_modules_prenom} {client.ecole_resp_modules_nom} &lt;
                        {client.ecole_resp_modules_email}&gt; (Resp. modules)
                      </option>
                    )}
                    {client?.ecole_resp_autorisation_email && (
                      <option value={client.ecole_resp_autorisation_email}>
                        {client.ecole_resp_autorisation_prenom} {client.ecole_resp_autorisation_nom}{' '}
                        &lt;{client.ecole_resp_autorisation_email}&gt; (Resp. autorisation prix)
                      </option>
                    )}
                    {client?.ecole_resp_facturation_email && (
                      <option value={client.ecole_resp_facturation_email}>
                        {client.ecole_resp_facturation_prenom} {client.ecole_resp_facturation_nom}{' '}
                        &lt;{client.ecole_resp_facturation_email}&gt; (Resp. facturation)
                      </option>
                    )}
                    {client?.ecole_resp_planning_email && (
                      <option value={client.ecole_resp_planning_email}>
                        {client.ecole_resp_planning_prenom} {client.ecole_resp_planning_nom} &lt;
                        {client.ecole_resp_planning_email}&gt; (Resp. planning)
                      </option>
                    )}
                    {client?.ecole_resp_notes_email && (
                      <option value={client.ecole_resp_notes_email}>
                        {client.ecole_resp_notes_prenom} {client.ecole_resp_notes_nom} &lt;
                        {client.ecole_resp_notes_email}&gt; (Resp. notes)
                      </option>
                    )}
                  </>
                ) : (
                  // Particulier: show parent/jeune emails
                  <>
                    {client?.email_parent1 && (
                      <option value={client.email_parent1}>
                        {client.first_name_parent1} {client.last_name_parent1} &lt;
                        {client.email_parent1}&gt; (Parent 1)
                      </option>
                    )}
                    {client?.email_parent2 && (
                      <option value={client.email_parent2}>
                        {client.first_name_parent2} {client.last_name_parent2} &lt;
                        {client.email_parent2}&gt; (Parent 2)
                      </option>
                    )}
                    {client?.email_jeune && (
                      <option value={client.email_jeune}>
                        {client.first_name_jeune} {client.last_name_jeune} &lt;{client.email_jeune}
                        &gt; (Jeune)
                      </option>
                    )}
                    {client?.email &&
                      !client?.email_parent1 &&
                      !client?.email_parent2 &&
                      !client?.email_jeune && (
                        <option value={client.email}>
                          {client.first_name} {client.last_name} &lt;{client.email}&gt;
                        </option>
                      )}
                  </>
                )}
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                onRecueilClose();
                setSelectedRecueilEmail('');
              }}
            >
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchRecueilProcedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
              isDisabled={!selectedRecueilEmail}
            >
              Confirmer et envoyer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de confirmation - Préparation RDV 1 */}
      <Modal isOpen={isRdv1Open} onClose={onRdv1Close} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Préparation du RDV 1
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Text>
                Vous êtes sur le point de lancer la procédure{' '}
                <strong>Préparation du premier rendez-vous</strong>.
              </Text>
              <Text fontSize="sm" color="brand.600">
                Un email sera envoyé pour demander de préparer les 3 derniers bulletins de notes,
                les 2 dernières évaluations de maths et le(s) cahier(s) de maths.
              </Text>
              <FormControl isRequired>
                <FormLabel color="brand.600">Destinataire</FormLabel>
                <Select
                  placeholder="Sélectionner un destinataire"
                  value={selectedRdv1Email}
                  onChange={e => setSelectedRdv1Email(e.target.value)}
                >
                  {client?.email_parent1 && (
                    <option
                      value={`${client.email_parent1}|${client.first_name_parent1 || ''}|${client.last_name_parent1 || ''}`}
                    >
                      {client.first_name_parent1} {client.last_name_parent1} &lt;
                      {client.email_parent1}&gt; (Parent 1)
                    </option>
                  )}
                  {client?.email_parent2 && (
                    <option
                      value={`${client.email_parent2}|${client.first_name_parent2 || ''}|${client.last_name_parent2 || ''}`}
                    >
                      {client.first_name_parent2} {client.last_name_parent2} &lt;
                      {client.email_parent2}&gt; (Parent 2)
                    </option>
                  )}
                  {client?.email_jeune && (
                    <option
                      value={`${client.email_jeune}|${client.first_name_jeune || ''}|${client.last_name_jeune || ''}`}
                    >
                      {client.first_name_jeune} {client.last_name_jeune} &lt;{client.email_jeune}
                      &gt; (Jeune)
                    </option>
                  )}
                </Select>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                onRdv1Close();
                setSelectedRdv1Email('');
              }}
            >
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchRdv1Procedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
              isDisabled={!selectedRdv1Email}
            >
              Confirmer et envoyer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de confirmation - Souhait de renouvellement */}
      <Modal isOpen={isFinDeContratOpen} onClose={onFinDeContratClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Fin de contrat
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Text>
                Vous êtes sur le point de lancer la procédure <strong>Fin de contrat</strong>.
              </Text>
              <Text fontSize="sm" color="brand.600">
                Un email sera envoyé au destinataire avec :
              </Text>
              <Box as="ul" pl={5} color="brand.600" fontSize="sm">
                <li>Le lien CESU pour la démarche de fin de contrat</li>
                <li>
                  Un formulaire d&apos;upload pour les 3 documents (reçu solde de tout compte,
                  attestation employeur, certificat de travail)
                </li>
              </Box>
              <Text fontSize="sm" color="gray.600">
                Une relance automatique sera envoyée tous les 3 jours à 18h tant que les documents
                ne sont pas tous transmis.
              </Text>
              <FormControl isRequired>
                <FormLabel color="brand.600">Destinataire</FormLabel>
                <Select
                  placeholder="Sélectionner un destinataire"
                  value={selectedFinDeContratSigner}
                  onChange={e => setSelectedFinDeContratSigner(e.target.value)}
                >
                  {client?.email_parent1 && (
                    <option
                      value={`${client.email_parent1}|${client.first_name_parent1 || ''}|${client.last_name_parent1 || ''}`}
                    >
                      {client.first_name_parent1} {client.last_name_parent1} &lt;
                      {client.email_parent1}&gt; (Parent 1)
                    </option>
                  )}
                  {client?.email_parent2 && (
                    <option
                      value={`${client.email_parent2}|${client.first_name_parent2 || ''}|${client.last_name_parent2 || ''}`}
                    >
                      {client.first_name_parent2} {client.last_name_parent2} &lt;
                      {client.email_parent2}&gt; (Parent 2)
                    </option>
                  )}
                  {client?.email_jeune && (
                    <option
                      value={`${client.email_jeune}|${client.first_name_jeune || ''}|${client.last_name_jeune || ''}`}
                    >
                      {client.first_name_jeune} {client.last_name_jeune} &lt;{client.email_jeune}
                      &gt; (Jeune)
                    </option>
                  )}
                </Select>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                onFinDeContratClose();
                setSelectedFinDeContratSigner('');
              }}
            >
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchFinDeContratProcedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
              isDisabled={!selectedFinDeContratSigner}
            >
              Lancer la procédure
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isRenouvellementOpen} onClose={onRenouvellementClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Souhait de renouvellement
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Text>
                Vous êtes sur le point de lancer la procédure{' '}
                <strong>Souhait de renouvellement</strong>.
              </Text>
              <Text fontSize="sm" color="brand.600">
                Un email sera envoyé avec un lien sécurisé (valable 30 jours) pour demander si
                l'accompagnement est souhaité l'année prochaine.
              </Text>
              <FormControl isRequired>
                <FormLabel color="brand.600">Destinataire</FormLabel>
                <Select
                  placeholder="Sélectionner un destinataire"
                  value={selectedRenouvellementEmail}
                  onChange={e => setSelectedRenouvellementEmail(e.target.value)}
                >
                  {client?.email_parent1 && (
                    <option
                      value={`${client.email_parent1}|${client.first_name_parent1 || ''}|${client.last_name_parent1 || ''}`}
                    >
                      {client.first_name_parent1} {client.last_name_parent1} &lt;
                      {client.email_parent1}&gt; (Parent 1)
                    </option>
                  )}
                  {client?.email_parent2 && (
                    <option
                      value={`${client.email_parent2}|${client.first_name_parent2 || ''}|${client.last_name_parent2 || ''}`}
                    >
                      {client.first_name_parent2} {client.last_name_parent2} &lt;
                      {client.email_parent2}&gt; (Parent 2)
                    </option>
                  )}
                  {client?.email_jeune && (
                    <option
                      value={`${client.email_jeune}|${client.first_name_jeune || ''}|${client.last_name_jeune || ''}`}
                    >
                      {client.first_name_jeune} {client.last_name_jeune} &lt;{client.email_jeune}
                      &gt; (Jeune)
                    </option>
                  )}
                </Select>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                onRenouvellementClose();
                setSelectedRenouvellementEmail('');
              }}
            >
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchRenouvellementProcedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
              isDisabled={!selectedRenouvellementEmail}
            >
              Confirmer et envoyer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal - Envoi CV/Casier judiciaire */}
      <Modal isOpen={isCvCasierOpen} onClose={onCvCasierClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Envoyer CV actualisé / Casier judiciaire
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Sélectionnez le destinataire et ajoutez les fichiers à envoyer. Un lien sécurisé
                (valable 14 jours) sera envoyé par email pour télécharger les documents.
              </Text>

              <FormControl isRequired>
                <FormLabel>Destinataire</FormLabel>
                <Select
                  placeholder="Sélectionner un destinataire"
                  value={selectedCvCasierEmail}
                  onChange={e => setSelectedCvCasierEmail(e.target.value)}
                >
                  <option value={client?.email}>
                    {client?.first_name} {client?.last_name} &lt;{client?.email}&gt; (Contact
                    principal)
                  </option>
                  {client?.ecole_resp_modules_email && (
                    <option value={client.ecole_resp_modules_email}>
                      {client.ecole_resp_modules_prenom} {client.ecole_resp_modules_nom} &lt;
                      {client.ecole_resp_modules_email}&gt; (Resp. modules)
                    </option>
                  )}
                  {client?.ecole_resp_autorisation_email && (
                    <option value={client.ecole_resp_autorisation_email}>
                      {client.ecole_resp_autorisation_prenom} {client.ecole_resp_autorisation_nom}{' '}
                      &lt;{client.ecole_resp_autorisation_email}&gt; (Resp. autorisation prix)
                    </option>
                  )}
                  {client?.ecole_resp_facturation_email && (
                    <option value={client.ecole_resp_facturation_email}>
                      {client.ecole_resp_facturation_prenom} {client.ecole_resp_facturation_nom}{' '}
                      &lt;{client.ecole_resp_facturation_email}&gt; (Resp. facturation)
                    </option>
                  )}
                  {client?.ecole_resp_planning_email && (
                    <option value={client.ecole_resp_planning_email}>
                      {client.ecole_resp_planning_prenom} {client.ecole_resp_planning_nom} &lt;
                      {client.ecole_resp_planning_email}&gt; (Resp. planning)
                    </option>
                  )}
                  {client?.ecole_resp_notes_email && (
                    <option value={client.ecole_resp_notes_email}>
                      {client.ecole_resp_notes_prenom} {client.ecole_resp_notes_nom} &lt;
                      {client.ecole_resp_notes_email}&gt; (Resp. notes)
                    </option>
                  )}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Documents à envoyer</FormLabel>
                <Box
                  as="label"
                  htmlFor="cv-casier-files"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  p={6}
                  border="2px dashed"
                  borderColor="gray.300"
                  borderRadius="lg"
                  cursor="pointer"
                  _hover={{ borderColor: 'accent.500', bg: 'gray.50' }}
                  transition="all 0.2s"
                >
                  <Icon as={FiUpload} boxSize={8} color="gray.400" mb={2} />
                  <Text color="gray.500" fontSize="sm">
                    Cliquez pour sélectionner des fichiers
                  </Text>
                  <Text color="gray.400" fontSize="xs">
                    PDF, images, Word, etc.
                  </Text>
                  <Input
                    id="cv-casier-files"
                    type="file"
                    multiple
                    accept="*/*"
                    onChange={handleCvCasierFileChange}
                    display="none"
                  />
                </Box>

                {cvCasierFiles.length > 0 && (
                  <VStack mt={3} spacing={2} align="stretch">
                    {cvCasierFiles.map((file, index) => (
                      <Box
                        key={index}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        p={2}
                        bg="green.50"
                        border="1px solid"
                        borderColor="green.200"
                        borderRadius="md"
                      >
                        <HStack spacing={2}>
                          <Icon as={FiFile} color="green.500" />
                          <Text fontSize="sm" color="green.700" noOfLines={1}>
                            {file.name}
                          </Text>
                        </HStack>
                        <IconButton
                          aria-label="Supprimer"
                          icon={<Icon as={FiX} />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => removeCvCasierFile(index)}
                        />
                      </Box>
                    ))}
                  </VStack>
                )}
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCvCasierClose}>
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchCvCasierProcedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
              isDisabled={!selectedCvCasierEmail || cvCasierFiles.length === 0}
            >
              Envoyer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal - Contractualisation (signature électronique) */}
      <Modal
        isOpen={isContractualisationOpen}
        onClose={() => {
          onContractualisationClose();
          setSelectedContractualisationSigner('');
          setSelectedAnneeScolaire('');
          setContractTarifEcole('');
          resetContractArticlesState();
        }}
        isCentered
        size={{ base: 'md', md: '4xl' }}
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Contractualisation
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Vous êtes sur le point de lancer la procédure de <strong>Contractualisation</strong>.
            </Text>
            <Text mt={3} mb={4}>
              Une demande de signature électronique sera envoyée au signataire sélectionné via
              DocuSeal.
            </Text>

            <FormControl isRequired mb={4}>
              <FormLabel color="brand.600">Année scolaire</FormLabel>
              <Select
                placeholder="Sélectionner une année scolaire"
                value={selectedAnneeScolaire}
                onChange={e => setSelectedAnneeScolaire(e.target.value)}
              >
                {schoolYearOptions.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl mb={4}>
              <FormLabel color="brand.600">Tarif horaire HT (€)</FormLabel>
              <Input
                type="number"
                step="0.01"
                placeholder="Défaut : 44.80 €/h"
                value={contractTarifEcole}
                onChange={e => setContractTarifEcole(e.target.value)}
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel color="brand.600">Annexes (PDF) - optionnel</FormLabel>
              <Input
                type="file"
                accept=".pdf"
                multiple
                onChange={e => {
                  if (e.target.files) {
                    setContractAnnexeFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    e.target.value = '';
                  }
                }}
                p={1}
              />
              {contractAnnexeFiles.length > 0 && (
                <Stack mt={2} spacing={1}>
                  {contractAnnexeFiles.map((f, idx) => (
                    <HStack key={idx} bg="gray.50" p={2} borderRadius="md" justify="space-between">
                      <HStack spacing={2}>
                        <Icon as={FiFile} color="gray.500" boxSize={3} />
                        <Text fontSize="xs" color="gray.600" noOfLines={1}>
                          {f.name}
                        </Text>
                      </HStack>
                      <IconButton
                        aria-label="Supprimer"
                        icon={<Icon as={FiX} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() =>
                          setContractAnnexeFiles(prev => prev.filter((_, i) => i !== idx))
                        }
                      />
                    </HStack>
                  ))}
                </Stack>
              )}
            </FormControl>

            <FormControl isRequired>
              <FormLabel color="brand.600">Signataire</FormLabel>
              <Select
                placeholder="Sélectionner un signataire"
                value={selectedContractualisationSigner}
                onChange={e => setSelectedContractualisationSigner(e.target.value)}
              >
                {/* Contact principal */}
                {client?.email && (
                  <option
                    value={`${client.email}|${client.first_name}|${client.last_name}|${client.phone1 || ''}`}
                  >
                    {client.first_name} {client.last_name} &lt;{client.email}&gt; (Contact
                    principal)
                  </option>
                )}
                {/* Responsable modules */}
                {client?.ecole_resp_modules_email && (
                  <option
                    value={`${client.ecole_resp_modules_email}|${client.ecole_resp_modules_prenom}|${client.ecole_resp_modules_nom}|${client.ecole_resp_modules_phone || ''}`}
                  >
                    {client.ecole_resp_modules_prenom} {client.ecole_resp_modules_nom} &lt;
                    {client.ecole_resp_modules_email}&gt; (Resp. modules)
                  </option>
                )}
                {/* Responsable autorisation prix */}
                {client?.ecole_resp_autorisation_email && (
                  <option
                    value={`${client.ecole_resp_autorisation_email}|${client.ecole_resp_autorisation_prenom}|${client.ecole_resp_autorisation_nom}|${client.ecole_resp_autorisation_phone || ''}`}
                  >
                    {client.ecole_resp_autorisation_prenom} {client.ecole_resp_autorisation_nom}{' '}
                    &lt;{client.ecole_resp_autorisation_email}&gt; (Resp. autorisation prix)
                  </option>
                )}
                {/* Responsable facturation */}
                {client?.ecole_resp_facturation_email && (
                  <option
                    value={`${client.ecole_resp_facturation_email}|${client.ecole_resp_facturation_prenom}|${client.ecole_resp_facturation_nom}|${client.ecole_resp_facturation_phone || ''}`}
                  >
                    {client.ecole_resp_facturation_prenom} {client.ecole_resp_facturation_nom} &lt;
                    {client.ecole_resp_facturation_email}&gt; (Resp. facturation)
                  </option>
                )}
                {/* Responsable planning */}
                {client?.ecole_resp_planning_email && (
                  <option
                    value={`${client.ecole_resp_planning_email}|${client.ecole_resp_planning_prenom}|${client.ecole_resp_planning_nom}|${client.ecole_resp_planning_phone || ''}`}
                  >
                    {client.ecole_resp_planning_prenom} {client.ecole_resp_planning_nom} &lt;
                    {client.ecole_resp_planning_email}&gt; (Resp. planning)
                  </option>
                )}
                {/* Responsable notes */}
                {client?.ecole_resp_notes_email && (
                  <option
                    value={`${client.ecole_resp_notes_email}|${client.ecole_resp_notes_prenom}|${client.ecole_resp_notes_nom}|${client.ecole_resp_notes_phone || ''}`}
                  >
                    {client.ecole_resp_notes_prenom} {client.ecole_resp_notes_nom} &lt;
                    {client.ecole_resp_notes_email}&gt; (Resp. notes)
                  </option>
                )}
              </Select>
            </FormControl>

            <Text mt={4} fontSize="sm" color="gray.600">
              Le signataire recevra un email de DocuSeal avec un lien sécurisé pour signer le
              document.
            </Text>

            {/* Modification des articles avant prévisualisation / envoi */}
            <Box
              mt={5}
              p={3}
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              bg="gray.50"
            >
              <HStack justify="space-between" align="center" flexWrap="wrap" spacing={2}>
                <HStack spacing={2}>
                  <Icon as={FiEdit3} color="brand.500" />
                  <Text fontSize="sm" fontWeight="600" color="brand.600">
                    Articles du contrat
                  </Text>
                  {contractArticleOverrides.length > 0 && (
                    <Badge colorScheme="orange">
                      {contractArticleOverrides.length} modifié
                      {contractArticleOverrides.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </HStack>
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="brand"
                  onClick={() => setShowArticleEditor(v => !v)}
                  isDisabled={!selectedAnneeScolaire}
                >
                  {showArticleEditor ? 'Masquer' : 'Modifier le texte'}
                </Button>
              </HStack>

              {!selectedAnneeScolaire && (
                <Text mt={2} fontSize="xs" color="gray.500">
                  Sélectionnez une année scolaire pour afficher les articles.
                </Text>
              )}

              {showArticleEditor && selectedAnneeScolaire && (
                <Box mt={3}>
                  {contractArticlesLoading && contractArticles.length === 0 ? (
                    <HStack spacing={2} py={2}>
                      <Spinner size="sm" color="brand.500" />
                      <Text fontSize="sm" color="gray.600">
                        Chargement des articles...
                      </Text>
                    </HStack>
                  ) : contractArticles.length === 0 ? (
                    <Text fontSize="sm" color="gray.600">
                      Impossible de charger les articles. Le contrat sera généré avec les textes par
                      défaut.
                    </Text>
                  ) : (
                    <Stack spacing={3}>
                      <FormControl>
                        <FormLabel fontSize="sm" color="brand.600">
                          Article à modifier
                        </FormLabel>
                        <Select
                          size="sm"
                          bg="white"
                          value={selectedArticleId}
                          onChange={e => setSelectedArticleId(e.target.value)}
                        >
                          {contractArticles.map(article => {
                            const edited = contractArticleEdits[article.id];
                            const label = edited?.title ?? article.title;
                            return (
                              <option key={article.id} value={article.id}>
                                {edited ? '• ' : ''}
                                {label || '(article vidé)'}
                              </option>
                            );
                          })}
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="sm" color="brand.600">
                          Titre de l&apos;article
                        </FormLabel>
                        <Input
                          size="sm"
                          bg="white"
                          value={currentArticleTitle}
                          onChange={e => updateArticleDraft('title', e.target.value)}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="sm" color="brand.600">
                          Texte de l&apos;article
                        </FormLabel>
                        <Textarea
                          size="sm"
                          bg="white"
                          rows={12}
                          value={currentArticleBody}
                          onChange={e => updateArticleDraft('body', e.target.value)}
                          fontSize="sm"
                        />
                        <Text mt={2} fontSize="xs" color="gray.500">
                          Mise en page : le texte va automatiquement à la ligne.
                          <br />
                          <strong>**Texte**</strong> = ligne en gras &nbsp;|&nbsp;{' '}
                          <strong>- Texte</strong> = puce &nbsp;|&nbsp; <strong>!Texte</strong> =
                          ligne en rouge &nbsp;|&nbsp; ligne vide = saut de paragraphe.
                          <br />
                          Vider le titre et le texte retire l&apos;article du contrat.
                        </Text>
                      </FormControl>

                      <HStack spacing={2} flexWrap="wrap">
                        <Button
                          size="xs"
                          variant="outline"
                          leftIcon={<Icon as={FiRotateCcw} />}
                          onClick={() => resetArticle(selectedArticleId)}
                          isDisabled={!currentArticleEdit}
                        >
                          Réinitialiser cet article
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => {
                            invalidateEcolePreview();
                            setContractArticleEdits({});
                          }}
                          isDisabled={contractArticleOverrides.length === 0}
                        >
                          Tout réinitialiser
                        </Button>
                      </HStack>

                      <Divider />
                      <Text fontSize="xs" color="gray.500">
                        Les articles non modifiés restent synchronisés avec la fiche client (tarif,
                        année scolaire, volume horaire...). Pensez à vérifier l&apos;aperçu avant
                        l&apos;envoi : c&apos;est ce document qui partira en signature via DocuSeal.
                      </Text>
                    </Stack>
                  )}
                </Box>
              )}
            </Box>

            <Box mt={4}>
              <Button
                size="sm"
                variant="outline"
                colorScheme="brand"
                onClick={handlePreviewEcole}
                isLoading={previewLoading}
                isDisabled={!selectedAnneeScolaire}
              >
                Aperçu du contrat (PDF)
              </Button>
              {ecolePreviewUrl && (
                <Box mt={3}>
                  <Box
                    as="iframe"
                    src={ecolePreviewUrl}
                    w="100%"
                    h={{ base: '320px', md: '500px' }}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    title="Aperçu du contrat"
                  />
                  <Button
                    mt={2}
                    size="xs"
                    variant="link"
                    colorScheme="accent"
                    onClick={() => window.open(ecolePreviewUrl, '_blank')}
                  >
                    Ouvrir dans un nouvel onglet
                  </Button>
                </Box>
              )}
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                onContractualisationClose();
                setSelectedContractualisationSigner('');
                setSelectedAnneeScolaire('');
                setContractTarifEcole('');
                setContractAnnexeFiles([]);
                resetContractArticlesState();
                if (ecolePreviewUrl) {
                  URL.revokeObjectURL(ecolePreviewUrl);
                  setEcolePreviewUrl(null);
                }
              }}
            >
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchContractualisationProcedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
              isDisabled={!selectedContractualisationSigner || !selectedAnneeScolaire}
            >
              Envoyer la demande de signature
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal - Contractualisation Particulier (signature électronique CDD) */}
      <Modal
        isOpen={isContractualisationParticulierOpen}
        onClose={() => {
          onContractualisationParticulierClose();
          setSelectedContractualisationParticulierSigner('');
          setSelectedAnneeScolaire('');
          setContractDateDebut('');
          setContractDateFin('');
          setContractSalaireHoraireNet('');
        }}
        isCentered
        size={{ base: 'lg', md: '4xl' }}
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Contractualisation - CDD Particulier
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text>
                Vous êtes sur le point de lancer la procédure de{' '}
                <strong>Contractualisation (CDD)</strong>.
              </Text>
              <Text fontSize="sm" color="gray.600">
                Une demande de signature électronique sera envoyée au signataire sélectionné via
                DocuSeal.
              </Text>

              <FormControl isRequired>
                <FormLabel color="brand.600">Année scolaire</FormLabel>
                <Select
                  placeholder="Sélectionner une année scolaire"
                  value={selectedAnneeScolaire}
                  onChange={e => setSelectedAnneeScolaire(e.target.value)}
                >
                  {schoolYearOptions.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="brand.600">Date de début du contrat</FormLabel>
                <Input
                  type="date"
                  value={contractDateDebut}
                  onChange={e => setContractDateDebut(e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="brand.600">Date de fin du contrat</FormLabel>
                <Input
                  type="date"
                  value={contractDateFin}
                  onChange={e => setContractDateFin(e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="brand.600">Salaire horaire net (€)</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 35.00"
                  value={contractSalaireHoraireNet}
                  onChange={e => setContractSalaireHoraireNet(e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="brand.600">Signataire (employeur)</FormLabel>
                <Select
                  placeholder="Sélectionner un signataire"
                  value={selectedContractualisationParticulierSigner}
                  onChange={e => setSelectedContractualisationParticulierSigner(e.target.value)}
                >
                  {/* Parent 1 */}
                  {client?.email_parent1 && (
                    <option
                      value={`${client.email_parent1}|${client.first_name_parent1}|${client.last_name_parent1}|${client.phone_parent1 || ''}`}
                    >
                      {client.first_name_parent1} {client.last_name_parent1} &lt;
                      {client.email_parent1}&gt; (Parent 1)
                    </option>
                  )}
                  {/* Parent 2 */}
                  {client?.email_parent2 && (
                    <option
                      value={`${client.email_parent2}|${client.first_name_parent2}|${client.last_name_parent2}|${client.phone_parent2 || ''}`}
                    >
                      {client.first_name_parent2} {client.last_name_parent2} &lt;
                      {client.email_parent2}&gt; (Parent 2)
                    </option>
                  )}
                  {/* Jeune */}
                  {client?.email_jeune && (
                    <option
                      value={`${client.email_jeune}|${client.first_name_jeune || ''}|${client.last_name_jeune || ''}|${client.phone_jeune || ''}`}
                    >
                      {client.first_name_jeune} {client.last_name_jeune} &lt;{client.email_jeune}
                      &gt; (Jeune)
                    </option>
                  )}
                </Select>
              </FormControl>

              <Text fontSize="sm" color="gray.600">
                Le signataire recevra un email de DocuSeal avec un lien sécurisé pour signer le
                contrat de travail CDD.
              </Text>

              <Box>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="brand"
                  onClick={handlePreviewParticulier}
                  isLoading={previewLoading}
                  isDisabled={
                    !selectedContractualisationParticulierSigner ||
                    !selectedAnneeScolaire ||
                    !contractDateDebut ||
                    !contractDateFin ||
                    !contractSalaireHoraireNet
                  }
                >
                  Aperçu du contrat (PDF)
                </Button>
                {particulierPreviewUrl && (
                  <Box mt={3}>
                    <Box
                      as="iframe"
                      src={particulierPreviewUrl}
                      w="100%"
                      h={{ base: '320px', md: '700px' }}
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      title="Aperçu du contrat"
                    />
                    <Button
                      mt={2}
                      size="xs"
                      variant="link"
                      colorScheme="accent"
                      onClick={() => window.open(particulierPreviewUrl, '_blank')}
                    >
                      Ouvrir dans un nouvel onglet
                    </Button>
                  </Box>
                )}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                onContractualisationParticulierClose();
                setSelectedContractualisationParticulierSigner('');
                setSelectedAnneeScolaire('');
                setContractDateDebut('');
                setContractDateFin('');
                setContractSalaireHoraireNet('');
                if (particulierPreviewUrl) {
                  URL.revokeObjectURL(particulierPreviewUrl);
                  setParticulierPreviewUrl(null);
                }
              }}
            >
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchContractualisationParticulierProcedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
              isDisabled={
                !selectedContractualisationParticulierSigner ||
                !selectedAnneeScolaire ||
                !contractDateDebut ||
                !contractDateFin ||
                !contractSalaireHoraireNet
              }
            >
              Envoyer la demande de signature
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="brand.500">
              Supprimer le client
            </AlertDialogHeader>

            <AlertDialogBody>
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible et
              supprimera également toutes les procédures et documents associés.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Annuler
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteClient}
                ml={3}
                isLoading={isDeleting}
                loadingText="Suppression..."
              >
                Supprimer
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Modal de confirmation de suppression de document */}
      <AlertDialog
        isOpen={isDeleteDocOpen}
        leastDestructiveRef={cancelDocRef}
        onClose={onDeleteDocClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="brand.500">
              Supprimer le document
            </AlertDialogHeader>

            <AlertDialogBody>
              Êtes-vous sûr de vouloir supprimer le document <strong>{docToDelete?.title}</strong> ?
              Cette action est irréversible.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelDocRef} onClick={onDeleteDocClose}>
                Annuler
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteDocument}
                ml={3}
                isLoading={isDeletingDoc}
                loadingText="Suppression..."
              >
                Supprimer
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Modal Heures Réalisées */}
      <HeuresRealiséesModal
        isOpen={isHeuresOpen}
        onClose={() => {
          onHeuresClose();
          setEditingHeure(null);
        }}
        clientId={clientId}
        onSuccess={fetchHeures}
        clientTarifHoraire={client?.tarif_horaire}
        clientDistanceKm={client?.distance_km}
        defaultBaremeKm={defaultBaremeKm}
        initial={editingHeure}
        heuresRows={heuresRealisees}
      />

      {/* Modal Envoi de la déclaration mensuelle (récap) */}
      {client && (
        <SendRecapModal
          isOpen={isSendRecapOpen}
          onClose={onSendRecapClose}
          client={client}
          heures={heuresRealisees}
          initialMois={recapMois}
          onSuccess={fetchHeures}
        />
      )}
    </Stack>
  );
}
