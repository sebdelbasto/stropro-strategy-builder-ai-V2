import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    articleBase: process.env.ARTICLE_BASE || null,
    nextPublicArticleBase: process.env.NEXT_PUBLIC_ARTICLE_BASE || null,
    envNote: 'If any are null/false on production, set them in Vercel → Settings → Environment Variables (Production) and redeploy.'
  })
}
