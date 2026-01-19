import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

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

    // Find the procedure by download token
    const { data: procedure, error: procError } = await supabase
      .from('procedures')
      .select(`
        id,
        download_token_expires_at,
        recipient_email,
        client:clients (
          organisation,
          first_name,
          last_name
        )
      `)
      .eq('download_token', token)
      .single();

    if (procError || !procedure) {
      return NextResponse.json(
        { success: false, error: 'Lien invalide ou expiré' },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (procedure.download_token_expires_at) {
      const expiresAt = new Date(procedure.download_token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Ce lien a expiré. Veuillez contacter A Rythme Ethic.' },
          { status: 410 }
        );
      }
    }

    // Get documents associated with this procedure
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, original_filename, storage_path, created_at')
      .eq('procedure_id', procedure.id)
      .order('created_at', { ascending: true });

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des documents' },
        { status: 500 }
      );
    }

    // Generate signed URLs for each document
    const documentsWithUrls = await Promise.all(
      (documents || []).map(async (doc) => {
        if (!doc.storage_path) return { ...doc, downloadUrl: null };

        const { data: signedUrl } = await supabase.storage
          .from('client-files')
          .createSignedUrl(doc.storage_path, 3600); // 1 hour validity

        return {
          ...doc,
          downloadUrl: signedUrl?.signedUrl || null,
        };
      })
    );

    const client = procedure.client as { organisation?: string; first_name: string; last_name: string };

    return NextResponse.json({
      success: true,
      clientName: client.organisation || `${client.first_name} ${client.last_name}`,
      expiresAt: procedure.download_token_expires_at,
      documents: documentsWithUrls,
    });
  } catch (error) {
    console.error('Error in download API:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement' },
      { status: 500 }
    );
  }
}
