import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  PREPARATION_CODE,
  launchPreparation,
  sendPreparationRelance,
} from '@/lib/preparation-accompagnement';

const fail = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

// Admin (session exigée par middleware.ts), toujours au parent 1 de la fiche :
//  - { clientId } : lance la procédure (nouveau lien, l'ancienne demande en attente est fermée) ;
//  - { clientId, relance: true } : relance la demande en attente (même lien).
export async function POST(request: NextRequest) {
  try {
    const { clientId, relance } = (await request.json()) as {
      clientId?: string;
      relance?: boolean;
    };
    if (!clientId) return fail('Paramètres invalides', 400);

    const supabase = createServiceRoleClient();
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    if (!client) return fail('Client non trouvé', 404);

    if (!relance) {
      const result = await launchPreparation(client);
      if (!result.success) return fail(result.error, 502);
      return NextResponse.json({ success: true, sentTo: client.email_parent1 });
    }

    const { data: proc } = await supabase
      .from('procedures')
      .select(
        'id, status, download_token, download_token_expires_at, created_at, recipient_email, procedure_types!inner(code)'
      )
      .eq('client_id', clientId)
      .eq('procedure_types.code', PREPARATION_CODE)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      proc?.status !== 'DRAFT' ||
      !proc.download_token ||
      (proc.download_token_expires_at && new Date(proc.download_token_expires_at) < new Date())
    ) {
      return fail(
        'Aucune demande en attente (ou lien expiré) : relancez la procédure depuis la fiche.',
        409
      );
    }
    const sent = await sendPreparationRelance(proc, client);
    if (!sent.success)
      return fail(`L'email n'a pas pu être envoyé (${sent.reason ?? 'erreur Brevo'})`, 502);
    return NextResponse.json({
      success: true,
      sentTo: client.email_parent1 || proc.recipient_email,
    });
  } catch (error) {
    console.error('Error launching preparation-accompagnement:', error);
    return fail('Erreur lors du lancement de la procédure', 500);
  }
}
