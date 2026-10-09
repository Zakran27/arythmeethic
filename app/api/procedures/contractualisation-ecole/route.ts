import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { getEmailTemplateOverride } from '@/lib/email-templates-server';
import { renderEmailShell, signatureLinkBlock } from '@/lib/email-templates';
import { sendEmail } from '@/lib/brevo';
import { createSubmission, toDocusealCoords } from '@/lib/docuseal';
import { supersedePreviousContracts } from '@/lib/signatures';
import { generateContractPDF } from '@/lib/pdf-contract-generator';
import { parseArticleOverrides } from '@/lib/contract-ecole-articles';

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
  const intro =
    role === 'Florence'
      ? `<strong>${clientName}</strong> a été invité(e) à signer le contrat de prestation. Voici votre lien pour contresigner.`
      : `Florence Louazel vous invite à signer le contrat de prestation A Rythme Ethic.`;

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
                  <a href="${signingLink}" style="display: inline-block; background-color: #2ba1bd !important; color: #ffffff !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 500; mso-padding-alt: 0;"><span style="color: #ffffff !important; mso-text-raise: 0;">Signer le document</span></a>
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
            <a href="https://arythmeethic.fr" style="text-decoration:none;color:inherit;display:block;"><p style="margin:0;color:#6e3a25;font-size:14px;font-weight:600;">Florence Louazel</p>
            <p style="margin:5px 0 0 0;color:#a97761;font-size:13px;">A Rythme Ethic</p>
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  // Email client : template éditable (override) si défini, sinon HTML par défaut.
  // La copie de contresignature de Florence (role 'Florence') n'est pas modifiée.
  let finalSubject = `A Rythme Ethic - Signature du contrat${role === 'Florence' ? ` (${clientName})` : ''}`;
  let finalHtml = htmlContent;
  if (role === 'Client') {
    const ov = await getEmailTemplateOverride('contractualisation-ecole', {
      recipientName: toName,
    });
    if (ov) {
      finalSubject = ov.subject;
      finalHtml = renderEmailShell(ov.html, signatureLinkBlock(signingLink));
    }
  }

  await sendEmail({ to: [{ email: to, name: toName }], subject: finalSubject, html: finalHtml });
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DOCUSEAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Configuration DocuSeal manquante' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const clientId = formData.get('clientId') as string;
    const signerEmail = formData.get('signerEmail') as string;
    const signerFirstName = formData.get('signerFirstName') as string;
    const signerLastName = formData.get('signerLastName') as string;
    const anneeScolaire = formData.get('anneeScolaire') as string;
    const tarifHoraireHT = formData.get('tarifHoraireHT') as string | null;
    const articleOverrides = parseArticleOverrides(formData.get('articleOverrides'));
    const annexes = formData.getAll('annexes') as File[];

    if (
      !clientId ||
      !signerEmail ||
      !signerFirstName ||
      !signerLastName ||
      !/^\d{4}-\d{4}$/.test(anneeScolaire ?? '')
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

    if (client.type_client !== 'École') {
      return NextResponse.json(
        { success: false, error: 'Cette procédure est réservée aux établissements' },
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
      const result = await generateContractPDF({
        client,
        anneeScolaire,
        tarifHoraireHT: tarifHoraireHT ? parseFloat(tarifHoraireHT) : undefined,
        articleOverrides,
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
        annee_scolaire: anneeScolaire,
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
      const clientCoords = toDocusealCoords(signatureX, signatureY);
      const florenceCoords = toDocusealCoords(florenceSignatureX, florenceSignatureY);

      // Read annexe buffers
      const annexeBuffers: { buffer: Buffer; name: string }[] = [];
      for (const annexe of annexes) {
        if (!annexe || annexe.size === 0) continue;
        try {
          annexeBuffers.push({
            buffer: Buffer.from(await annexe.arrayBuffer()),
            name: annexe.name || `annexe_${client.id}.pdf`,
          });
        } catch (err) {
          console.error('Error reading annexe:', err);
          // Non-blocking: continue without this annexe
        }
      }

      const contractName = `Contrat - ${client.organisation || client.last_name} - ${anneeScolaire}`;
      const { submissionId, signers: submitters } = await createSubmission({
        pdfBuffer,
        filename: `${contractName}.pdf`,
        annexes: annexeBuffers,
        signers: [
          {
            role: 'Client',
            email: signerEmail,
            name: `${signerFirstName} ${signerLastName}`,
            fields: { page: signaturePage, ...clientCoords },
          },
          {
            role: 'Florence',
            email: 'florence.louazel@arythmeethic.fr',
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
          docuseal_submission_id: submissionId,
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

      // Nouvelle version pour la même année scolaire : les précédentes sont annulées (lien DocuSeal
      // archivé) ou retirées de « Contrats signés » si elles étaient signées.
      if (!updateError) {
        await supersedePreviousContracts({
          clientId,
          procedureTypeId: procedureType.id,
          anneeScolaire,
          keepId: newProcedure.id,
        });
      }

      await supabase.from('audit_log').insert({
        source: 'admin',
        event: 'CONTRACTUALISATION_LAUNCHED',
        payload: {
          clientId,
          procedureId: newProcedure.id,
          docusealSubmissionId: submissionId,
          signerEmail,
          articlesModifies: articleOverrides.map(o => o.id),
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
