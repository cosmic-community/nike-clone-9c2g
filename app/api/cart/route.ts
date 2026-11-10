import { NextResponse } from 'next/server'
import { getCurrentCustomer } from '@/lib/auth'
import { changeCart, getCart, type CartOp } from '@/lib/carts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OPS = new Set(['add', 'update', 'remove', 'clear', 'merge'])

export async function GET() {
  const customer = await getCurrentCustomer()
  if (!customer) return NextResponse.json({ signedIn: false, items: [] })
  try {
    return NextResponse.json({ signedIn: true, items: await getCart(customer.id) })
  } catch (error) {
    console.error('[cart] read failed', error)
    return NextResponse.json({ error: 'Could not load your bag.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const customer = await getCurrentCustomer()
  if (!customer) return NextResponse.json({ error: 'Sign in to save your bag.' }, { status: 401 })

  let op: CartOp
  try {
    op = (await request.json()) as CartOp
  } catch {
    return NextResponse.json({ error: 'The body must be JSON.' }, { status: 400 })
  }
  if (!op || typeof op !== 'object' || !OPS.has(op.op)) {
    return NextResponse.json({ error: 'Unknown bag change.' }, { status: 400 })
  }

  try {
    return NextResponse.json({ signedIn: true, items: await changeCart(customer.id, op) })
  } catch (error) {
    console.error('[cart] change failed', error)
    return NextResponse.json({ error: 'Could not update your bag.' }, { status: 500 })
  }
}
