export type ProcStatus =
  | 'DRAFT'
  | 'PDF_GENERATED'
  | 'SIGN_REQUESTED'
  | 'SIGNED'
  | 'REFUSED'
  | 'EXPIRED'
  | 'CLOSED';

export type ClientType = 'Particulier' | 'École';

export type ClientSubType = 'Jeune' | 'Parent' | null;

export type ClientStatus = 'Prospect' | 'Client';

export type DocumentKind = 'CONTRACT' | 'CONTRACT_SIGNED' | 'ANNEX' | 'SUPPORTING_DOC';

export type UploadedBy = 'ADMIN' | 'CLIENT' | 'EMAIL';

export interface Profile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone1?: string;
  type_client: ClientType;
  sub_type?: ClientSubType;
  client_status: ClientStatus;
  organisation?: string;
  address_line1?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  notes?: string;
  // New fields for Particulier (Jeune/Parent)
  first_name_jeune?: string;
  last_name_jeune?: string;
  email_jeune?: string;
  phone_jeune?: string;
  first_name_parent1?: string;
  last_name_parent1?: string;
  email_parent1?: string;
  phone_parent1?: string;
  first_name_parent2?: string;
  last_name_parent2?: string;
  email_parent2?: string;
  phone_parent2?: string;
  // Additional fields from contact form
  niveau_eleve?: string;
  demande_type?: string;
  how_did_you_hear?: string;
  referrer_name?: string;
  // Fields for "Recueil des informations" procedure
  numero_cesu?: string;
  adresse_cours?: string;
  etablissement_scolaire?: string;
  moyenne_maths?: string;
  moyenne_generale?: string;
  jours_disponibles?: string[];
  form_token?: string;
  form_token_expires_at?: string;
  // Fields for "Souhait de renouvellement" procedure
  renouvellement_souhaite?: boolean;
  renouvellement_commentaire?: string;
  renouvellement_date_reponse?: string;
  renouvellement_token?: string;
  renouvellement_token_expires_at?: string;
  renouvellement_dernier_email_at?: string;
  // École-specific fields for "Recueil des informations"
  ecole_siret?: string;
  ecole_nda?: string;
  ecole_nda_region?: string;
  // Frais pris en charge par l'établissement
  ecole_frais_midi_montant?: number;
  ecole_frais_midi_conditions?: string;
  ecole_frais_deplacement_rembourse?: boolean;
  ecole_frais_km_prix?: number;
  // Responsable modules
  ecole_resp_modules_nom?: string;
  ecole_resp_modules_prenom?: string;
  ecole_resp_modules_email?: string;
  ecole_resp_modules_phone?: string;
  ecole_resp_modules_peut_negocier?: boolean;
  // Responsable autorisation prix
  ecole_resp_autorisation_nom?: string;
  ecole_resp_autorisation_prenom?: string;
  ecole_resp_autorisation_email?: string;
  ecole_resp_autorisation_phone?: string;
  // Responsable facturation
  ecole_resp_facturation_nom?: string;
  ecole_resp_facturation_prenom?: string;
  ecole_resp_facturation_email?: string;
  ecole_resp_facturation_phone?: string;
  // Responsable planning
  ecole_resp_planning_nom?: string;
  ecole_resp_planning_prenom?: string;
  ecole_resp_planning_email?: string;
  ecole_resp_planning_phone?: string;
  // Module info
  ecole_module_nom?: string;
  ecole_module_heures?: number;
  ecole_formation_type?: 'initiale_en_alternance' | 'continue';
  ecole_classes_noms?: string;
  ecole_groupe_taille?: number;
  ecole_evaluation_modalites?: string;
  ecole_evaluation_nombre_min?: number;
  ecole_module_periode?: string;
  // Enseignant
  ecole_enseignant_nom?: string;
  ecole_enseignant_prenom?: string;
  ecole_enseignant_email?: string;
  created_at: string;
}

export interface ProcedureType {
  id: string;
  code: string;
  label: string;
  is_active: boolean;
}

export interface Procedure {
  id: string;
  client_id: string;
  procedure_type_id: string;
  status: ProcStatus;
  yousign_procedure_id?: string;
  yousign_file_id?: string;
  deadline_at?: string;
  signed_at?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  procedure_type?: ProcedureType;
}

export interface Document {
  id: string;
  procedure_id?: string;
  kind: DocumentKind;
  title: string;
  storage_path?: string;
  uploaded_by: UploadedBy;
  original_filename?: string;
  hash_sha256?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  source: string;
  event: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

// Status labels for procedure history (human-readable)
export type ProcedureStatusLabel =
  | 'MAIL_ENVOYE'
  | 'FORMULAIRE_REMPLI'
  | 'RELANCE_ENVOYEE'
  | 'MAIL_AVIS_GOOGLE_ENVOYE';

export interface ProcedureStatusHistory {
  id: string;
  procedure_id: string;
  status: ProcedureStatusLabel;
  created_at: string;
  // Joined data
  procedure?: Procedure;
}

// Helper to get French label for status
export const statusLabels: Record<ProcedureStatusLabel, string> = {
  'MAIL_ENVOYE': 'Mail envoyé',
  'FORMULAIRE_REMPLI': 'Formulaire rempli',
  'RELANCE_ENVOYEE': 'Relance envoyée',
  'MAIL_AVIS_GOOGLE_ENVOYE': 'Mail avis Google envoyé',
};
