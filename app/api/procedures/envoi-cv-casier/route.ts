import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, email } = body;

    if (!clientId || !email) {
      return NextResponse.json(
        { success: false, error: 'Client ID et email requis' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Verify the client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, first_name, last_name, organisation')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: 'Client non trouvé' },
        { status: 404 }
      );
    }

    // Get procedure type for ENVOI_CV_CASIER
    const { data: procedureType, error: typeError } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', 'ENVOI_CV_CASIER')
      .single();

    if (typeError || !procedureType) {
      return NextResponse.json(
        { success: false, error: 'Type de procédure non trouvé' },
        { status: 500 }
      );
    }

    // Generate a secure download token (valid for 14 days)
    const downloadToken = randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 14);

    // Create the procedure with the download token
    const { data: newProcedure, error: procError } = await supabase
      .from('procedures')
      .insert({
        client_id: clientId,
        procedure_type_id: procedureType.id,
        status: 'DRAFT',
        download_token: downloadToken,
        download_token_expires_at: tokenExpiresAt.toISOString(),
        recipient_email: email,
      })
      .select('id')
      .single();

    if (procError || !newProcedure) {
      console.error('Error creating procedure:', procError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création de la procédure' },
        { status: 500 }
      );
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      source: 'admin',
      event: 'ENVOI_CV_CASIER_CREATED',
      payload: { clientId, procedureId: newProcedure.id, email },
    });

    return NextResponse.json({
      success: true,
      procedureId: newProcedure.id,
      downloadToken,
    });
  } catch (error) {
    console.error('Error in envoi-cv-casier:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du lancement de la procédure' },
      { status: 500 }
    );
  }
}
