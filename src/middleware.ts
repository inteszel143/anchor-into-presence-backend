import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname

  // Allow public access to auth routes
  if (
    url === '/admin/login' ||
    url === '/login' ||
    url === '/signup' ||
    url.startsWith('/api/auth') ||
    url.startsWith("/api/users/community/posts/share")
  ) {
    return NextResponse.next()
  }

  // ✅ Admin panel (web): use cookie-based authentication
  if (url.startsWith('/admin')) {
    const token = req.cookies.get('admin_session')?.value
    if (!token) {
      // If this is a browser page request → redirect
      if (req.headers.get('accept')?.includes('text/html')) {
        return NextResponse.redirect(new URL('/admin/login', req.url))
      }

      // Otherwise (RSC / fetch / API) → return 401
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      if (payload.role !== 'admin') throw new Error('Not admin')
    } catch (err) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  // ✅ Mobile API (users): use Bearer token
  if (url.startsWith('/api/users')) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Missing Bearer token' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      if (payload.role !== 'user') throw new Error('Not user')
    } catch (err) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/users/:path*',
    '/api/admin/:path*',
  ],
}
