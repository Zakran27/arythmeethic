import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  substituteVars,
  DEFAULT_TEMPLATE_CONTENT,
  type RenderedTemplate,
} from '@/lib/email-templates';

// Côté serveur uniquement (utilise le service role + next/headers via
// supabase-server). NE PAS importer depuis un composant client.

// Version personnalisée brute (variables NON substituées) ou null. Ne jette jamais.
async function fetchOverride(key: string): Promise<RenderedTemplate | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('email_templates')
      .select('subject, html')
      .eq('key', key)
      .maybeSingle();
    if (error || !data || !data.html || !data.html.trim()) return null;
    return { subject: data.subject || '', html: data.html };
  } catch {
    return null;
  }
}

// Renvoie la version personnalisée d'un template (subject + html avec variables
// substituées), ou `null` s'il n'y en a pas (la route utilise alors son HTML par
// défaut). Ne jette jamais : en cas d'erreur, renvoie null.
export async function getEmailTemplateOverride(
  key: string,
  vars: Record<string, string>
): Promise<RenderedTemplate | null> {
  const t = await fetchOverride(key);
  return t && { subject: substituteVars(t.subject, vars), html: substituteVars(t.html, vars) };
}

// Template brut à utiliser : version personnalisée de Florence, sinon le modèle par défaut.
// À passer à renderTemplate() (lib/email-templates.ts).
export async function getEmailTemplate(key: string): Promise<RenderedTemplate> {
  const def = DEFAULT_TEMPLATE_CONTENT[key];
  const t = await fetchOverride(key);
  return t ? { subject: t.subject || def?.subject || '', html: t.html } : def;
}
