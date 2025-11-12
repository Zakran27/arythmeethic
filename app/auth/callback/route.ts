import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Force a hard redirect to ensure cookies are sent
      return NextResponse.redirect(`${origin}/admin/clients`, { status: 303 });
    }
  }

  // If no code or error, redirect to login
  return NextResponse.redirect(`${origin}/admin/login`);
}
