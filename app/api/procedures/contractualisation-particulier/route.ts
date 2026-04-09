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

interface DocusealSubmitterResult {
  role: string;
  email: string;
  name: string;
  embedSrc: string;
}

async function sendSignatureEmail({
  to,
  toName,
  role,
  clientName,
  signingLink,
}: {
  to: string;
  toName: string;
  role: 'Client' | 'Florence';
  clientName: string;
  signingLink: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[Brevo] BREVO_API_KEY non configurée, email signature non envoyé');
    return;
  }

  const intro =
    role === 'Florence'
      ? `<strong>${clientName}</strong> a été invité(e) à signer le contrat de contractualisation. Voici votre lien pour contresigner.`
      : `Florence Louazel vous invite à signer le contrat d&rsquo;accompagnement A Rythme Ethic.`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
</head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica','Arial',sans-serif;background-color:#fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr>
          <td style="padding:40px 40px 20px 40px;text-align:center;background:linear-gradient(to bottom,#f9f3ee,#efe3d7);border-radius:16px 16px 0 0;">
            <h1 style="margin:0;color:#6e3a25;font-family:'Georgia',serif;font-size:28px;font-weight:600;">A Rythme Ethic</h1>
            <p style="margin:10px 0 0 0;color:#c3826e;font-size:16px;">Accompagnement humain et bienveillant</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px 0;color:#7b4a31;font-size:16px;line-height:1.6;">Bonjour ${toName},</p>
            <p style="margin:0 0 30px 0;color:#7b4a31;font-size:16px;line-height:1.6;">${intro}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:20px 0;">
                  <a href="${signingLink}" style="display:inline-block;background-color:#2ba1bd;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:8px;font-size:16px;font-weight:500;">
                    Signer le document
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:20px 0 0 0;color:#a97761;font-size:14px;line-height:1.6;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
              <a href="${signingLink}" style="color:#2ba1bd;word-break:break-all;">${signingLink}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 40px;background-color:#f9f3ee;border-radius:0 0 16px 16px;text-align:center;">
            <p style="margin:0;color:#6e3a25;font-size:14px;font-weight:600;">Florence Louazel</p>
            <p style="margin:5px 0 0 0;color:#a97761;font-size:13px;">A Rythme Ethic</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'A Rythme Ethic', email: process.env.BREVO_SENDER_EMAIL || 'noreply@arythmeethic.fr' },
      to: [{ email: to, name: toName }],
      subject: `A Rythme Ethic — Signature du contrat${role === 'Florence' ? ` (${clientName})` : ''}`,
      htmlContent,
    }),
  });
  console.log(`[Brevo] Email signature envoyé à ${to} — status: ${res.status}`);
  if (!res.ok) {
    const err = await res.text();
    console.error('[Brevo] Erreur:', err);
  }
}

async function createDocusealSubmission(params: {
  pdfBuffer: Buffer;
  filename: string;
  signers: DocusealSigner[];
}): Promise<{ submissionId: string; signers: DocusealSubmitterResult[] }> {
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
          areas: [
            {
              page: s.fields.page,
              x: s.fields.x,
              y: s.fields.y,
              w: s.fields.w,
              h: s.fields.h,
            },
          ],
        })),
      },
    ],
  };

  console.log('[DocuSeal] POST', `${DOCUSEAL_API_URL}/submissions/pdf`);
  console.log('[DocuSeal] API key présente:', !!apiKey, '| longueur:', apiKey.length);
  console.log('[DocuSeal] Signataires:', params.signers.map(s => ({ role: s.role, email: s.email })));
  console.log('[DocuSeal] Champs:', JSON.stringify(body.documents[0].fields, null, 2));

  const res = await fetch(`${DOCUSEAL_API_URL}/submissions/pdf`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log('[DocuSeal] Status HTTP:', res.status, res.statusText);

  if (!res.ok) {
    const err = await res.text();
    console.error('[DocuSeal] Erreur réponse:', err);
    throw new Error(`DocuSeal error: ${err}`);
  }

  const data = await res.json();
  console.log('[DocuSeal] Réponse:', JSON.stringify(data, null, 2));

  const submissionId = Array.isArray(data)
    ? (data[0]?.submission_id ?? data[0]?.id)
    : (data.submission_id ?? data.id);

  const submitters: DocusealSubmitterResult[] = (data.submitters ?? []).map((s: {
    role: string; email: string; name: string; embed_src: string;
  }) => ({
    role: s.role,
    email: s.email,
    name: s.name,
    embedSrc: s.embed_src,
  }));

  return { submissionId: String(submissionId), signers: submitters };
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

      const { submissionId, signers: submitters } = await createDocusealSubmission({
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

      // Send signature emails via Brevo
      const clientName = `${signerFirstName} ${signerLastName}`;
      for (const s of submitters) {
        await sendSignatureEmail({
          to: s.email,
          toName: s.name,
          role: s.role as 'Client' | 'Florence',
          clientName,
          signingLink: s.embedSrc,
        });
      }

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
