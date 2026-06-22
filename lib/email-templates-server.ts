import { createServiceRoleClient } from '@/lib/supabase-server';
import { substituteVars, type RenderedTemplate } from '@/lib/email-templates';

// Côté serveur uniquement (utilise le service role + next/headers via
// supabase-server). NE PAS importer depuis un composant client.
//
// Renvoie la version personnalisée d'un template (subject + html avec variables
// substituées), ou `null` s'il n'y en a pas (la route utilise alors son HTML par
// défaut). Ne jette jamais : en cas d'erreur, renvoie null.
export async function getEmailTemplateOverride(
  key: string,
  vars: Record<string, string>
): Promise<RenderedTemplate | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('email_templates')
      .select('subject, html')
      .eq('key', key)
      .maybeSingle();
    if (error || !data || !data.html || !data.html.trim()) return null;
    return {
      subject: substituteVars(data.subject || '', vars),
      html: substituteVars(data.html, vars),
    };
  } catch {
    return null;
  }
}
