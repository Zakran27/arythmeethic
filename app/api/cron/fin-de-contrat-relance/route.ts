import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * CRON Job: Relance fin-de-contrat tous les 3 jours à 18h
 * Configurer dans vercel.json: "schedule": "0 18 *\/3 * *" (tous les 3 jours à 18h)
 *
 * Envoie une relance aux clients qui ont une procédure FIN_DE_CONTRAT en cours
 * et n'ont pas encore uploadé les 3 documents.
 *
 * Sécurisé par CRON_SECRET.
 */

const REQUIRED_KINDS = [
  'FIN_DE_CONTRAT_SOLDE_TOUT_COMPTE',
  'FIN_DE_CONTRAT_ATTESTATION_EMPLOYEUR',
  'FIN_DE_CONTRAT_CERTIFICAT_TRAVAIL',
];

async function sendBrevoEmail(p: { to: string; toName: string; subject: string; htmlContent: string }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { success: false };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'A Rythme Ethic', email: process.env.BREVO_SENDER_EMAIL || 'noreply@arythmeethic.fr' },
      to: [{ email: p.to, name: p.toName }],
      subject: p.subject,
      htmlContent: p.htmlContent,
    }),
  });
  if (!res.ok) {
    console.error('Brevo error:', await res.text());
    return { success: false };
  }
  return { success: true };
}

function buildRelanceHtml(recipientName: string, uploadUrl: string, missing: string[]): string {
  const missingList = missing.map(m => `<li>${m}</li>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;font-family:'Inter','Segoe UI','Helvetica','Arial',sans-serif;background-color:#fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr><td style="padding:40px 40px 20px 40px;text-align:center;background:linear-gradient(to bottom,#f9f3ee,#efe3d7);border-radius:16px 16px 0 0;">
          <h1 style="margin:0;color:#6e3a25;font-family:'Georgia',serif;font-size:28px;font-weight:600;">A Rythme Ethic</h1>
          <p style="margin:10px 0 0 0;color:#c3826e;font-size:16px;">Petit rappel amical</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 20px 0;color:#7b4a31;font-size:16px;line-height:1.6;">Bonjour ${recipientName},</p>
          <p style="margin:0 0 20px 0;color:#7b4a31;font-size:16px;line-height:1.6;">
            Je me permets de revenir vers vous concernant la fin de contrat. Il manque encore les document(s) suivant(s) :
          </p>
          <ul style="margin:0 0 20px 0;color:#7b4a31;font-size:15px;line-height:1.8;padding-left:24px;">${missingList}</ul>
          <p style="margin:0 0 20px 0;color:#7b4a31;font-size:16px;line-height:1.6;">
            Vous pouvez les déposer en cliquant sur le bouton ci-dessous :
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0;">
            <a href="${uploadUrl}" style="display: inline-block; background-color: #2ba1bd !important; color: #ffffff !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;"><span style="color:#ffffff !important;">Déposer les documents</span></a>
          </td></tr></table>
          <p style="margin:30px 0 0 0;color:#a97761;font-size:14px;line-height:1.6;">Merci d'avance pour votre retour,</p>
        </td></tr>
        <tr><td style="padding:30px 40px;background-color:#f9f3ee;border-radius:0 0 16px 16px;text-align:center;">
          <a href="https://arythmeethic.fr" style="text-decoration:none;color:inherit;display:block;">
            <p style="margin:0;color:#6e3a25;font-size:14px;font-weight:600;">Florence Louazel</p>
            <p style="margin:5px 0 0 0;color:#a97761;font-size:13px;">A Rythme Ethic</p>
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const KIND_LABELS: Record<string, string> = {
  FIN_DE_CONTRAT_SOLDE_TOUT_COMPTE: 'Reçu pour solde de tout compte',
  FIN_DE_CONTRAT_ATTESTATION_EMPLOYEUR: 'Attestation employeur',
  FIN_DE_CONTRAT_CERTIFICAT_TRAVAIL: 'Certificat de travail',
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = createServiceRoleClient();

    // Find FIN_DE_CONTRAT procedures still in DRAFT (= not all docs received)
    const { data: procType } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', 'FIN_DE_CONTRAT')
      .single();
    if (!procType) return NextResponse.json({ success: true, processed: 0, reason: 'no_type' });

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: procedures } = await supabase
      .from('procedures')
      .select('id, client_id, download_token, recipient_email, download_token_expires_at, updated_at')
      .eq('procedure_type_id', procType.id)
      .eq('status', 'DRAFT')
      .lte('updated_at', threeDaysAgo.toISOString());

    let sent = 0;
    let skipped = 0;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://arythmeethic.fr';

    for (const p of procedures ?? []) {
      // skip if token expired
      if (p.download_token_expires_at && new Date(p.download_token_expires_at) < new Date()) {
        skipped++;
        continue;
      }
      // Get uploaded docs for this procedure (stored with kind='SUPPORTING_DOC', type in title)
      const { data: docs } = await supabase
        .from('documents')
        .select('title')
        .eq('procedure_id', p.id)
        .eq('kind', 'SUPPORTING_DOC')
        .in('title', Object.values(KIND_LABELS));
      const haveTitles = new Set((docs ?? []).map(d => d.title));
      const missing = REQUIRED_KINDS.filter(k => !haveTitles.has(KIND_LABELS[k]));
      if (missing.length === 0) {
        // shouldn't happen (procedure would be SIGNED) - skip
        skipped++;
        continue;
      }

      // Get recipient name
      const { data: client } = await supabase
        .from('clients')
        .select('first_name_parent1, first_name_jeune, first_name')
        .eq('id', p.client_id)
        .single();
      const recipientName =
        client?.first_name_parent1 || client?.first_name_jeune || client?.first_name || '';
      const uploadUrl = `${origin}/formulaire/fin-de-contrat/${p.download_token}`;
      const missingLabels = missing.map(k => KIND_LABELS[k]);

      const result = await sendBrevoEmail({
        to: p.recipient_email,
        toName: recipientName,
        subject: 'A Rythme Ethic - Rappel : documents de fin de contrat',
        htmlContent: buildRelanceHtml(recipientName, uploadUrl, missingLabels),
      });

      if (result.success) {
        sent++;
        await supabase
          .from('procedures')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', p.id);
        await supabase.from('procedure_status_history').insert({
          procedure_id: p.id,
          status: 'RELANCE_ENVOYEE',
        });
      } else {
        skipped++;
      }
    }

    return NextResponse.json({ success: true, sent, skipped });
  } catch (err) {
    console.error('Cron fin-de-contrat-relance error:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
