import { NextResponse } from 'next/server'
import { MODEL, OPENAI_KEY } from '@/lib/ai'
import { isAllowedUserQuestion, WHOLESALE_NOTICE } from '@/lib/policy'

export const runtime = 'nodejs'

const MAX_TURNS = Number(process.env.MAX_CHAT_TURNS || 6)
const COOLDOWN_MS = Number(process.env.CHAT_COOLDOWN_MS || 8000)

// Super simple in-memory throttle (per lambda instance)
const ipBuckets = new Map<string,{count:number,ts:number}>()

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'unknown'
    const now = Date.now()
    const b = ipBuckets.get(ip) || { count: 0, ts: now }
    if (now - b.ts > 60_000) { b.count = 0; b.ts = now }
    b.count += 1
    ipBuckets.set(ip, b)
    if (b.count > 30) {
      return NextResponse.json({ error: 'rate_limited', message: 'Please slow down.' }, { status: 429 })
    }

    const body = await req.json().catch(()=>null)
    const { messages, lastAt } = body || {}
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    }

    // Enforce turn limit
    if (messages.length > MAX_TURNS) {
      return NextResponse.json({
        done: true,
        message: 'Chat limit reached for this session. Use the actions above to continue (Generate ideas / Price this strategy).',
      })
    }

    // Enforce cooldown
    if (typeof lastAt === 'number') {
      const elapsed = Date.now() - lastAt
      if (elapsed < COOLDOWN_MS) {
        return NextResponse.json({
          wait: COOLDOWN_MS - elapsed,
          message: `Cooling down… try again in ${Math.ceil((COOLDOWN_MS - elapsed)/1000)}s.`,
        }, { status: 429 })
      }
    }

    const userMsg = messages[messages.length - 1]?.content || ''
    if (!isAllowedUserQuestion(userMsg)) {
      return NextResponse.json({
        message: "I can help with structured investments only (notes, options, barriers, coupons, principal protection, LRL, equity release). For personal or off-topic queries, please contact the desk.",
        disclaimer: WHOLESALE_NOTICE,
      })
    }

    if (!OPENAI_KEY) {
      return NextResponse.json({
        message: "AI temporarily unavailable. Try 'Generate ideas' or 'Price this strategy'.",
        disclaimer: WHOLESALE_NOTICE,
      }, { status: 503 })
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        messages: [
          { role: 'system', content: "You are a concise, compliant structured-products helper. Refuse off-topic. Append: 'Educational; wholesale only.'" },
          ...messages.slice(-6) // cap context
        ],
      })
    })

    if (!r.ok) {
      const t = await r.text().catch(()=> '')
      return NextResponse.json({
        message: "AI error. Try again or use 'Generate ideas' / 'Price this strategy'.",
        detail: t.slice(0, 3000),
      }, { status: 500 })
    }

    const data = await r.json()
    const out = data?.choices?.[0]?.message?.content || '…'
    return NextResponse.json({
      message: out,
      disclaimer: WHOLESALE_NOTICE,
      nextAllowedAt: Date.now() + COOLDOWN_MS,
      remaining: Math.max(0, MAX_TURNS - messages.length),
    })
  } catch (e:any) {
    return NextResponse.json({
      message: "Something went wrong. Please try again.",
    }, { status: 500 })
  }
}
