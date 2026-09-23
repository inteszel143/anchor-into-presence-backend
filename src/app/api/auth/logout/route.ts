import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const response = NextResponse.json(
    { message: 'Logout successful', status: true, data:{} },
    { status: 200 }
  )

  response.cookies.set('user_session', '', {
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
  })

  return response
}
