import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { debutCampagne, parisDate } from '@/lib/format';
import {
  PREPARATION_CODE,
  launchPreparation,
  sendPreparationRelance,
} from '@/lib/preparation-accompagnement';
import type { Client } from '@/types';

export const maxDuration = 60;

/**
 * CRON quotidien (vercel.json « 0 16 * * * » ≈ 18h à Paris) — procédure Préparation accompagnement.
 *  a) Campagne, SEULEMENT du 20 au 31 août (heure de Paris ; les jours suivants rattrapent un passage
 *     manqué) : chaque particulier Client avec un email parent 1, qui a confirmé l'accompagnement
 *     ou le renouvellement, sans « Non » au renouvellement de l'année, et sans demande depuis le
 *     1er juin, reçoit la demande (même chemin que le bouton de la fiche).
 *  b) Relance unique : demande en attente (lien valide) d'une fiche non archivée dont la date de
 *     relance (deadline_at) est arrivée et pas encore relancée (une relance manuelle vide aussi
 *     deadline_at).
 *
 * Route publique (CRON_SECRET absent sur Vercel, décision Thomas) ⇒ idempotente, état en base :
 *  - campagne : une demande existe depuis le 1er juin → plus jamais d'envoi ; deux appels
 *    simultanés : `exclusiveSince` (lib/procedures) garantit au plus un email ;
 *  - relance : réservation atomique (deadline_at → null, accepté une seule fois) avant l'envoi,
 *    remise en place si Brevo échoue (nouvel essai au passage suivant) + historique RELANCE_ENVOYEE.
 * `?dry=1` : liste ce qui serait fait, n'envoie et n'écrit rien. Noms des familles seulement pour
 * un admin connecté (le résumé public ne contient que des identifiants, sans détail d'erreur).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = request.nextUrl.searchParams.get('dry') === '1';

  try {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    const supabase = createServiceRoleClient();
    const now = new Date();
    const today = parisDate(now);
    const since = debutCampagne(now);
    const results: { clientId: string; procedureId?: string; client?: string; action: string }[] =
      [];
    const log = (
      c: Pick<Client, 'id' | 'first_name_jeune' | 'last_name_jeune'> | null,
      clientId: string,
      action: string,
      procedureId?: string,
      detail?: string // réponse Brevo… : admin connecté seulement (texte tiers)
    ) =>
      results.push({
        clientId,
        ...(procedureId && { procedureId }),
        ...(user && { client: `${c?.first_name_jeune ?? ''} ${c?.last_name_jeune ?? ''}`.trim() }),
        action: user && detail ? `${action} (${detail})` : action,
      });

    const { data: type } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', PREPARATION_CODE)
      .single();
    if (!type) throw new Error(`Type de procédure ${PREPARATION_CODE} introuvable`);

    // a) Campagne (fenêtre 20 → 31 août, jamais en dehors)
    const year = today.slice(0, 4);
    const campagne = today >= `${year}-08-20` && today <= `${year}-08-31`;
    if (campagne) {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('type_client', 'Particulier')
        .eq('client_status', 'Client')
        .not('email_parent1', 'is', null)
        .neq('email_parent1', '')
        .or('accompagnement_confirme.eq.true,renouvellement_souhaite.eq.true')
        // « Non » au renouvellement de juin l'emporte sur une confirmation d'une année passée
        .not('renouvellement_souhaite', 'is', false);
      if (error) throw error;
      const { data: dejaLances, error: procError } = await supabase
        .from('procedures')
        .select('client_id')
        .eq('procedure_type_id', type.id)
        .gte('created_at', since);
      if (procError) throw procError;
      const deja = new Set((dejaLances ?? []).map(p => p.client_id));

      for (const c of (clients ?? []) as Client[]) {
        if (deja.has(c.id) || !c.email_parent1?.trim()) continue;
        if (dry) {
          log(c, c.id, 'enverrait la demande');
          continue;
        }
        try {
          const r = await launchPreparation(c, since);
          if (r.success) log(c, c.id, 'demande envoyée');
          else {
            console.error('[cron preparation-accompagnement] non envoyée', c.id, r.error);
            log(c, c.id, 'non envoyée', undefined, r.error);
          }
        } catch (e) {
          console.error('[cron preparation-accompagnement] lancement', c.id, e);
          log(c, c.id, 'erreur (voir logs)');
        }
      }
    }

    // b) Relance unique des demandes en attente dont la date de relance est arrivée
    const { data: pending, error: pendingError } = await supabase
      .from('procedures')
      .select(
        'id, client_id, deadline_at, download_token, created_at, recipient_email, client:clients(id, client_status, first_name_parent1, email_parent1, first_name_jeune, last_name_jeune)'
      )
      .eq('procedure_type_id', type.id)
      .eq('status', 'DRAFT')
      .lte('deadline_at', today)
      .gt('download_token_expires_at', now.toISOString())
      .not('download_token', 'is', null);
    if (pendingError) throw pendingError;
    const ids = (pending ?? []).map(p => p.id);
    const { data: relances, error: relError } = ids.length
      ? await supabase
          .from('procedure_status_history')
          .select('procedure_id')
          .in('procedure_id', ids)
          .eq('status', 'RELANCE_ENVOYEE')
      : { data: [], error: null };
    if (relError) throw relError;
    const dejaRelancees = new Set((relances ?? []).map(h => h.procedure_id));

    for (const p of pending ?? []) {
      const c = p.client as unknown as Pick<
        Client,
        | 'id'
        | 'client_status'
        | 'first_name_parent1'
        | 'email_parent1'
        | 'first_name_jeune'
        | 'last_name_jeune'
      > | null;
      if (!c || c.client_status === 'Archivé' || dejaRelancees.has(p.id)) continue;
      if (dry) {
        log(c, p.client_id, `relancerait (relance prévue le ${p.deadline_at})`, p.id);
        continue;
      }
      try {
        // Réservation atomique : un seul appel peut passer deadline_at à null
        const { data: claimed } = await supabase
          .from('procedures')
          .update({ deadline_at: null })
          .eq('id', p.id)
          .eq('status', 'DRAFT')
          .eq('deadline_at', p.deadline_at)
          .select('id');
        if (!claimed?.length) {
          log(c, p.client_id, 'déjà traitée par un autre appel', p.id);
          continue;
        }
        const sent = await sendPreparationRelance(
          { ...p, download_token: p.download_token as string },
          c
        );
        if (!sent.success) {
          await supabase.from('procedures').update({ deadline_at: p.deadline_at }).eq('id', p.id);
          console.error('[cron preparation-accompagnement] relance non envoyée', p.id, sent.reason);
          log(c, p.client_id, "échec de l'envoi", p.id, sent.reason ?? 'Brevo');
          continue;
        }
        log(c, p.client_id, 'relance envoyée', p.id);
      } catch (e) {
        console.error('[cron preparation-accompagnement] relance', p.id, e);
        log(c, p.client_id, 'erreur (voir logs)', p.id);
      }
    }

    return NextResponse.json({
      success: true,
      dry,
      today,
      campagne,
      envoyees: results.filter(r => r.action === 'demande envoyée').length,
      relancees: results.filter(r => r.action === 'relance envoyée').length,
      results,
    });
  } catch (err) {
    console.error('Cron preparation-accompagnement error:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
