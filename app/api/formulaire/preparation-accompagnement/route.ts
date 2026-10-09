import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { anneeScolaire } from '@/lib/format';
import { findDraftProcedure } from '@/lib/procedures';
import { PREPARATION_CODE } from '@/lib/preparation-accompagnement';
import { RECUEIL_UPLOAD_MAX_BYTES, parseDisponibilites } from '@/lib/validators';
import type { Client } from '@/types';

// Route PUBLIQUE (liste blanche /api/formulaire/ de middleware.ts) : tout passe par le token.
const fail = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

type Prefill = Pick<
  Client,
  'first_name_jeune' | 'jours_disponibles' | 'disponibilites' | 'contraintes_extrascolaires'
>;
const findProcedure = (token: unknown) =>
  findDraftProcedure<{ clients: Prefill | null }>(
    token,
    PREPARATION_CODE,
    'clients(first_name_jeune, jours_disponibles, disponibilites, contraintes_extrascolaires)'
  );

// Pré-remplissage : créneaux déjà connus, sinon les jours du recueil (sans horaire)
export async function GET(request: NextRequest) {
  const found = await findProcedure(request.nextUrl.searchParams.get('token'));
  if (!found.procedure) return fail(found.error, found.status);
  const c = found.procedure.clients;
  return NextResponse.json({
    success: true,
    jeunePrenom: c?.first_name_jeune || null,
    anneeScolaire: anneeScolaire(new Date(found.procedure.created_at)),
    disponibilites: c?.disponibilites?.length
      ? c.disponibilites
      : (c?.jours_disponibles || []).map(jour => ({ jour, debut: '', fin: '' })),
    contraintes: c?.contraintes_extrascolaires || '',
  });
}

// Envoi final (APRÈS l'upload de l'emploi du temps par URL signée) : consomme le lien
export async function POST(request: NextRequest) {
  try {
    const { token, disponibilites, contraintes, edt } = await request.json();
    const found = await findProcedure(token);
    if (!found.procedure) return fail(found.error, found.status);
    const procedure = found.procedure;

    const { slots, error } = parseDisponibilites(disponibilites);
    if (error) return fail(error, 400);

    // Emploi du temps (obligatoire) : sous le dossier de ce client, réellement présent, PDF ≤ 15 Mo
    const folder = `preparation-accompagnement/${procedure.client_id}`;
    const path = typeof edt?.path === 'string' ? edt.path : '';
    const name = path.startsWith(`${folder}/`) ? path.slice(folder.length + 1) : '';
    const supabase = createServiceRoleClient();
    const { data: objects } = /^[a-f0-9]{32}\.pdf$/.test(name)
      ? await supabase.storage.from('client-files').list(folder, { search: name, limit: 1 })
      : { data: null };
    const meta = objects?.find(o => o.name === name)?.metadata;
    if (meta?.mimetype !== 'application/pdf' || !(Number(meta?.size) <= RECUEIL_UPLOAD_MAX_BYTES)) {
      return fail("Merci de joindre l'emploi du temps (PDF, 15 Mo maximum).", 400);
    }

    // Clôture conditionnelle = un seul traitement même en cas de double clic (le lien devient invalide)
    const { data: claimed } = await supabase
      .from('procedures')
      .update({ status: 'SIGNED', updated_at: new Date().toISOString() })
      .eq('id', procedure.id)
      .eq('status', 'DRAFT')
      .select('id');
    if (!claimed?.length) return fail('Votre réponse a déjà été enregistrée. Merci !', 410);

    // Échec d'écriture : rouvre le lien pour que la famille puisse réessayer (réécriture sans risque)
    const reopen = async (what: string, error: unknown) => {
      console.error(`Error saving preparation-accompagnement (${what}):`, error);
      await supabase.from('procedures').update({ status: 'DRAFT' }).eq('id', procedure.id);
      return fail('Erreur serveur', 500);
    };

    // Les réponses ÉCRASENT les jours du recueil (décision réunion du 6 oct.)
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        disponibilites: slots,
        jours_disponibles: slots.map(s => s.jour),
        contraintes_extrascolaires:
          typeof contraintes === 'string' ? contraintes.trim().slice(0, 2000) || null : null,
      })
      .eq('id', procedure.client_id);
    if (updateError) return reopen('client', updateError);

    const original = typeof edt?.original_filename === 'string' ? edt.original_filename.trim() : '';
    const { error: docError } = await supabase.from('documents').insert({
      client_id: procedure.client_id,
      procedure_id: procedure.id,
      kind: 'SUPPORTING_DOC',
      title: `Emploi du temps ${anneeScolaire(new Date(procedure.created_at))}`,
      storage_path: path,
      uploaded_by: 'CLIENT',
      original_filename: /\.pdf$/i.test(original) ? original.slice(-200) : 'emploi-du-temps.pdf',
    });
    if (docError) return reopen('emploi du temps', docError);

    // Historique de la fiche seulement : la Synthèse compte les réponses sur le statut SIGNED
    const { error: histError } = await supabase
      .from('procedure_status_history')
      .insert({ procedure_id: procedure.id, status: 'FORMULAIRE_REMPLI' });
    if (histError) console.error('Error recording FORMULAIRE_REMPLI:', histError);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in preparation-accompagnement form:', err);
    return fail('Erreur serveur', 500);
  }
}
