import { NextResponse } from 'next/server'
import { MODEL, OPENAI_KEY, buildPrompt, articleForObjective } from '@/lib/ai'
import { fetchRecentProducts, selectSimilar, bandFromProducts } from '@/lib/catalog'

export const runtime = 'nodejs'

function localIdeas(inputs:any, band?:string){
  const years = Math.round((inputs.tenorMonths/12)*10)/10
  const link = articleForObjective(inputs.objective)
  return [
    {
      title: `${inputs.objective}: Base Idea`,
      explainer: `Illustrative ${String(inputs.objective).toLowerCase()} structure over ${years} years on ${inputs.underliers?.join(', ')}. Tuned to ${inputs.riskProfile} in ${inputs.investmentCurrency}. For licensed advisers/wholesale; educational only; terms & KIDs prevail.`,
      articleUrl: link,
      indicativeCoupon: band,
      parameters: { Tenor: `${inputs.tenorMonths}m`, Risk: inputs.riskProfile, Currency: inputs.investmentCurrency, Underliers: inputs.underliers?.join(', ') }
    },
    {
      title: `${inputs.objective}: Variant (Alt Tenor/Barrier)`,
      explainer: `Variant trading income vs. protection; aligned to ${inputs.riskProfile}. For licensed advisers/wholesale; educational only; terms & KIDs prevail.`,
      articleUrl: link,
      indicativeCoupon: band,
      parameters: { Tenor: `${Math.max(6, Math.min(72, inputs.tenorMonths + (inputs.riskProfile==='Conservative'?6:-6)))}m`, Risk: inputs.riskProfile, Currency: inputs.investmentCurrency, Underliers: inputs.underliers?.join(', ') }
    }
  ]
}

export async function POST(req: Request) {
  const inputs = await req.json().catch(()=>null)
  if (!inputs || !inputs.objective || !Array.isArray(inputs.underliers)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // 1) Similar cohort only
  let band:string|undefined
  let sampleSize = 0
  try {
    const recents = await fetchRecentProducts(250)
    const similar = selectSimilar(recents, {
      objective: inputs.objective,
      underliers: inputs.underliers || [],
      tenor: inputs.tenorMonths || 24,
      currency: (inputs.investmentCurrency || 'AUD').toUpperCase()
    })
    const agg = bandFromProducts(similar)
    band = agg.band
    sampleSize = agg.sampleSize
  } catch { /* swallow */ }

  // 2) No key → platform-grounded fallback
  if (!OPENAI_KEY) {
    return NextResponse.json({ suggestions: localIdeas(inputs, band), model: 'local-fallback', sampleSize, source:'platform' })
  }

  // 3) AI for phrasing only (coupon from cohort if present)
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        messages: buildPrompt({ ...inputs }),
        response_format: { type: 'json_object' }
      })
    })

    const text = await r.text()
    if (!r.ok) {
      return NextResponse.json({ suggestions: localIdeas(inputs, band), model: 'local-fallback', sampleSize, source:'platform' })
    }

    const data = JSON.parse(text)
    const raw = data?.choices?.[0]?.message?.content || ''
    let parsed:any
    try { parsed = JSON.parse(raw) } catch { return NextResponse.json({ suggestions: localIdeas(inputs, band), model: 'parse-fallback', sampleSize, source:'platform' }) }

    const baseLink = articleForObjective(inputs.objective)
    const arr = Array.isArray(parsed?.suggestions) ? (parsed.suggestions as any[]) : []
    const normalized:any[] = arr.slice(0,3).map((s:any, idx:number)=>({
      title: s?.title && String(s.title).trim() ? String(s.title).trim() : `${inputs.objective}: Idea ${idx+1}`,
      explainer: s?.explainer && String(s.explainer).trim()
        ? String(s.explainer).trim()
        : `Illustrative ${String(inputs.objective).toLowerCase()} structure. For licensed advisers/wholesale; educational only; terms & KIDs prevail.`,
      indicativeCoupon: band || (s?.indicativeCoupon || undefined),
      articleUrl: s?.articleUrl && String(s.articleUrl).startsWith('http') ? s.articleUrl : baseLink,
      parameters: s?.parameters && typeof s.parameters === 'object'
        ? s.parameters
        : { Tenor: `${inputs.tenorMonths}m`, Risk: inputs.riskProfile, Currency: inputs.investmentCurrency, Underliers: inputs.underliers?.join(', ') }
    }))

    const source = band ? 'platform+ai' : 'ai'
    return NextResponse.json({ suggestions: normalized, model: MODEL, sampleSize, source })
  } catch {
    return NextResponse.json({ suggestions: localIdeas(inputs, band), model: 'local-fallback', sampleSize, source:'platform' })
  }
}
