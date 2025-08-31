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

export function buildPrompt(inputs: {
  objective: string
  tenorMonths: number
  underliers: string[]
  riskProfile: string
  investmentCurrency: string
  notes?: string
}) {
  const { objective, tenorMonths, underliers, riskProfile, investmentCurrency, notes } = inputs

  const RULES = `
You are an institutional structured-products assistant for licensed advisers / wholesale clients.

SCOPE: structured investments (notes, options, barriers, coupons, principal protection, LRL, equity release).
OUT-OF-SCOPE (REFUSE politely): medical, politics, personal/retail advice, illegal topics, PII.

STYLE: educational, compliant, brief (1–3 sentences per explainer). Always include a short disclaimer.
NO QUOTES: never give binding pricing. If asked for precise yield, say "indicative only; terms & KIDs prevail" and suggest "Price this strategy".
ILLiquid underliers: say "may be harder to price" and suggest the pricing CTA.

Return ONLY valid JSON with this exact shape (no markdown, no extra text):

{
  "suggestions": [
    {
      "title": "Enhanced Income: Base Idea",
      "explainer": "One–two sentence explainer. For licensed advisers/wholesale; educational only; terms & KIDs prevail.",
      "indicativeCoupon": "8–12% p.a. (illustrative only)",
      "articleUrl": "",
      "parameters": { "Tenor": "24m", "Risk": "Moderate", "Currency": "AUD", "Underliers": "SPX" }
    },
    {
      "title": "Enhanced Income: Variant",
      "explainer": "Brief variant explanation. For licensed advisers/wholesale; educational only; terms & KIDs prevail.",
      "indicativeCoupon": "8–12% p.a. (illustrative only)",
      "articleUrl": "",
      "parameters": { "Tenor": "18m", "Risk": "Moderate", "Currency": "AUD", "Underliers": "SPX" }
    }
  ]
}
`

  return [
    { role: 'system', content: RULES },
    {
      role: 'user',
      content: `Objective: ${objective}
Tenor (months): ${tenorMonths}
Underliers: ${underliers.join(', ')}
Risk: ${riskProfile}
Currency: ${investmentCurrency}
Notes: ${notes || '—'}
Propose 2–3 options.`,
    },
  ]
}
