// Côté serveur uniquement : signature électronique (DocuSeal) des 3 documents de fin de contrat
// déposés par la famille. Reçu pour solde de tout compte : Florence (salariée) PUIS le parent ;
// attestation employeur + certificat de travail : le parent seul.
// Pas de webhook DocuSeal : le suivi (PDF signé, demande du solde après Florence, relances
// hebdomadaires) passe par le cron quotidien /api/cron/signatures.
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  createSubmission,
  getSubmission,
  archiveSubmission,
  pendingSubmitters,
  signingLink,
  type DocusealSubmission,
} from '@/lib/docuseal';
import { sendEmail } from '@/lib/brevo';
import { getEmailTemplate } from '@/lib/email-templates-server';
import { renderTemplate, emailButton } from '@/lib/email-templates';
import { FAMILY_MEMBERS, familyContact } from '@/lib/procedures';
import { FDC_LABELS, FDC_FILENAMES, fdcKindOfTitle, type FdcKind } from '@/lib/fin-de-contrat';
import { parisDate, daysBetween } from '@/lib/format';
import { SPOTS, locateSignatureAreas } from '@/lib/fin-de-contrat-spots';
import type { Client } from '@/types';

const FLORENCE = { email: 'florence.louazel@arythmeethic.fr', name: 'Florence LOUAZEL' };

// ─── Données ────────────────────────────────────────────────────────────────
interface FdcDoc {
  id: string;
  title: string;
  storage_path: string | null;
  docuseal_submission_id: string | null;
  signed_at: string | null;
}
interface FdcProcedure {
  id: string;
  client_id: string;
  status: string;
  recipient_email: string | null;
  updated_at: string;
  created_at: string;
  relances_stoppees: boolean | null;
  client: Client | null;
}

const PROC_COLUMNS =
  'id, client_id, status, recipient_email, updated_at, created_at, relances_stoppees, client:clients(*)';

async function loadDocs(procedureId: string): Promise<(FdcDoc & { kind: FdcKind })[]> {
  const { data } = await createServiceRoleClient()
    .from('documents')
    .select('id, title, storage_path, docuseal_submission_id, signed_at')
    .eq('procedure_id', procedureId)
    .eq('kind', 'SUPPORTING_DOC')
    .in('title', Object.values(FDC_LABELS));
  return (data ?? []).flatMap((d: FdcDoc) => {
    const kind = fdcKindOfTitle(d.title);
    return kind ? [{ ...d, kind }] : [];
  });
}

