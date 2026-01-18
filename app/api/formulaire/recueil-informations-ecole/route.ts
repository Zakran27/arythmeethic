import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

// GET - Fetch client data for pre-filling the form
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token requis' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Find client by token
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('form_token', token)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: 'Lien invalide ou expiré' },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (client.form_token_expires_at) {
      const expiresAt = new Date(client.form_token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Ce lien a expiré. Veuillez contacter A Rythme Ethic.' },
          { status: 410 }
        );
      }
    }

    // Return client data for École (pre-fill with existing data)
    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        // Structure info (pre-filled)
        organisation: client.organisation,
        address_line1: client.address_line1,
        postal_code: client.postal_code,
        city: client.city,
        ecole_siret: client.ecole_siret,
        ecole_nda: client.ecole_nda,
        // Responsable modules (pre-fill with first_name/last_name/email/phone1)
        ecole_resp_modules_nom: client.ecole_resp_modules_nom || client.last_name,
        ecole_resp_modules_prenom: client.ecole_resp_modules_prenom || client.first_name,
        ecole_resp_modules_email: client.ecole_resp_modules_email || client.email,
        ecole_resp_modules_phone: client.ecole_resp_modules_phone || client.phone1,
        ecole_resp_modules_peut_negocier: client.ecole_resp_modules_peut_negocier,
        // Responsable autorisation
        ecole_resp_autorisation_nom: client.ecole_resp_autorisation_nom,
        ecole_resp_autorisation_prenom: client.ecole_resp_autorisation_prenom,
        ecole_resp_autorisation_email: client.ecole_resp_autorisation_email,
        ecole_resp_autorisation_phone: client.ecole_resp_autorisation_phone,
        // Responsable facturation
        ecole_resp_facturation_nom: client.ecole_resp_facturation_nom,
        ecole_resp_facturation_prenom: client.ecole_resp_facturation_prenom,
        ecole_resp_facturation_email: client.ecole_resp_facturation_email,
        ecole_resp_facturation_phone: client.ecole_resp_facturation_phone,
        // Responsable planning
        ecole_resp_planning_nom: client.ecole_resp_planning_nom,
        ecole_resp_planning_prenom: client.ecole_resp_planning_prenom,
        ecole_resp_planning_email: client.ecole_resp_planning_email,
        ecole_resp_planning_phone: client.ecole_resp_planning_phone,
        // Module info
        ecole_module_nom: client.ecole_module_nom,
        ecole_module_heures: client.ecole_module_heures,
        ecole_formation_type: client.ecole_formation_type,
        ecole_classes_noms: client.ecole_classes_noms,
        ecole_groupe_taille: client.ecole_groupe_taille,
        ecole_evaluation_modalites: client.ecole_evaluation_modalites,
        ecole_evaluation_nombre_min: client.ecole_evaluation_nombre_min,
        ecole_module_periode: client.ecole_module_periode,
      },
    });
  } catch (error) {
    console.error('Error fetching client for form:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement du formulaire' },
      { status: 500 }
    );
  }
}

// POST - Update client with form data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, ...formData } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token requis' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Find client by token
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, form_token_expires_at')
      .eq('form_token', token)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: 'Lien invalide ou expiré' },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (client.form_token_expires_at) {
      const expiresAt = new Date(client.form_token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Ce lien a expiré. Veuillez contacter A Rythme Ethic.' },
          { status: 410 }
        );
      }
    }

    // Build update data for École
    const updateData: Record<string, unknown> = {
      // Structure info
      organisation: formData.organisation || null,
      address_line1: formData.address_line1 || null,
      postal_code: formData.postal_code || null,
      city: formData.city || null,
      ecole_siret: formData.ecole_siret || null,
      ecole_nda: formData.ecole_nda || null,
      // Responsable modules
      ecole_resp_modules_nom: formData.ecole_resp_modules_nom || null,
      ecole_resp_modules_prenom: formData.ecole_resp_modules_prenom || null,
      ecole_resp_modules_email: formData.ecole_resp_modules_email || null,
      ecole_resp_modules_phone: formData.ecole_resp_modules_phone || null,
      ecole_resp_modules_peut_negocier: formData.ecole_resp_modules_peut_negocier ?? null,
      // Responsable autorisation prix
      ecole_resp_autorisation_nom: formData.ecole_resp_autorisation_nom || null,
      ecole_resp_autorisation_prenom: formData.ecole_resp_autorisation_prenom || null,
      ecole_resp_autorisation_email: formData.ecole_resp_autorisation_email || null,
      ecole_resp_autorisation_phone: formData.ecole_resp_autorisation_phone || null,
      // Responsable facturation
      ecole_resp_facturation_nom: formData.ecole_resp_facturation_nom || null,
      ecole_resp_facturation_prenom: formData.ecole_resp_facturation_prenom || null,
      ecole_resp_facturation_email: formData.ecole_resp_facturation_email || null,
      ecole_resp_facturation_phone: formData.ecole_resp_facturation_phone || null,
      // Responsable planning
      ecole_resp_planning_nom: formData.ecole_resp_planning_nom || null,
      ecole_resp_planning_prenom: formData.ecole_resp_planning_prenom || null,
      ecole_resp_planning_email: formData.ecole_resp_planning_email || null,
      ecole_resp_planning_phone: formData.ecole_resp_planning_phone || null,
      // Module info
      ecole_module_nom: formData.ecole_module_nom || null,
      ecole_module_heures: formData.ecole_module_heures || null,
      ecole_formation_type: formData.ecole_formation_type || null,
      ecole_classes_noms: formData.ecole_classes_noms || null,
      ecole_groupe_taille: formData.ecole_groupe_taille || null,
      ecole_evaluation_modalites: formData.ecole_evaluation_modalites || null,
      ecole_evaluation_nombre_min: formData.ecole_evaluation_nombre_min || null,
      ecole_module_periode: formData.ecole_module_periode || null,
      // Clear the token after successful submission
      form_token: null,
      form_token_expires_at: null,
    };

    // Update client with form data
    const { error: updateError } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', client.id);

    if (updateError) {
      console.error('Error updating client:', updateError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour des informations' },
        { status: 500 }
      );
    }

    // Find the RECUEIL_INFORMATIONS procedure type
    const { data: procedureType } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', 'RECUEIL_INFORMATIONS')
      .single();

    // Update the procedure status and add to history
    // Find the most recent RECUEIL_INFORMATIONS procedure for this client
    const { data: procedure } = await supabase
      .from('procedures')
      .select('id')
      .eq('client_id', client.id)
      .eq('procedure_type_id', procedureType?.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (procedure) {
      await supabase
        .from('procedures')
        .update({ status: 'PDF_GENERATED', updated_at: new Date().toISOString() })
        .eq('id', procedure.id);

      // Add status to history
      await supabase.from('procedure_status_history').insert({
        procedure_id: procedure.id,
        status: 'FORMULAIRE_REMPLI',
      });
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      source: 'FORM',
      event: 'RECUEIL_ECOLE_COMPLETED',
      payload: { client_id: client.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Informations enregistrées avec succès',
      procedureId: procedure?.id || null,
    });
  } catch (error) {
    console.error('Error updating client from form:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'envoi du formulaire' },
      { status: 500 }
    );
  }
}
