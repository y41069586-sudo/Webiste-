import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optimistische Prüfung: Ohne Session-Cookie keine Admin-Seiten.
 * Die eigentliche Session-Prüfung passiert serverseitig in jedem Admin-Layout,
 * jeder Server Action und jedem Admin-API-Handler (requireAdmin).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!request.cookies.get('wbm_admin')?.value) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
