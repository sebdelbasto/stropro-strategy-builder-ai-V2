import { NextResponse } from 'next/server'
import { MODEL, OPENAI_KEY, ARTICLE_BASE } from '@/lib/ai'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    model: MODEL,
    hasKey: !!OPENAI_KEY,
    articleBase: ARTICLE_BASE
  })
}
