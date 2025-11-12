import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session from URL if needed (handles magic link callback)
  await supabase.auth.getUser();

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect to login if accessing admin routes without auth
  if (
    request.nextUrl.pathname.startsWith('/admin') &&
    !request.nextUrl.pathname.startsWith('/admin/login') &&
    !session
  ) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Redirect to admin if already logged in and trying to access login
  if (request.nextUrl.pathname === '/admin/login' && session) {
    return NextResponse.redirect(new URL('/admin/clients', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
