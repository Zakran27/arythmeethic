import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;
  // Destination après échange du code. Uniquement des chemins internes (anti open-redirect).
  const next = requestUrl.searchParams.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin/clients';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Force a hard redirect to ensure cookies are sent
      return NextResponse.redirect(`${origin}${safeNext}`, { status: 303 });
    }
  }

  // Lien de reset expiré/déjà utilisé : la page reset affiche « Lien non valide » + « Demander un nouveau lien »
  if (safeNext === '/admin/reset-password') {
    return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/admin/login`);
}
