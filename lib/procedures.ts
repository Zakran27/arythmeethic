// Côté serveur uniquement (service role + clé Brevo).
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
export async function launchProcedure({
  clientId,
  code,
  fields = {},
  closePreviousDrafts = false,
  email,
}: {
  clientId: string;
  code: string;
  fields?: Record<string, unknown>;
  closePreviousDrafts?: boolean;
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
