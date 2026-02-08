import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
    // Check for the admin session cookie
    const isAdmin = request.cookies.get('apeg_admin_session')?.value === 'true'

    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!isAdmin) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    if (request.nextUrl.pathname === '/login') {
        if (isAdmin) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/login'],
}
