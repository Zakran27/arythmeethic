// Côté serveur uniquement (service role + clé Brevo).
import { randomBytes } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/brevo';
import type { Client } from '@/types';

export type FamilyMember = 'parent1' | 'parent2' | 'jeune';
export const FAMILY_MEMBERS: FamilyMember[] = ['parent1', 'parent2', 'jeune'];

// Coordonnées d'un membre de la famille, relues depuis la fiche (jamais depuis le navigateur).
export function familyContact(client: Client, who: FamilyMember) {
  return {
    email: client[`email_${who}`]?.trim() || '',
    firstName: client[`first_name_${who}`]?.trim() || '',
  };
}

type LaunchResult = { success: true; procedureId: string } | { success: false; error: string };

// Crée la procédure (DRAFT + `fields`), envoie l'email puis trace MAIL_ENVOYE.
// Email en échec → la procédure est supprimée (rien n'apparaît comme « envoyé »).
// `closePreviousDrafts` : les anciennes procédures DRAFT du même type passent en CLOSED
// (leurs liens deviennent invalides).
// `exclusiveSince` (envois automatiques) : abandon sans email si une AUTRE procédure du même type
// existe pour ce client depuis cette date — vérifié APRÈS l'insertion, donc deux appels simultanés
// n'envoient jamais deux fois (au pire aucun des deux : reprise au passage suivant).
export async function launchProcedure({
  clientId,
  code,
  fields = {},
  closePreviousDrafts = false,
  exclusiveSince,
  email,
}: {
  clientId: string;
  code: string;
  fields?: Record<string, unknown>;
  closePreviousDrafts?: boolean;
  exclusiveSince?: string;
  email: Parameters<typeof sendEmail>[0];
}): Promise<LaunchResult> {
  const supabase = createServiceRoleClient();
  const { data: type } = await supabase
    .from('procedure_types')
    .select('id')
    .eq('code', code)
    .maybeSingle();
  if (!type) return { success: false, error: `Type de procédure ${code} introuvable` };

  const { data: procedure, error } = await supabase
    .from('procedures')
    .insert({ client_id: clientId, procedure_type_id: type.id, status: 'DRAFT', ...fields })
    .select('id')
    .single();
  if (error || !procedure) {
    console.error(`Error creating ${code} procedure:`, error);
    return { success: false, error: 'Erreur lors de la création de la procédure' };
  }

  if (exclusiveSince) {
    const { data: others, error: othersError } = await supabase
      .from('procedures')
      .select('id')
      .eq('client_id', clientId)
      .eq('procedure_type_id', type.id)
      .gte('created_at', exclusiveSince)
      .neq('id', procedure.id)
      .limit(1);
    if (othersError || others?.length) {
      await supabase.from('procedures').delete().eq('id', procedure.id);
      return { success: false, error: 'Procédure déjà lancée pour ce client' };
    }
  }

  const sent = await sendEmail(email);
  if (!sent.success) {
    await supabase.from('procedures').delete().eq('id', procedure.id);
    return {
      success: false,
      error: `L'email n'a pas pu être envoyé (${sent.reason ?? 'erreur Brevo'})`,
    };
  }

  await supabase
    .from('procedure_status_history')
    .insert({ procedure_id: procedure.id, status: 'MAIL_ENVOYE' });
  if (closePreviousDrafts) {
    await supabase
      .from('procedures')
      .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('procedure_type_id', type.id)
      .eq('status', 'DRAFT')
      .neq('id', procedure.id);
  }
  return { success: true, procedureId: procedure.id };
}

// Recueil des informations (particulier) : client du token `form_token`, s'il est encore valide.
// `columns` = colonnes à relire en plus. Utilisé par le formulaire public et sa route d'upload.
export async function findRecueilClient(
  token: unknown,
  columns: string
): Promise<{ client: Client } | { client: null; error: string; status: number }> {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return { client: null, error: 'Lien invalide ou expiré', status: 404 };
  }
  const { data: client } = await createServiceRoleClient()
    .from('clients')
    .select<string, Client>(`id, type_client, form_token_expires_at, ${columns}`)
    .eq('form_token', token)
    .maybeSingle();
  // Le token École (même colonne) ouvre l'autre formulaire, pas celui-ci
  if (!client || client.type_client === 'École') {
    return { client: null, error: 'Lien invalide ou expiré', status: 404 };
  }
  if (client.form_token_expires_at && new Date(client.form_token_expires_at) < new Date()) {
    return {
      client: null,
      error: 'Ce lien a expiré. Veuillez contacter A Rythme Ethic.',
      status: 410,
    };
  }
  return { client };
}

// Procédure DRAFT d'un formulaire public par son lien (`download_token`), du type `code`, encore
// valide. `columns` = colonnes / jointures à relire en plus. Sinon : message + statut HTTP.
type TokenProcedure = {
  id: string;
  client_id: string;
  status: string;
  created_at: string;
  download_token_expires_at: string | null;
};
export async function findDraftProcedure<T extends object = object>(
  token: unknown,
  code: string,
  columns = ''
): Promise<{ procedure: TokenProcedure & T } | { procedure: null; error: string; status: number }> {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return { procedure: null, error: 'Lien invalide', status: 404 };
  }
  const { data: procedure } = await createServiceRoleClient()
    .from('procedures')
    .select<string, TokenProcedure & T & { procedure_types: { code: string } | null }>(
      `id, client_id, status, created_at, download_token_expires_at, procedure_types(code)${columns ? `, ${columns}` : ''}`
    )
    .eq('download_token', token)
    .maybeSingle();
  // Le token doit appartenir à une procédure de CE type (pas à une fin de contrat, etc.)
  if (!procedure || procedure.procedure_types?.code !== code) {
    return { procedure: null, error: 'Lien invalide', status: 404 };
  }
  if (procedure.status === 'SIGNED') {
    return { procedure: null, error: 'Votre réponse a déjà été enregistrée. Merci !', status: 410 };
  }
  if (
    procedure.status !== 'DRAFT' ||
    (procedure.download_token_expires_at &&
      new Date(procedure.download_token_expires_at) < new Date())
  ) {
    return {
      procedure: null,
      error: "Ce lien n'est plus valide. Contactez-moi si besoin.",
      status: 410,
    };
  }
  return { procedure };
}

// URL d'upload signée (formulaires publics) : le navigateur envoie le fichier directement au
// Storage `client-files` (pas de limite Vercel de 4,5 Mo), sous `folder`. null = trop d'envois.
export async function signedUploadUrl(
  folder: string,
  ext: string
): Promise<{ path: string; uploadToken: string } | null> {
  const storage = createServiceRoleClient().storage.from('client-files');
  // ponytail: plafond grossier par dossier (12 fichiers sur 7 jours) — contournable en demandant
  // les URL avant d'envoyer, et taille/type déclarés non garantis : la vraie garde est un
  // file_size_limit sur le bucket client-files (réglage Supabase)
  const { data: existing } = await storage.list(folder, { limit: 100 });
  const recent = (existing || []).filter(
    o => Date.now() - Date.parse(o.created_at) < 7 * 24 * 3600 * 1000
  );
  if (recent.length >= 12) return null;

  const path = `${folder}/${randomBytes(16).toString('hex')}.${ext}`;
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) throw error;
  return { path, uploadToken: data.token };
}
