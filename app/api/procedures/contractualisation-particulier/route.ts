import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { generateContractParticulierPDF } from '@/lib/pdf-contract-particulier-generator';

const DOCUSEAL_API_URL = 'https://api.docuseal.com';

// PDF page dimensions (must match lib/pdf-contract-particulier-generator.ts)
const PAGE_W = 595;
const PAGE_H = 842;
const FIELD_W = 0.25; // ~150px
const FIELD_H = 0.09; // ~75px

// Convert pdf-lib absolute coords (bottom-left origin) to DocuSeal normalized ratios (top-left origin)
function toDocusealCoords(x: number, y: number) {
  return {
    x: x / PAGE_W,
    y: 1 - y / PAGE_H - FIELD_H,
    w: FIELD_W,
    h: FIELD_H,
  };
}

interface DocusealSigner {
  role: string;
  email: string;
  name: string;
  fields: { page: number; x: number; y: number; w: number; h: number };
}

async function createDocusealSubmission(params: {
  pdfBuffer: Buffer;
  filename: string;
  signers: DocusealSigner[];
}): Promise<{ submissionId: string }> {
  const apiKey = process.env.DOCUSEAL_API_KEY;
  if (!apiKey) throw new Error('DOCUSEAL_API_KEY non configurée');

  const body = {
    send_email: true,
    order: 'random',
    submitters: params.signers.map(s => ({
      role: s.role,
      email: s.email,
      name: s.name,
    })),
    documents: [
      {
        name: params.filename,
        file: params.pdfBuffer.toString('base64'),
        fields: params.signers.map(s => ({
          name: `signature_${s.role.toLowerCase()}`,
          role: s.role,
          type: 'signature',
          required: true,
          page: s.fields.page,
          x: s.fields.x,
          y: s.fields.y,
          w: s.fields.w,
          h: s.fields.h,
        })),
      },
    ],
  };

  const res = await fetch(`${DOCUSEAL_API_URL}/submissions/pdf`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DocuSeal error: ${err}`);
  }

  const data = await res.json();
  // DocuSeal returns an array; each item has submission_id and id
  const submissionId = Array.isArray(data)
    ? (data[0]?.submission_id ?? data[0]?.id)
    : (data.submission_id ?? data.id);
  return { submissionId: String(submissionId) };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DOCUSEAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Configuration DocuSeal manquante' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      clientId,
      signerEmail,
      signerFirstName,
      signerLastName,
      anneeScolaire,
      dateDebut,
      dateFin,
      salaireHoraireNet,
    } = body;

    if (
      !clientId ||
      !signerEmail ||
      !signerFirstName ||
      !signerLastName ||
      !anneeScolaire ||
      !dateDebut ||
      !dateFin ||
      !salaireHoraireNet
    ) {
      return NextResponse.json(
        { success: false, error: 'Paramètres requis manquants' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
    }

    if (client.type_client !== 'Particulier') {
      return NextResponse.json(
        { success: false, error: 'Cette procédure est réservée aux particuliers' },
        { status: 400 }
      );
    }

    const { data: procedureType, error: ptError } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', 'CONTRACTUALISATION')
      .single();

    if (ptError || !procedureType) {
      return NextResponse.json(
        { success: false, error: 'Type de procédure non trouvé' },
        { status: 500 }
      );
    }

    // Generate contract PDF
    let pdfBuffer: Buffer;
    let signaturePage: number;
    let signatureX: number;
    let signatureY: number;
    let florenceSignatureX: number;
    let florenceSignatureY: number;
    try {
      const result = await generateContractParticulierPDF({
        client,
        anneeScolaire,
        dateDebut,
        dateFin,
        salaireHoraireNet: parseFloat(salaireHoraireNet),
        signerFirstName,
        signerLastName,
        signerEmail,
        signerPhone: body.signerPhone,
      });
      pdfBuffer = result.buffer;
      signaturePage = result.signaturePage;
      signatureX = result.signatureX;
      signatureY = result.signatureY;
      florenceSignatureX = result.florenceSignatureX;
      florenceSignatureY = result.florenceSignatureY;
    } catch (err) {
      console.error('Error generating contract PDF:', err);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la génération du document de contractualisation' },
        { status: 500 }
      );
    }

    // Create the procedure record first (in DRAFT status)
    const { data: newProcedure, error: procError } = await supabase
      .from('procedures')
      .insert({
        client_id: clientId,
        procedure_type_id: procedureType.id,
        status: 'DRAFT',
        recipient_email: signerEmail,
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

    try {
      // Florence is salarié (left), client is employeur (right)
      const clientCoords = toDocusealCoords(signatureX, signatureY);
      const florenceCoords = toDocusealCoords(florenceSignatureX, florenceSignatureY);

      const { submissionId } = await createDocusealSubmission({
        pdfBuffer,
        filename: `contractualisation_${client.id}.pdf`,
        signers: [
          {
            role: 'Client',
            email: signerEmail,
            name: `${signerFirstName} ${signerLastName}`,
            fields: { page: signaturePage, ...clientCoords },
          },
          {
            role: 'Florence',
            email: 'florence.louazel@ARythmeEthic.onmicrosoft.com',
            name: 'Florence LOUAZEL',
            fields: { page: signaturePage, ...florenceCoords },
          },
        ],
      });
      console.log('DocuSeal submission created:', submissionId);

      // Store submission ID and update status
      const { error: updateError } = await supabase
        .from('procedures')
        .update({
          yousign_procedure_id: submissionId,
          status: 'SIGN_REQUESTED',
        })
        .eq('id', newProcedure.id);

      if (updateError) {
        console.error('Error updating procedure:', updateError);
      }

      await supabase.from('procedure_status_history').insert({
        procedure_id: newProcedure.id,
        status: 'SIGNATURE_DEMANDEE',
      });

      await supabase.from('audit_log').insert({
        source: 'admin',
        event: 'CONTRACTUALISATION_LAUNCHED',
        payload: {
          clientId,
          procedureId: newProcedure.id,
          docusealSubmissionId: submissionId,
          signerEmail,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Demande de signature envoyée avec succès',
        procedureId: newProcedure.id,
        docusealSubmissionId: submissionId,
        dbUpdateError: updateError ? true : false,
      });
    } catch (docusealError) {
      await supabase.from('procedures').update({ status: 'DRAFT' }).eq('id', newProcedure.id);

      console.error('DocuSeal error:', docusealError);
      return NextResponse.json(
        {
          success: false,
          error: `Erreur DocuSeal: ${docusealError instanceof Error ? docusealError.message : 'Unknown error'}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error launching contractualisation:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du lancement de la procédure' },
      { status: 500 }
    );
  }
}
