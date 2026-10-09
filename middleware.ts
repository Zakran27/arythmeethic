import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { PUBLIC_ADMIN_PAGES } from '@/lib/auth';

// ponytail: liste blanche des routes API anonymes ; tout le reste de /api exige une session
// (tous les comptes sont admin). Toute nouvelle route publique doit être ajoutée ici.
const PUBLIC_API = [/^\/api\/contact$/, /^\/api\/formulaire\//, /^\/api\/download$/, /^\/api\/cron\//, /^\/api\/storage\/upload$/];

function isPublicApi(pathname: string, method: string) {
  return (
    PUBLIC_API.some(r => r.test(pathname)) || (pathname === '/api/google-reviews' && method === 'GET')
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

  if (isApi) {
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    }
    return response;
  }

  // Redirect to login if accessing admin routes without auth
  if (!user && !PUBLIC_ADMIN_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Redirect to admin if already logged in and trying to access login
  if (pathname === '/admin/login' && user) {
    return NextResponse.redirect(new URL('/admin/clients', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
