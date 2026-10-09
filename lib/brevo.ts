// Envoi d'email transactionnel via l'API Brevo (côté serveur uniquement).
// ponytail: les anciennes routes gardent leur copie de sendBrevoEmail ; à migrer au fil des modifications.
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: { email: string; name?: string }[];
  subject: string;
  html: string;
}): Promise<{ success: boolean; reason?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[Brevo] BREVO_API_KEY non configurée, email non envoyé');
    return { success: false, reason: 'BREVO_API_KEY non configurée' };
  }
  const recipients = to.filter(r => r.email);
  if (recipients.length === 0) return { success: false, reason: 'aucun destinataire' };

  // Ne jette jamais (réseau, timeout…) : l'appelant nettoie sur { success: false }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: {
          name: 'A Rythme Ethic',
          email: process.env.BREVO_SENDER_EMAIL || 'florence.louazel@arythmeethic.fr',
        },
        // Un seul email, destinataires visibles entre eux (la famille peut répondre à tous)
        to: recipients.map(r => ({ email: r.email, name: r.name || undefined })),
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const reason = await res.text();
      console.error('[Brevo] Erreur:', reason);
      return { success: false, reason };
    }
    return { success: true };
  } catch (e) {
    console.error('[Brevo] Erreur réseau:', e);
    return { success: false, reason: 'erreur réseau' };
  }
}
