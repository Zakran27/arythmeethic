export type ProcStatus =
  | 'DRAFT'
  | 'PDF_GENERATED'
  | 'SIGN_REQUESTED'
  | 'SIGNED'
  | 'REFUSED'
  | 'EXPIRED'
  | 'CLOSED';

export type ClientType = 'Particulier' | 'École';

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
  phone?: string;
  type_client: ClientType;
  organisation?: string;
  address_line1?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  notes?: string;
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
  owner?: string;
  upload_token?: string;
  upload_token_expires_at?: string;
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