// Le parent destinataire de la fin de contrat : nom relu sur la fiche (sinon nom du contact).
function parentOf(proc: FdcProcedure): { email: string; firstName: string; fullName: string } {
  const email = proc.recipient_email?.trim() || '';
  const c = proc.client;
  for (const who of FAMILY_MEMBERS) {
    if (!c) break;
    const m = familyContact(c, who);
    if (m.email && m.email.toLowerCase() === email.toLowerCase()) {
      const last = (c[`last_name_${who}` as keyof Client] as string | undefined)?.trim() || '';
      return { email, firstName: m.firstName, fullName: `${m.firstName} ${last}`.trim() || email };
    }
  }
  const full = `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim();
  return { email, firstName: c?.first_name || '', fullName: full || email };
}

// ─── Lancement ──────────────────────────────────────────────────────────────
// Crée les soumissions DocuSeal manquantes (idempotent : une par document), puis envoie au parent
// l'email avec les liens qu'il peut déjà signer. Appelé quand le 3e document est déposé, et
// re-tenté par le cron pour un document resté sans soumission (erreur DocuSeal, PDF illisible…).
export async function startFinDeContratSignatures(procedureId: string): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data: proc } = await supabase
    .from('procedures')
    .select(PROC_COLUMNS)
    .eq('id', procedureId)
    .single<FdcProcedure>();
  if (!proc || proc.status !== 'SIGN_REQUESTED') return ['procédure non en attente de signature'];
  const parent = parentOf(proc);
  if (!parent.email) return ['aucun email de destinataire sur la procédure'];

  const errors: string[] = [];
  let created = 0;
  for (const doc of await loadDocs(procedureId)) {
    if (doc.docuseal_submission_id || !doc.storage_path) continue;
    try {
      const { data: file, error } = await supabase.storage
        .from('client-files')
        .download(doc.storage_path);
      if (error || !file) throw error ?? new Error('fichier introuvable');
      const pdf = Buffer.from(await file.arrayBuffer());

      const spot = SPOTS[doc.kind];
      const { areas, anchored } = await locateSignatureAreas(
        pdf,
        spot.florence ? [spot.florence, spot.client] : [spot.client]
      );
      if (anchored.some(a => !a)) {
        console.warn('[FdC signatures] repère introuvable, position par défaut', doc.id, doc.title);
      }
      const clientArea = areas[areas.length - 1];
      const { submissionId } = await createSubmission({
        pdfBuffer: pdf,
        filename: `${FDC_FILENAMES[doc.kind]}.pdf`,
        order: spot.florence ? 'preserved' : 'random',
        signers: [
          // Florence reçoit l'email DocuSeal ; le parent reçoit nos emails (charte A Rythme Ethic)
          ...(spot.florence ? [{ role: 'Florence', ...FLORENCE, fields: areas[0] }] : []),
          {
            role: 'Client',
            email: parent.email,
            name: parent.fullName,
            fields: clientArea,
            sendEmail: false,
          },
        ],
      });
      const { data: saved } = await supabase
        .from('documents')
        .update({ docuseal_submission_id: submissionId })
        .eq('id', doc.id)
        .is('docuseal_submission_id', null)
        .select('id');
      if (!saved?.length) {
        // Un autre appel a créé la sienne entre-temps : on retire le doublon
        await archiveSubmission(submissionId).catch(() => {});
        continue;
      }
      created++;
    } catch (e) {
      console.error('[FdC signatures] création impossible', doc.id, e);
      errors.push(`${doc.title} : création de la signature impossible`);
    }
  }

  if (created > 0) {
    const sent = await notifyParent(proc, 'demande');
    if (sent.error) errors.push(sent.error);
  }
  return errors;
}

// ─── Emails au parent ───────────────────────────────────────────────────────
type Pending = { doc: FdcDoc & { kind: FdcKind }; sub: DocusealSubmission };

// Liens que le parent peut signer maintenant (pour le solde : seulement après Florence).
function parentLinks(pending: Pending[]) {
  const links: { label: string; url: string }[] = [];
  let waitingFlorence = false;
  for (const { doc, sub } of pending) {
    const open = pendingSubmitters(sub);
    const client = open.find(s => s.role === 'Client');
    if (!client || client.declined_at) continue;
    if (open.some(s => s.role === 'Florence')) waitingFlorence = true;
    else links.push({ label: FDC_LABELS[doc.kind], url: signingLink(client.slug) });
  }
  return { links, waitingFlorence };
}

function linksBlock(links: { label: string; url: string }[], waitingFlorence: boolean): string {
  const p = (html: string, extra = '') =>
    `<p style="margin:0 0 12px 0;color:#7b4a31;font-size:16px;line-height:1.6;${extra}">${html}</p>`;
  return (
    links
      .map(
        l =>
          p(`<strong>${l.label}</strong>`, 'margin-top:20px;') +
          emailButton(l.url, 'Signer le document')
      )
      .join('') +
    (waitingFlorence
      ? p(
          'Le <strong>reçu pour solde de tout compte</strong> vous sera envoyé à la signature dès que je l’aurai signé.',
          'margin-top:20px;'
        )
      : '') +
    `<p style="margin:20px 0 0 0;color:#a97761;font-size:14px;line-height:1.6;">Si un bouton ne fonctionne pas, copiez le lien correspondant dans votre navigateur :<br/>${links
      .map(
        l =>
          `${l.label} : <a href="${l.url}" style="color:#2ba1bd;word-break:break-all;">${l.url}</a>`
      )
      .join('<br/>')}</p>`
  );
}

async function notifyParent(
  proc: FdcProcedure,
  type: 'demande' | 'relance',
  known?: Pending[]
): Promise<{ sent: boolean; error?: string }> {
  const pending =
    known ??
    (
      await Promise.all(
        (await loadDocs(proc.id))
          .filter(d => d.docuseal_submission_id && !d.signed_at)
          .map(async doc => ({ doc, sub: await getSubmission(doc.docuseal_submission_id!) }))
      )
    ).filter((p): p is Pending => !!p.sub);
  const { links, waitingFlorence } = parentLinks(pending);
  if (links.length === 0) return { sent: false }; // rien à signer pour le parent (Florence d'abord)

  const parent = parentOf(proc);
  const key = type === 'demande' ? 'fin-de-contrat-signature' : 'fin-de-contrat-signature-relance';
  const email = renderTemplate(
    await getEmailTemplate(key),
    { recipientName: parent.firstName },
    linksBlock(links, waitingFlorence)
  );
  const res = await sendEmail({ to: [{ email: parent.email, name: parent.fullName }], ...email });
  if (!res.success) return { sent: false, error: `email non envoyé (${res.reason ?? 'Brevo'})` };
  await createServiceRoleClient()
    .from('procedure_status_history')
    .insert({
      procedure_id: proc.id,
      status: type === 'demande' ? 'SIGNATURE_DEMANDEE' : 'RELANCE_ENVOYEE',
    });
  return { sent: true };
}

// PDF signé : remplace le document déposé dans la fiche, puis part au parent en pièce jointe.
// Idempotent : seul l'appel qui pose signed_at envoie l'email.
async function finalizeSignedDoc(
  proc: FdcProcedure,
  doc: FdcDoc & { kind: FdcKind },
  sub: DocusealSubmission
) {
  const url = sub.documents?.[0]?.url;
  if (!url) throw new Error('PDF signé indisponible');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`téléchargement du PDF signé : ${res.status}`);
  const pdf = Buffer.from(await res.arrayBuffer());

  const supabase = createServiceRoleClient();
  const base = `${FDC_FILENAMES[doc.kind]}-signe`;
  const path = `fin-de-contrat/${proc.client_id}/${proc.id}/${base}_${Date.now()}.pdf`;
  const { error: upError } = await supabase.storage
    .from('client-files')
    .upload(path, pdf, { contentType: 'application/pdf', upsert: false });
  if (upError) throw upError;
  const signedAt =
    sub.submitters
      .map(s => s.completed_at ?? '')
      .sort()
      .at(-1) || new Date().toISOString();
  const { data: claimed } = await supabase
    .from('documents')
    .update({ storage_path: path, original_filename: `${base}.pdf`, signed_at: signedAt })
    .eq('id', doc.id)
    .is('signed_at', null)
    .select('id');
  if (!claimed?.length) {
    await supabase.storage.from('client-files').remove([path]);
    return;
  }
  if (doc.storage_path) await supabase.storage.from('client-files').remove([doc.storage_path]);

  const parent = parentOf(proc);
  const email = renderTemplate(await getEmailTemplate('fin-de-contrat-document-signe'), {
    recipientName: parent.firstName,
    documentLabel: FDC_LABELS[doc.kind],
  });
  const sent = await sendEmail({
    to: [{ email: parent.email, name: parent.fullName }],
    ...email,
    attachments: [{ name: `${base}.pdf`, content: pdf }],
  });
  // ponytail: email raté = document déjà marqué signé, pas de renvoi automatique (visible dans les
  // logs ; Florence peut le transmettre depuis la fiche)
  if (!sent.success)
    console.error('[FdC signatures] email du document signé non envoyé', doc.id, sent.reason);
}

// ─── Suivi quotidien (cron /api/cron/signatures) ────────────────────────────
// Pour chaque fin de contrat SIGN_REQUESTED : soumissions manquantes re-tentées, PDF signés
// rapatriés, procédure SIGNED quand les 3 sont signés ; demande du solde au parent dès que Florence
// l'a signé ; relance hebdomadaire tant que le parent n'a pas tout signé. Réservation 20 h comme
// pour les contrats (deux appels qui se chevauchent n'envoient qu'une fois). `dry` : rien n'est
// écrit ni envoyé.
export async function processFinDeContratSignatures({
  dry,
  withNames,
}: {
  dry: boolean;
  withNames: boolean;
}): Promise<{ procedureId: string; client?: string; action: string }[]> {
  const supabase = createServiceRoleClient();
  const { data: type } = await supabase
    .from('procedure_types')
    .select('id')
    .eq('code', 'FIN_DE_CONTRAT')
    .maybeSingle();
  if (!type) return [];
  const { data: procs, error } = await supabase
    .from('procedures')
    .select(PROC_COLUMNS)
    .eq('procedure_type_id', type.id)
    .eq('status', 'SIGN_REQUESTED')
    .returns<FdcProcedure[]>();
  if (error) throw error;
  if (!procs?.length) return [];

  const lastSent: Record<string, string> = {};
  const { data: history } = await supabase
    .from('procedure_status_history')
    .select('procedure_id, created_at')
    .in(
      'procedure_id',
      procs.map(p => p.id)
    )
    .in('status', ['SIGNATURE_DEMANDEE', 'RELANCE_ENVOYEE']);
  for (const h of history ?? []) {
    if (!lastSent[h.procedure_id] || h.created_at > lastSent[h.procedure_id]) {
      lastSent[h.procedure_id] = h.created_at;
    }
  }

  const now = new Date();
  const results: { procedureId: string; client?: string; action: string }[] = [];
  for (const p of procs) {
    const log = (action: string) =>
      results.push({
        procedureId: p.id,
        ...(withNames && {
          client:
            `${p.client?.first_name ?? ''} ${p.client?.last_name ?? ''} (${p.client?.first_name_jeune ?? ''})`.trim(),
        }),
        action: `fin de contrat : ${action}`,
      });
    try {
      let docs = await loadDocs(p.id);
      let retried = false; // la re-création envoie déjà sa demande au parent : pas d'autre email
      // Relances stoppées : PDF signés toujours rapatriés, mais aucun email de demande / relance
      if (docs.some(d => !d.docuseal_submission_id) && !p.relances_stoppees) {
        // Création ratée au dépôt : nouvel essai (pas dans l'heure qui suit un dépôt / une réservation).
        // Les documents déjà en signature sont suivis normalement ci-dessous.
        if (Date.parse(p.updated_at) > now.getTime() - 3600_000)
          log('signatures en cours de création');
        else if (dry) log('créerait les signatures manquantes');
        else {
          const errors = await startFinDeContratSignatures(p.id);
          retried = true;
          log(errors.length ? `création : ${errors.join(' ; ')}` : 'signatures manquantes créées');
          docs = await loadDocs(p.id);
        }
      }

      const pending: Pending[] = [];
      let refused = false;
      for (const doc of docs) {
        if (doc.signed_at || !doc.docuseal_submission_id) continue;
        const sub = await getSubmission(doc.docuseal_submission_id);
        if (!sub) {
          log(`${doc.title} : soumission DocuSeal introuvable`);
          continue;
        }
        if (sub.submitters.some(s => s.declined_at)) refused = true;
        else if (pendingSubmitters(sub).length === 0) {
          if (dry) log(`${doc.title} : signé (serait enregistré et envoyé)`);
          else {
            await finalizeSignedDoc(p, doc, sub);
            doc.signed_at = now.toISOString();
            log(`${doc.title} : signé, envoyé au parent`);
          }
        } else pending.push({ doc, sub });
      }

      if (refused) {
        if (!dry) {
          const { data } = await supabase
            .from('procedures')
            .update({ status: 'REFUSED', updated_at: now.toISOString() })
            .eq('id', p.id)
            .eq('status', 'SIGN_REQUESTED')
            .select('id');
          if (data?.length) {
            await supabase
              .from('procedure_status_history')
              .insert({ procedure_id: p.id, status: 'SIGNATURE_REFUSEE' });
          }
        }
        log('signature refusée');
        continue;
      }
      if (docs.length > 0 && docs.every(d => d.signed_at)) {
        if (!dry) {
          const { data } = await supabase
            .from('procedures')
            .update({
              status: 'SIGNED',
              signed_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', p.id)
            .eq('status', 'SIGN_REQUESTED')
            .select('id');
          if (data?.length) {
            await supabase
              .from('procedure_status_history')
              .insert({ procedure_id: p.id, status: 'SIGNATURE_EFFECTUEE' });
          }
        }
        log('les 3 documents sont signés');
        continue;
      }

      const { links } = parentLinks(pending);
      if (retried) continue;
      if (p.relances_stoppees) {
        log('relances stoppées depuis la fiche');
        continue;
      }
      if (links.length === 0) {
        log('en attente de la signature de Florence');
        continue;
      }
      // Solde signé par Florence depuis le dernier email : demande au parent sans attendre la relance
      const since = lastSent[p.id] ?? p.created_at;
      const floSignedSince = pending.some(({ sub }) =>
        sub.submitters.some(
          s =>
            s.role === 'Florence' &&
            s.completed_at &&
            Date.parse(s.completed_at) > Date.parse(since)
        )
      );
      const days = daysBetween(parisDate(new Date(since)), parisDate(now));
      if (!floSignedSince && days < 7) {
        log(`pas encore de relance (dernier email il y a ${days} j)`);
        continue;
      }
      const type = floSignedSince ? 'demande' : 'relance';
      if (dry) {
        log(`enverrait ${type === 'demande' ? 'la demande du solde' : 'une relance'} au parent`);
        continue;
      }
      const claimBefore = new Date(now.getTime() - 20 * 3600_000).toISOString();
      const { data: claimed } = await supabase
        .from('procedures')
        .update({ updated_at: now.toISOString() })
        .eq('id', p.id)
        .eq('status', 'SIGN_REQUESTED')
        .lt('updated_at', claimBefore)
        .select('id');
      if (!claimed?.length) {
        log('réservée il y a moins de 20 h : pas d’email');
        continue;
      }
      const sent = await notifyParent(p, type, pending);
      log(sent.sent ? `${type} envoyée` : `échec de l'envoi (${sent.error ?? 'aucun lien'})`);
    } catch (e) {
      console.error('[FdC signatures]', p.id, e);
      log('erreur (voir logs)');
    }
  }
  return results;
}
