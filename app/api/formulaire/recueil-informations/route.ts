import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { findRecueilClient, storedUploads, uploadDocument } from '@/lib/procedures';
import { RECUEIL_CONTACT_KEYS, findRecueilContactErrors } from '@/lib/validators';
import { RESPONSABLES_LEGAUX, TROUBLES_APPRENTISSAGE, joinSituation } from '@/types';

// Route PUBLIQUE (liste blanche /api/formulaire/ de middleware.ts) : tout passe par le token.
const fail = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

const PREFILL_COLUMNS = [
  ...RECUEIL_CONTACT_KEYS,
  'numero_cesu',
  'adresse_cours',
  'address_line1',
  'niveau_eleve',
  'etablissement_scolaire',
  'moyenne_maths',
  'moyenne_generale',
  'jours_disponibles',
  'situation_familiale',
  'troubles_apprentissage',
  'troubles_autre',
  'suivi_psy',
  'aise_avec_diagnostics',
  'date_dernier_diagnostic',
].join(', ');

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ouiNon = (v: unknown) => (v === 'oui' ? true : v === 'non' ? false : null);
const isPastDate = (d: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) &&
  !isNaN(Date.parse(d)) &&
  new Date(d).toISOString().startsWith(d) && // refuse 2024-02-31
  d <= new Date().toISOString().slice(0, 10);

// GET - Fetch client data for pre-filling the form
export async function GET(request: NextRequest) {
  try {
    const found = await findRecueilClient(
      request.nextUrl.searchParams.get('token'),
      PREFILL_COLUMNS
    );
    if (!found.client) return fail(found.error, found.status);
    return NextResponse.json({ success: true, client: found.client });
  } catch (error) {
    console.error('Error fetching client for form:', error);
    return fail('Erreur lors du chargement du formulaire', 500);
  }
}

