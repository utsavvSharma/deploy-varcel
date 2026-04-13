import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // Skip auth check for login endpoint
  if (request.nextUrl.pathname === '/api/auth') {
    return NextResponse.next()
  }

  // Check auth for all other API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const token = request.cookies.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token.value)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Add user info to request headers for route handlers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.sub as string)
    requestHeaders.set('x-user-role', payload.role as string)

    return NextResponse.next({
      headers: requestHeaders,
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}