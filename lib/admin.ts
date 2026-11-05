import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Session courante = admin (RPC is_admin(), lit profiles.role via auth.uid()). Côté serveur uniquement.
export async function isAdminSession(): Promise<boolean> {
  const { data } = await (await createClient()).rpc('is_admin');
  return data === true;
}

// Crons : Vercel envoie `Authorization: Bearer $CRON_SECRET` ; un admin connecté peut aussi lancer à la main
// (ex. `?dry=1`). Fermé par défaut : sans CRON_SECRET, seul un admin passe. Renvoie la réponse 401 ou null.
export async function cronUnauthorized(request: NextRequest): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') === `Bearer ${secret}`) return null;
  if (await isAdminSession()) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
