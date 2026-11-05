import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { PUBLIC_ADMIN_PAGES } from '@/lib/auth';

// ponytail: liste blanche des routes API anonymes ; tout le reste de /api exige une session admin
// (+ code MFA si l'admin l'a activée). Toute nouvelle route publique doit être ajoutée ici.
// Les crons vérifient eux-mêmes CRON_SECRET (lib/admin.ts).
const PUBLIC_API = [
  /^\/api\/contact$/,
  /^\/api\/formulaire\//,
  /^\/api\/download$/,
  /^\/api\/cron\//,
];
const MFA_PAGE = '/admin/mfa';

function isPublicApi(pathname: string, method: string) {
  return (
    PUBLIC_API.some(r => r.test(pathname)) ||
    (pathname === '/api/google-reviews' && method === 'GET')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // Routes publiques : pas d'appel Supabase inutile
  if (isApi && isPublicApi(pathname, request.method)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // getUser() vérifie le jeton auprès de Supabase (getSession() lit un cookie non vérifié)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rôle admin, pas seulement une session (un compte « user » n'a accès à rien). Lu via la policy
  // users_read_own_profile, indépendamment du niveau MFA.
  const isAdmin =
    !!user &&
    (await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()).data?.role ===
      'admin';
  // Code MFA à saisir (/admin/mfa) : admin dont is_admin() est faux, donc facteur TOTP vérifié et
  // session encore en aal1. Calculé par Postgres (JWT vérifié + auth.mfa_factors), jamais avec
  // getAuthenticatorAssuranceLevel() : sa liste de facteurs vient du cookie, modifiable par le client.
  const needsMfa = isAdmin && (await supabase.rpc('is_admin')).data !== true;

  if (isApi) {
    if (!isAdmin || needsMfa) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    }
    return response;
  }

  const redirect = (to: string) => NextResponse.redirect(new URL(to, request.url));
  if (PUBLIC_ADMIN_PAGES.includes(pathname)) {
    // Déjà connecté en admin : pas de page de connexion
    return pathname === '/admin/login' && isAdmin ? redirect('/admin/clients') : response;
  }
  if (!isAdmin) return redirect('/admin/login');
  if (needsMfa) return pathname === MFA_PAGE ? response : redirect(MFA_PAGE);
  if (pathname === MFA_PAGE) return redirect('/admin/clients');

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
