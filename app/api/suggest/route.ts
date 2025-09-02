import { defaultMechanics } from '@/lib/families'
import { getFamilyExplainer } from '@/lib/familyExplainers'
import { NextResponse } from 'next/server'
import { MODEL, OPENAI_KEY, buildPrompt, articleForObjective } from '@/lib/ai'
// below line added
import { FAMILY_ARTICLES } from '@/lib/ai'
import { fetchRecentProducts, selectSimilar, bandFromProducts, cohortByFamily } from '@/lib/catalog'
import { FAMILY_BY_OBJECTIVE, Family } from '@/lib/families'
import { computeIndicativeBand, illiquidHint } from '@/lib/indicatives'

function cleanMechanics(obj: any): Record<string,string> {
  const out: Record<string,string> = {}
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const v = (obj as any)[k]
      if (typeof v === 'string' && v) out[k] = v
    }
  }
  return out
}

export const runtime = 'nodejs'

function sanitizeMechanics(m: any): Record<string, string> | undefined {
  if (!m || typeof m !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) {
    if (typeof v === 'string' && v.trim()) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}


type IdeaOut = {
  title: string
  explainer: string
  indicativeCoupon?: string
  articleUrl: string
  parameters: Record<string,string|number>
  mechanics?: Record<string,string>
  evidenceCount?: number
  flags?: string[]
}

function localIdeas(inputs:any, broadBand?:string, perFamily?:Record<string,string|undefined>, perCount?:Record<string,number>): IdeaOut[] {
  // Keep this simple for prod build: pick primary family from objective
  const families: Family[] = ((FAMILY_BY_OBJECTIVE as any)[inputs.objective] || ['Fixed Coupon Note']).slice(0,2)

  const flags: string[] = []
  const illq = illiquidHint(inputs.underliers || [])
  if (illq) flags.push(illq)

  return families.map((fam:Family, i:number) => ({
    title: `${fam}: Idea ${i+1}`,
    explainer: `${(getFamilyExplainer(fam)?.what?.[0] || 'Short explainer unavailable')}. For licensed advisers/wholesale; educational only; terms & KIDs prevail.`,
    articleUrl: FAMILY_ARTICLES[fam] || articleForObjective(inputs.objective),
    indicativeCoupon: broadBand,
    parameters: {
      Tenor: inputs.tenorMonths ? `${inputs.tenorMonths}m` : '—',
      Risk: inputs.riskProfile,
      Currency: inputs.investmentCurrency,
      Underliers: (inputs.underliers || []).join(', ') || '—',
    },
    mechanics: sanitizeMechanics(cleanMechanics(defaultMechanics(fam, inputs))),
    evidenceCount: perCount?.[fam],
    flags: flags.length ? flags : undefined,
  }))
}

export async function POST(req: Request) {
  const inputs = await req.json().catch(()=>null)
  if (!inputs || !inputs.objective || !Array.isArray(inputs.underliers)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // 1) platform cohorts (broad + per-family)
  let broadBand:string|undefined
  let broadCount = 0
  let bandsByFamily: Record<string,string|undefined> = {}
  let countsByFamily: Record<string,number> = {}
  try {
    const recents = await fetchRecentProducts(250)
    const similar = selectSimilar(recents, {
      objective: inputs.objective,
      underliers: inputs.underliers || [],
      tenor: inputs.tenorMonths || 24,
      currency: (inputs.investmentCurrency || 'AUD').toUpperCase()
    })
    const agg = bandFromProducts(similar)
    broadBand = agg.band
    broadCount = agg.sampleSize

    const prefs = ((FAMILY_BY_OBJECTIVE as any)[inputs.objective] || []).slice(0,2)
    for (const fam of prefs) {
      const famCohort = cohortByFamily(recents, {
        objective: inputs.objective,
        underliers: inputs.underliers || [],
        tenor: inputs.tenorMonths || 24,
        currency: (inputs.investmentCurrency || 'AUD').toUpperCase(),
        family: fam
      })
      const famAgg = bandFromProducts(famCohort)
      countsByFamily[fam] = famCohort.length
      if (famAgg.sampleSize >= 3) bandsByFamily[fam] = famAgg.band
    }
  } catch { /* swallow */ }

  // 2) No key → platform-grounded local phrasing
  if (!OPENAI_KEY) {
    return NextResponse.json({
      suggestions: localIdeas(inputs, broadBand, bandsByFamily, countsByFamily),
      model: 'local-fallback',
      sampleSize: broadCount,
      source:'platform'
    })
  }

  // 3) AI for phrasing only
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
      return NextResponse.json({
        suggestions: localIdeas(inputs, broadBand, bandsByFamily, countsByFamily),
        model: 'local-fallback',
        sampleSize: broadCount,
        source:'platform'
      })
    }
    const data = JSON.parse(text)
    const raw = data?.choices?.[0]?.message?.content || '{}'
    let parsed:any
    try { parsed = JSON.parse(raw) } catch {
      return NextResponse.json({
        suggestions: localIdeas(inputs, broadBand, bandsByFamily, countsByFamily),
        model: 'parse-fallback',
        sampleSize: broadCount,
        source:'platform'
      })
    }

    const families = ((FAMILY_BY_OBJECTIVE as any)[inputs.objective] || []).slice(0,2) as Family[]
    const arr = Array.isArray(parsed?.suggestions) ? (parsed.suggestions as any[]) : []
    const illq = illiquidHint(inputs.underliers||[])
    const flags:string[] = illq ? [illq] : []

    const suggestions: IdeaOut[] = (arr.length ? arr : families.map((fam, i) => ({
      title: `${fam}: Idea ${i+1}`,
      explainer: (getFamilyExplainer(fam)?.what?.[0] || 'Short explainer unavailable'),
      articleUrl: FAMILY_ARTICLES[fam],
      parameters: undefined
    })))
    .slice(0,2)
    .map((s:any, idx:number) => {
      const fam = families[idx] || undefined
      const title = s?.title && String(s.title).trim()
        ? String(s.title).trim()
        : (fam ? `${fam}: Idea ${idx+1}` : `${inputs.objective}: Idea ${idx+1}`)
      const articleUrl = s?.articleUrl && String(s.articleUrl).startsWith('http')
        ? s.articleUrl
        : (fam ? FAMILY_ARTICLES[fam] : (s?.articleUrl || ''))
      const explainerBase = s?.explainer && String(s.explainer).trim()
        ? String(s.explainer).trim()
        : (fam ? (getFamilyExplainer(fam)?.what?.[0] || 'Short explainer unavailable') : 'Illustrative structure.')
      const explainer = flags.length ? `${explainerBase} ${flags.join(' ')}` : `${explainerBase} For licensed advisers/wholesale; educational only; terms & KIDs prevail.`
      const indicativeCoupon = fam ? computeIndicativeBand({
        family: fam,
        tenorMonths: inputs.tenorMonths,
        currency: inputs.investmentCurrency,
        underliers: inputs.underliers || [],
        platformBand: bandsByFamily[fam] || broadBand
      }) : (s?.indicativeCoupon)

      const parameters = s?.parameters && typeof s.parameters === 'object'
        ? s.parameters
        : {
            Tenor: `${inputs.tenorMonths}m`,
            Risk: inputs.riskProfile,
            Currency: inputs.investmentCurrency,
            Underliers: (inputs.underliers||[]).join(', ')
          }

      return {
        title,
        explainer,
        indicativeCoupon,
        articleUrl,
        parameters,
        mechanics: fam ? defaultMechanics(fam, inputs) : undefined,
        evidenceCount: fam ? (countsByFamily[fam] ?? undefined) : undefined,
        flags: flags.length ? flags : undefined
      }
    })

    const source = broadBand ? 'platform+ai' : 'ai'
    return NextResponse.json({ suggestions, model: MODEL, sampleSize: broadCount, source })
  } catch {
    return NextResponse.json({
      suggestions: localIdeas(inputs, broadBand, bandsByFamily, countsByFamily),
      model: 'local-fallback',
      sampleSize: broadCount,
      source:'platform'
    })
  }
}