// POST - Update client with form data (consomme le token : à appeler APRÈS les uploads)
export async function POST(request: NextRequest) {
  try {
    const { token, uploads, consentement_sante, gestionnaire, ...f } = await request.json();
    const supabase = createServiceRoleClient();
    const found = await findRecueilClient(token, 'address_line1, sub_type, disponibilites');
    if (!found.client) return fail(found.error, found.status);
    const client = found.client;

    // 1. Responsables légaux : Parent 2 seulement pour « Les deux parents » (sinon effacé : un
    //    parent écarté ne doit plus recevoir les mails des procédures)
    const situation = str(f.situation);
    if (!RESPONSABLES_LEGAUX.includes(situation)) {
      return fail("Merci d'indiquer qui sont les responsables légaux de votre enfant.", 400);
    }
    const deuxParents = situation === RESPONSABLES_LEGAUX[0];
    const precisions = str(f.situation_precisions, 2000);

    const c: Record<string, string> = {};
    for (const key of RECUEIL_CONTACT_KEYS) {
      c[key] = deuxParents || !key.endsWith('parent2') ? str(f[key], 200) : '';
    }
    const errors = Object.values(findRecueilContactErrors(c, deuxParents));
    if (errors.length > 0) {
      return fail(`Merci de vérifier les coordonnées : ${[...new Set(errors)].join(' / ')}`, 400);
    }

    // 2. Gestion administrative : le parent choisi devient Parent 1 (destinataire par défaut
    //    de toutes les procédures)
    if (deuxParents && gestionnaire !== 'parent1' && gestionnaire !== 'parent2') {
      return fail("Merci d'indiquer qui fait la gestion administrative.", 400);
    }
    if (deuxParents && gestionnaire === 'parent2') {
      for (const field of ['first_name', 'last_name', 'phone', 'email']) {
        [c[`${field}_parent1`], c[`${field}_parent2`]] = [
          c[`${field}_parent2`],
          c[`${field}_parent1`],
        ];
      }
    }

    // 3. Besoins particuliers (données de santé) : consentement explicite obligatoire
    const troubles = Array.isArray(f.troubles_apprentissage)
      ? TROUBLES_APPRENTISSAGE.filter(t => f.troubles_apprentissage.includes(t))
      : [];
    const troublesAutre = str(f.troubles_autre) || null;
    const hasTroubles = troubles.length > 0 || !!troublesAutre;
    const suiviPsy = ouiNon(f.suivi_psy);
    const dateDiag = str(f.date_dernier_diagnostic);
    // (« Non » au suivi psy seul n'est pas une donnée de santé : pas de consentement exigé)
    if ((hasTroubles || suiviPsy === true) && consentement_sante !== true) {
      return fail(
        'Merci de cocher la case de consentement pour les informations sur les besoins particuliers.',
        400
      );
    }

    // 4. Pièces jointes déjà envoyées au Storage (URL signées), vérifiées (lib/procedures.ts)
    const docs = await storedUploads(
      `recueil/${client.id}`,
      uploads,
      kind => kind === 'edt' || (kind === 'bilan' && hasTroubles)
    );

    const jours: string[] | null = Array.isArray(f.jours_disponibles)
      ? f.jours_disponibles.filter((j: unknown) => typeof j === 'string')
      : null;
    // Créneaux (Préparation accompagnement) : un jour qui n'est plus proposé perd son créneau
    const creneaux = client.disponibilites?.filter(d => jours?.includes(d.jour)) ?? [];
    const updateData: Record<string, unknown> = {
      ...Object.fromEntries(RECUEIL_CONTACT_KEYS.map(key => [key, c[key] || null])),
      situation_familiale: joinSituation(situation, precisions),
      numero_cesu: str(f.numero_cesu) || null,
      adresse_cours: str(f.adresse_cours) || null,
      niveau_eleve: str(f.niveau_eleve) || null,
      etablissement_scolaire: str(f.etablissement_scolaire) || null,
      moyenne_maths: str(f.moyenne_maths) || null,
      moyenne_generale: str(f.moyenne_generale) || null,
      jours_disponibles: jours,
      disponibilites: creneaux.length ? creneaux : null,
      troubles_apprentissage: troubles.length > 0 ? troubles : null,
      troubles_autre: troublesAutre,
      suivi_psy: suiviPsy,
      aise_avec_diagnostics: hasTroubles ? ouiNon(f.aise_avec_diagnostics) : null,
      date_dernier_diagnostic: hasTroubles && isPastDate(dateDiag) ? dateDiag : null,
      // Clear the token after successful submission
      form_token: null,
      form_token_expires_at: null,
    };

    // Contact « Parent » : le nom / email principal suit le Parent 1 (comme EditClientModal)
    if (client.sub_type === 'Parent') {
      updateData.first_name = c.first_name_parent1;
      updateData.last_name = c.last_name_parent1;
      updateData.email = c.email_parent1;
    }

    // If address_line1 is empty and adresse_cours is provided, copy it
    if (!client.address_line1 && updateData.adresse_cours) {
      updateData.address_line1 = updateData.adresse_cours;
    }

    const { error: updateError } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', client.id);

    if (updateError) {
      console.error('Error updating client:', updateError);
      return fail('Erreur lors de la mise à jour des informations', 500);
    }

    // Find the most recent RECUEIL_INFORMATIONS procedure for this client
    const { data: procedureType } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', 'RECUEIL_INFORMATIONS')
      .single();

    const { data: procedure } = await supabase
      .from('procedures')
      .select('id')
      .eq('client_id', client.id)
      .eq('procedure_type_id', procedureType?.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (procedure) {
      await supabase
        .from('procedures')
        .update({ status: 'PDF_GENERATED', updated_at: new Date().toISOString() })
        .eq('id', procedure.id);

      await supabase.from('procedure_status_history').insert({
        procedure_id: procedure.id,
        status: 'FORMULAIRE_REMPLI',
      });
    }

    if (docs.length > 0) {
      const { error: docsError } = await supabase
        .from('documents')
        .insert(
          docs.map(u =>
            uploadDocument(
              u,
              { client_id: client.id, procedure_id: procedure?.id ?? null },
              u.kind === 'bilan' ? 'Bilan / diagnostic' : 'Emploi du temps'
            )
          )
        );
      if (docsError) console.error('Error recording recueil documents:', docsError);
    }

    // Audit : jamais de valeur de santé, seulement la trace du consentement
    await supabase.from('audit_log').insert({
      source: 'FORM',
      event: 'RECUEIL_COMPLETED',
      payload:
        consentement_sante === true
          ? { client_id: client.id, consentement_sante: true }
          : { client_id: client.id },
    });

    return NextResponse.json({ success: true, message: 'Informations enregistrées avec succès' });
  } catch (error) {
    console.error('Error updating client from form:', error);
    return fail("Erreur lors de l'envoi du formulaire", 500);
  }
}
