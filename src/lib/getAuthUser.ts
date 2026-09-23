import { jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }

  const token = authHeader.split(' ')[1]

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (!payload.userId) throw new Error('Invalid token payload')
    return payload
  } catch (err) {
    throw new Error('Invalid or expired token')
  }
}
