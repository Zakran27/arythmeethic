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

    // Return client data (excluding sensitive fields)
    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        first_name_parent1: client.first_name_parent1,
        last_name_parent1: client.last_name_parent1,
        phone_parent1: client.phone_parent1,
        email_parent1: client.email_parent1,
        first_name_parent2: client.first_name_parent2,
        last_name_parent2: client.last_name_parent2,
        phone_parent2: client.phone_parent2,
        email_parent2: client.email_parent2,
        numero_cesu: client.numero_cesu,
        first_name_jeune: client.first_name_jeune,
        last_name_jeune: client.last_name_jeune,
        phone_jeune: client.phone_jeune,
        email_jeune: client.email_jeune,
        adresse_cours: client.adresse_cours,
        address_line1: client.address_line1,
        niveau_eleve: client.niveau_eleve,
        etablissement_scolaire: client.etablissement_scolaire,
        moyenne_maths: client.moyenne_maths,
        moyenne_generale: client.moyenne_generale,
        jours_disponibles: client.jours_disponibles,
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

    // Update client with form data
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        first_name_parent1: formData.first_name_parent1 || null,
        last_name_parent1: formData.last_name_parent1 || null,
        phone_parent1: formData.phone_parent1 || null,
        email_parent1: formData.email_parent1 || null,
        first_name_parent2: formData.first_name_parent2 || null,
        last_name_parent2: formData.last_name_parent2 || null,
        phone_parent2: formData.phone_parent2 || null,
        email_parent2: formData.email_parent2 || null,
        numero_cesu: formData.numero_cesu || null,
        first_name_jeune: formData.first_name_jeune || null,
        last_name_jeune: formData.last_name_jeune || null,
        phone_jeune: formData.phone_jeune || null,
        email_jeune: formData.email_jeune || null,
        adresse_cours: formData.adresse_cours || null,
        niveau_eleve: formData.niveau_eleve || null,
        etablissement_scolaire: formData.etablissement_scolaire || null,
        moyenne_maths: formData.moyenne_maths || null,
        moyenne_generale: formData.moyenne_generale || null,
        jours_disponibles: formData.jours_disponibles || null,
        // Clear the token after successful submission
        form_token: null,
        form_token_expires_at: null,
      })
      .eq('id', client.id);

    if (updateError) {
      console.error('Error updating client:', updateError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour des informations' },
        { status: 500 }
      );
    }

    // Update the procedure status to PDF_GENERATED (or next step)
    const { data: procedure } = await supabase
      .from('procedures')
      .select('id')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (procedure) {
      await supabase
        .from('procedures')
        .update({ status: 'PDF_GENERATED', updated_at: new Date().toISOString() })
        .eq('id', procedure.id);
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      source: 'FORM',
      event: 'RECUEIL_COMPLETED',
      payload: { client_id: client.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Informations enregistrées avec succès',
    });
  } catch (error) {
    console.error('Error updating client from form:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'envoi du formulaire' },
      { status: 500 }
    );
  }
}
