import { NextRequest, NextResponse } from 'next/server';
import { findDraftProcedure, signedUploadUrl } from '@/lib/procedures';
import { PREPARATION_CODE } from '@/lib/preparation-accompagnement';
import { RECUEIL_UPLOAD_MAX_BYTES, uploadExtension } from '@/lib/validators';

// Route PUBLIQUE (/api/formulaire/) : URL d'upload signée pour l'emploi du temps (PDF). Le token
// est vérifié ici, AVANT d'être consommé par le POST final du formulaire.
export async function POST(request: NextRequest) {
  try {
    const { token, filename, size } = await request.json();
    const found = await findDraftProcedure(token, PREPARATION_CODE);
    if (!found.procedure) {
      return NextResponse.json({ success: false, error: found.error }, { status: found.status });
    }
    if (
      uploadExtension(filename) !== 'pdf' ||
      typeof size !== 'number' ||
      size <= 0 ||
      size > RECUEIL_UPLOAD_MAX_BYTES
    ) {
      return NextResponse.json(
        { success: false, error: 'Fichier refusé : PDF uniquement, 15 Mo maximum.' },
        { status: 400 }
      );
    }

    // Dossier propre au client : le POST final n'accepte que des chemins sous ce préfixe
    const upload = await signedUploadUrl(
      `preparation-accompagnement/${found.procedure.client_id}`,
      'pdf'
    );
    if (!upload) {
      return NextResponse.json(
        { success: false, error: 'Trop de fichiers envoyés. Merci de contacter A Rythme Ethic.' },
        { status: 429 }
      );
    }
    return NextResponse.json({ success: true, ...upload });
  } catch (error) {
    console.error('Error creating preparation upload URL:', error);
    return NextResponse.json(
      { success: false, error: "Impossible de préparer l'envoi du fichier" },
      { status: 500 }
    );
  }
}
