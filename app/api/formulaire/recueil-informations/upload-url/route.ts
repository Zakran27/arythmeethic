import { NextRequest, NextResponse } from 'next/server';
import { findRecueilClient, signedUploadUrl } from '@/lib/procedures';
import { ECOLE_UPLOAD_MIME, RECUEIL_UPLOAD_MAX_BYTES, uploadExtension } from '@/lib/validators';

// Route PUBLIQUE (/api/formulaire/) : URL d'upload signée pour une pièce du recueil (particulier :
// bilan, emploi du temps ; école : syllabus, exemple de cours, aussi en Word / PowerPoint). Le
// navigateur envoie le fichier directement au Storage (pas de limite Vercel de 4,5 Mo). Le token est
// vérifié ici, AVANT d'être consommé par le POST final du formulaire.
export async function POST(request: NextRequest) {
  try {
    const { token, filename, size } = await request.json();
    const found = await findRecueilClient(token, 'id', 'any');
    if (!found.client) {
      return NextResponse.json({ success: false, error: found.error }, { status: found.status });
    }
    const ecole = found.client.type_client === 'École';
    const ext = uploadExtension(filename, ecole ? ECOLE_UPLOAD_MIME : undefined);
    if (!ext || typeof size !== 'number' || size <= 0 || size > RECUEIL_UPLOAD_MAX_BYTES) {
      const types = ecole ? 'PDF, image, Word ou PowerPoint' : 'PDF ou image uniquement';
      return NextResponse.json(
        { success: false, error: `Fichier refusé : ${types}, 15 Mo maximum.` },
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
