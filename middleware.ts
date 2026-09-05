import { NextRequest, NextResponse } from 'next/server'

const FRAME_ANCESTORS = "frame-ancestors 'self' http://localhost:3040 http://localhost:3000 http://127.0.0.1:3040 https://app.cosmicjs.com https://*.cosmicjs.com"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', FRAME_ANCESTORS)
  const token = request.nextUrl.searchParams.get('preview_token')
  if (token) {
    response.cookies.set({
      name: 'cosmic_preview',
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60,
    })
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
