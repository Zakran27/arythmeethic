import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { getSubmission, pendingSubmitters, signingLink } from '@/lib/docuseal';
import { syncContractSignature } from '@/lib/signatures';
import { processFinDeContratSignatures } from '@/lib/fin-de-contrat-signatures';
import { getEmailTemplate } from '@/lib/email-templates-server';
import { renderTemplate, signatureLinkBlock } from '@/lib/email-templates';
import { sendEmail } from '@/lib/brevo';
import { parisDate, daysBetween, weekday, anneeScolaire } from '@/lib/format';

export const maxDuration = 60;

/**
 * CRON quotidien (vercel.json « 0 7 * * * ») : statut réel des contrats DocuSeal + relances.
 * Pour chaque contractualisation SIGN_REQUESTED (seulement la version la plus récente de chaque
 * client + année scolaire, quel que soit son statut : une V2 signée/refusée/annulée bloque la V1) :
 *  - synchro DocuSeal (signé / refusé / archivé) ;
 *  - si le client n'a toujours pas signé : relance (particulier tous les 7 jours, établissement
 *    tous les 3 jours en jour ouvré ≈ 2/semaine), comptés depuis la dernière demande / relance ;
 *  - s'il ne manque que Florence : rien au client (simple ligne dans le résumé).
 * Puis les signatures des documents de fin de contrat (lib/fin-de-contrat-signatures.ts) : PDF
 * signés rapatriés et envoyés au parent, demande du solde après Florence, relance hebdomadaire.
 *
 * Route publique (CRON_SECRET absent sur Vercel, décision Thomas) ⇒ idempotente : l'échéance vient
 * de l'historique (SIGNATURE_DEMANDEE / RELANCE_ENVOYEE), et chaque envoi « réserve » la procédure
 * par un update conditionnel updated_at → maintenant, accepté seulement si updated_at date de plus
 * de 20 h : deux appels qui se chevauchent (même avant l'écriture de l'historique) n'envoient
 * qu'une fois. Relances ≥ 3 jours d'écart, crons Vercel ≥ 23 h d'écart ; un envoi Brevo raté est
 * retenté au passage du lendemain.
 * `?dry=1` : liste ce qui serait fait, n'envoie et n'écrit rien. Noms des clients seulement
 * pour un admin connecté (le résumé public ne contient que des identifiants).
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

    const { data: types } = await supabase
      .from('procedure_types')
      .select('id')
      .like('code', 'CONTRACTUALISATION%');
    const { data: procedures, error } = await supabase
      .from('procedures')
      .select(
        'id, client_id, annee_scolaire, status, docuseal_submission_id, relances_stoppees, created_at, updated_at, client:clients(type_client, organisation, first_name, last_name, first_name_jeune, last_name_jeune)'
      )
      .in(
        'procedure_type_id',
        (types ?? []).map(t => t.id)
      )
      .not('docuseal_submission_id', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const pendingIds = (procedures ?? []).filter(p => p.status === 'SIGN_REQUESTED').map(p => p.id);

    // Dernier envoi (demande initiale ou relance) par procédure en attente
    const lastSent: Record<string, string> = {};
    if (pendingIds.length) {
      const { data: history } = await supabase
        .from('procedure_status_history')
        .select('procedure_id, created_at')
        .in('procedure_id', pendingIds)
        .in('status', ['SIGNATURE_DEMANDEE', 'RELANCE_ENVOYEE']);
      for (const h of history ?? []) {
        if (!lastSent[h.procedure_id] || h.created_at > lastSent[h.procedure_id]) {
          lastSent[h.procedure_id] = h.created_at;
        }
      }
    }

    const now = new Date();
    const today = parisDate(now);
    const currentYear = anneeScolaire(now);
    const latest = new Set<string>(); // client|année déjà vus (tri du plus récent au plus ancien)
    const templates: Record<string, Awaited<ReturnType<typeof getEmailTemplate>>> = {};
    const results: { procedureId: string; client?: string; action: string }[] = [];

    for (const p of procedures ?? []) {
      const c = p.client as unknown as {
        type_client: string;
        organisation: string | null;
        first_name: string | null;
        last_name: string | null;
        first_name_jeune: string | null;
        last_name_jeune: string | null;
      } | null;
      const isEcole = c?.type_client === 'École';
      const group = `${p.client_id}|${p.annee_scolaire}`;
      const olderVersion = latest.has(group);
      latest.add(group);
      if (p.status !== 'SIGN_REQUESTED') continue; // version signée / refusée / annulée : sert de garde
      const log = (action: string) =>
        results.push({
          procedureId: p.id,
          ...(user && {
            client: isEcole
              ? c?.organisation || `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim()
              : `${c?.first_name ?? ''} ${c?.last_name ?? ''} (${c?.first_name_jeune ?? ''})`.trim(),
          }),
          action,
        });

      try {
        const submission = await getSubmission(p.docuseal_submission_id!);
        if (!submission) {
          log('soumission DocuSeal introuvable');
          continue;
        }
        const { status } = await syncContractSignature(p, { submission, dry });
        if (status !== 'SIGN_REQUESTED') {
          log(`${dry ? 'passerait' : 'passé'} en ${status}`);
          continue;
        }

        // Garde-fous sur les données existantes : jamais de relance pour une ancienne version encore
        // ouverte (doublon d'avant le versioning) ni pour une année scolaire terminée.
        if (olderVersion) {
          log('version remplacée encore ouverte (pas de relance)');
          continue;
        }
        if (p.annee_scolaire && p.annee_scolaire < currentYear) {
          log(`année ${p.annee_scolaire} terminée (pas de relance)`);
          continue;
        }

        if (p.relances_stoppees) {
          log('relances stoppées depuis la fiche');
          continue;
        }

        const signer = pendingSubmitters(submission).find(s => s.role === 'Client');
        if (!signer) {
          console.log('[cron signatures] en attente de la signature de Florence', p.id);
          log('en attente de Florence (pas de relance client)');
          continue;
        }

        const days = daysBetween(parisDate(new Date(lastSent[p.id] ?? p.created_at)), today);
        const wd = weekday(today);
        // ponytail: jours calendaires à Paris (insensible à la dérive ±59 min du cron Vercel)
        const due = isEcole ? days >= 3 && wd >= 1 && wd <= 5 : days >= 7;
        if (!due) {
          log(`pas encore (dernier envoi il y a ${days} j)`);
          continue;
        }
        const claimBefore = new Date(now.getTime() - 20 * 3600_000).toISOString();
        if (dry) {
          log(
            Date.parse(p.updated_at) >= Date.parse(claimBefore)
              ? 'réservée il y a moins de 20 h : pas de relance'
              : `relancerait ${user ? signer.email : 'le client'} (dernier envoi il y a ${days} j)`
          );
          continue;
        }

        // Réservation atomique : refusée si la procédure a été réservée (ou modifiée) il y a < 20 h
        const { data: claimed } = await supabase
          .from('procedures')
          .update({ updated_at: now.toISOString() })
          .eq('id', p.id)
          .eq('status', 'SIGN_REQUESTED')
          .lt('updated_at', claimBefore)
          .select('id');
        if (!claimed?.length) {
          log('réservée il y a moins de 20 h (autre appel) : pas de relance');
          continue;
        }

        const key = isEcole
          ? 'contractualisation-ecole-relance'
          : 'contractualisation-particulier-relance';
        templates[key] ??= await getEmailTemplate(key);
        const email = renderTemplate(
          templates[key],
          { recipientName: signer.name.split(' ')[0] },
          signatureLinkBlock(signingLink(signer.slug))
        );
        const sent = await sendEmail({
          to: [{ email: signer.email, name: signer.name }],
          ...email,
        });
        if (!sent.success) {
          log(`échec de l'envoi (${sent.reason ?? 'Brevo'})`); // réessayé au prochain passage
          continue;
        }
        const { error: histError } = await supabase
          .from('procedure_status_history')
          .insert({ procedure_id: p.id, status: 'RELANCE_ENVOYEE' });
        // ponytail: sans historique, la réservation 20 h bloque les doublons du jour mais la relance
        // repartirait le lendemain — on le signale seulement (échec d'insert très improbable)
        if (histError)
          console.error('[cron signatures] historique RELANCE_ENVOYEE non écrit', p.id, histError);
        log('relance envoyée');
      } catch (e) {
        console.error('[cron signatures]', p.id, e);
        log('erreur (voir logs)');
      }
    }

    // Fin de contrat : indépendant des contrats (une erreur ici n'annule pas le résumé ci-dessus)
    const finDeContrat = await processFinDeContratSignatures({ dry, withNames: !!user }).catch(
      e => {
        console.error('[cron signatures] fin de contrat', e);
        return [{ procedureId: '-', action: 'fin de contrat : erreur (voir logs)' }];
      }
    );
    results.push(...finDeContrat);

    return NextResponse.json({
      success: true,
      dry,
      checked: pendingIds.length,
      sent: results.filter(r => r.action === 'relance envoyée').length,
      results,
    });
  } catch (err) {
    console.error('Cron signatures error:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
