// Procédure « Préparation accompagnement » (côté serveur uniquement) : envoi au parent 1 d'un lien
// vers le formulaire emploi du temps / contraintes / disponibilités, puis une relance unique.
// Utilisé par le bouton de la fiche, la Synthèse des disponibilités et le cron quotidien.
import { randomBytes } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/brevo';
import { getEmailTemplate } from '@/lib/email-templates-server';
import { renderTemplate, emailButton } from '@/lib/email-templates';
import { anneeScolaire, parisDate, preparationRelanceDate } from '@/lib/format';
import { launchProcedure } from '@/lib/procedures';
import type { Client } from '@/types';

export const PREPARATION_CODE = 'PREPARATION_ACCOMPAGNEMENT';

type Famille = Pick<Client, 'first_name_parent1' | 'email_parent1' | 'first_name_jeune'>;

// Variables + bouton communs à l'envoi et à la relance (lien = token de la procédure)
async function renderEmail(key: string, client: Famille, token: string, annee: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://arythmeethic.fr';
  return renderTemplate(
    await getEmailTemplate(key),
    {
      recipientName: client.first_name_parent1?.trim() || 'Madame, Monsieur',
      jeunePrenom: client.first_name_jeune?.trim() || 'votre enfant',
      anneeScolaire: annee,
    },
    emailButton(
      `${baseUrl}/formulaire/preparation-accompagnement/${token}`,
      `Emploi du temps ${annee} – Remplir le formulaire`
    )
  );
}

// Lancement : procédure DRAFT (lien, relance prévue dans deadline_at) + email au parent 1.
// `exclusiveSince` : envoi automatique, abandonné si une autre demande existe depuis cette date.
export async function launchPreparation(client: Client & Famille, exclusiveSince?: string) {
  const email = client.email_parent1?.trim();
  if (!email) return { success: false as const, error: "Le parent 1 n'a pas d'adresse email" };

  const token = randomBytes(32).toString('hex');
  const relance = preparationRelanceDate(parisDate(new Date()));
  // Lien valable 60 jours après la date de relance (réponses tardives, « Relancer » manuel)
  const expiresAt = new Date(Date.parse(relance) + 60 * 86_400_000);

  return launchProcedure({
    clientId: client.id,
    code: PREPARATION_CODE,
    fields: {
      download_token: token,
      download_token_expires_at: expiresAt.toISOString(),
      recipient_email: email,
      deadline_at: relance,
    },
    closePreviousDrafts: true,
    exclusiveSince,
    email: {
      to: [{ email, name: client.first_name_parent1 || '' }],
      ...(await renderEmail('preparation-accompagnement', client, token, anneeScolaire())),
    },
  });
}

// Relance d'une demande en attente (même lien) au parent 1 actuel de la fiche, sinon à l'adresse
// de l'envoi initial ; trace RELANCE_ENVOYEE et vide deadline_at (plus de relance automatique,
// même si l'historique n'a pas pu être écrit). L'appelant vérifie que la procédure est en attente.
export async function sendPreparationRelance(
  proc: { id: string; download_token: string; created_at: string; recipient_email: string | null },
  client: Famille
): Promise<{ success: boolean; reason?: string }> {
  const email = client.email_parent1?.trim() || proc.recipient_email;
  if (!email) return { success: false, reason: 'aucune adresse email' };
  const sent = await sendEmail({
    to: [{ email, name: client.first_name_parent1 || '' }],
    ...(await renderEmail(
      'preparation-accompagnement-relance',
      client,
      proc.download_token,
      anneeScolaire(new Date(proc.created_at))
    )),
  });
  if (sent.success) {
    const supabase = createServiceRoleClient();
    const [{ error }, { error: deadlineError }] = await Promise.all([
      supabase
        .from('procedure_status_history')
        .insert({ procedure_id: proc.id, status: 'RELANCE_ENVOYEE' }),
      supabase.from('procedures').update({ deadline_at: null }).eq('id', proc.id),
    ]);
    if (error || deadlineError)
      console.error(
        '[Préparation accompagnement] relance non tracée',
        proc.id,
        error,
        deadlineError
      );
  }
  return sent;
}
