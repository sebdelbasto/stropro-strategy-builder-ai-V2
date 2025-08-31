import { NextResponse } from 'next/server'
import { fetchRecentProducts } from '@/lib/catalog'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const items = await fetchRecentProducts(5)
    return NextResponse.json({
      ok: true,
      base: process.env.STROPRO_API_BASE,
      count: items.length,
      peek: items.slice(0,3)
    })
  } catch (e:any) {
    return NextResponse.json({
      ok: false,
      base: process.env.STROPRO_API_BASE,
      error: e?.message || String(e)
    }, { status: 500 })
  }
}
