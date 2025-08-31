// lib/ai.ts (unified + clean)
export const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
export const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
export const ARTICLE_BASE = process.env.ARTICLE_BASE || 'https://www.stropro.com/investments-solutions'

export const ARTICLE_MAP: Record<string,string> = {
  'Capital Preservation': 'https://www.stropro.com/investment-products/capital-protection-with-participation',
  'Enhanced Income': 'https://www.stropro.com/investment-products/fixed-coupon-notes',
  'Growth': 'https://www.stropro.com/investment-products/enhanced-growth',
  'Equity Release': 'https://www.stropro.com/investment-products/option-loan-facility',
  // Note: site currently spells this slug as "enhnaced"
  'Tax-Effective': 'https://www.stropro.com/investment-products/enhnaced-growth-with-deductibility',
}

export function articleForObjective(obj:string){
  return ARTICLE_MAP[obj] || ARTICLE_BASE
}

// --- Family article links (exact product pages) ---
export const FAMILY_ARTICLES: Record<string, string> = {
  'Fixed Coupon Note': 'https://www.stropro.com/investment-products/fixed-coupon-notes',
  'Smart-Entry Note': 'https://www.stropro.com/investment-products/smart-entry-note',
  'Discount-Entry Note': 'https://www.stropro.com/investment-products/discount-entry-notes',
  'Principal Protected Note': 'https://www.stropro.com/investment-products/capital-protection-with-participation',
  'Enhanced Growth (ER/Lookback)': 'https://www.stropro.com/investment-products/enhanced-growth',
  'Option & Loan Facility': 'https://www.stropro.com/investment-products/option-loan-facility',
  'Protected Equity Loan': 'https://www.stropro.com/investment-products/protected-equity-loans',
  'Lending (LRL)': 'https://www.stropro.com/investment-products/enhnaced-growth-with-deductibility',
  'Hedging': 'https://www.stropro.com/investments-solutions'
}


// prompt builder (kept minimal; your app uses it)
export function buildPrompt(inputs: {
  objective: string
  tenorMonths: number
  underliers: string[]
  riskProfile: string
  investmentCurrency: string
  notes?: string
}) {
  const { objective, tenorMonths, underliers, riskProfile, investmentCurrency, notes } = inputs
  const RULES =
`You are an institutional structured-products assistant for licensed advisers / wholesale clients.
SCOPE: structured investments (notes, options, barriers, coupons, principal protection, LRL, equity release).
REFUSE politely if off-topic.
STYLE: educational, compliant, brief (1–3 sentences per explainer). Include short disclaimer. Never give binding pricing.`;

  return [
    { role: 'system', content: RULES },
    { role: 'user', content:
`Objective: ${objective}
Tenor (months): ${tenorMonths}
Underliers: ${underliers.join(', ')}
Risk: ${riskProfile}
Currency: ${investmentCurrency}
Notes: ${notes || '—'}
Propose 2–3 options (JSON).` },
  ]
}


export function articleForFamily(family: string | undefined, fallbackBase?: string) {
  if (!family) return fallbackBase || ARTICLE_BASE
  // @ts-ignore
  return (typeof FAMILY_ARTICLES !== 'undefined' && FAMILY_ARTICLES[family]) || (fallbackBase || ARTICLE_BASE)
}

export function normalizeExplainerUrl(family: string | undefined, url?: string) {
  if (!url || !/^https?:\/\//.test(url)) return undefined
  // Force-correct known singular/typo slugs to canonical pages
  const fixes: Array<[RegExp, string]> = [
    [/\/fixed-coupon-note(\/|$)/i, 'https://www.stropro.com/investment-products/fixed-coupon-notes'],
    [/\/discount-entry-note(\/|$)/i, 'https://www.stropro.com/investment-products/discount-entry-notes'],
    [/\/protected-equity-loan(\/|$)/i, 'https://www.stropro.com/investment-products/protected-equity-loans'],
    [/\/enhanced-growth-with-deductibility(\/|$)/i, 'https://www.stropro.com/investment-products/enhnaced-growth-with-deductibility']
  ]
  for (const [rx, target] of fixes) {
    if (rx.test(url)) return target
  }
  // If AI returned the generic landing page, prefer our family mapping
  if (/\/investments-solutions(\/|$)/i.test(url)) {
    return articleForFamily(family)
  }
  return url
}
