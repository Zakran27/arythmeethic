import { NextRequest, NextResponse } from 'next/server';
import { findRecueilClient, signedUploadUrl } from '@/lib/procedures';
import { RECUEIL_UPLOAD_MAX_BYTES, uploadExtension } from '@/lib/validators';

// Route PUBLIQUE (/api/formulaire/) : URL d'upload signée pour une pièce du recueil (bilan, emploi
// du temps). Le navigateur envoie le fichier directement au Storage (pas de limite Vercel de
// 4,5 Mo). Le token est vérifié ici, AVANT d'être consommé par le POST final du formulaire.
export async function POST(request: NextRequest) {
  try {
    const { token, filename, size } = await request.json();
    const found = await findRecueilClient(token, 'id');
    if (!found.client) {
      return NextResponse.json({ success: false, error: found.error }, { status: found.status });
    }
    const ext = uploadExtension(filename);
    if (!ext || typeof size !== 'number' || size <= 0 || size > RECUEIL_UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Fichier refusé : PDF ou image uniquement, 15 Mo maximum.' },
        { status: 400 }
      );
    }

    // Dossier propre au client : le POST final n'accepte que des chemins sous ce préfixe
    const upload = await signedUploadUrl(`recueil/${found.client.id}`, ext);
    if (!upload) {
      return NextResponse.json(
        { success: false, error: 'Trop de fichiers envoyés. Merci de contacter A Rythme Ethic.' },
        { status: 429 }
      );
    }
    return NextResponse.json({ success: true, ...upload });
  } catch (error) {
    console.error('Error creating recueil upload URL:', error);
    return NextResponse.json(
      { success: false, error: "Impossible de préparer l'envoi du fichier" },
      { status: 500 }
    );
  }
}
