// lib/heuristics.ts
import type { WizardInputs, Suggestion } from './types'

export function couponRange(inputs: WizardInputs): string {
  const { objective, tenorMonths, riskProfile, underliers } = inputs
  const tenorY = Math.max(0.5, Math.min(6, tenorMonths / 12))
  const isIndex = underliers.every(u =>
    /SPX|XJO|NDX|ASX|EURO|SX5E|HSI|MCHI|KWEB|FXI|S&P|MSCI|NASDAQ|DAX/i.test(u)
  )

  const riskBump = riskProfile === 'Aggressive' ? 1 : riskProfile === 'Moderate' ? 0.6 : 0.3
  const base = isIndex ? 1 : 1.2

  if (objective === 'Capital Preservation') {
    const low = 0.8 * base * tenorY
    const high = (2.2 + riskBump) * base * tenorY
    return `${low.toFixed(1)}–${high.toFixed(1)}% p.a. (100% protection)`
  }
  if (objective === 'Enhanced Income') {
    const low = (4 + 2 * tenorY) * base
    const high = (9 + 3 * riskBump + 3 * tenorY) * base
    return `${low.toFixed(0)}–${high.toFixed(0)}% p.a. (snowball/contingent)`
  }
  if (objective === 'Growth') {
    const low = (110 + 10 * tenorY)
    const high = (180 + 20 * riskBump + 15 * tenorY)
    return `${low.toFixed(0)}–${high.toFixed(0)}% participation; alt: 1.3–2.0× GEARED`
  }
  if (objective === 'Equity Release') {
    const low = 60 + 5 * tenorY
    const high = 80 + 10 * riskBump + 8 * tenorY
    return `${low.toFixed(0)}–${high.toFixed(0)}% LVR typical; cost depends on collar`
  }
  if (objective === 'Tax-Effective') {
    const low = 1.0 * tenorY
    const high = (3.0 + riskBump) * tenorY
    return `${low.toFixed(1)}–${high.toFixed(1)}% p.a. (tax outcomes depend on circumstances)`
  }
  return '—'
}

// ---------------- Family detector ----------------
export function detectFamilyFromTitle(
  title: string,
  objective?: string
):
  | 'Fixed Coupon Note'
  | 'Smart-Entry Note'
  | 'Discount-Entry Note'
  | 'Principal Protected Note'
  | 'Enhanced Growth (ER/Lookback)'
  | 'Option & Loan Facility'
  | 'Protected Equity Loan'
  | 'Lending (LRL)'
  | 'Hedging'
{
  const t = (title || '').toLowerCase()

  if (/\bsmart[-\s]?entry\b/.test(t)) return 'Smart-Entry Note'
  if (/\bdiscount[-\s]?entry\b/.test(t)) return 'Discount-Entry Note'
  if (/\bprincipal\b|\bprotected note\b|\bppn\b/.test(t)) return 'Principal Protected Note'
  if (/\bfixed coupon\b|\bfcn\b|\bincome\b|\bautocall\b|\bsnowball\b/.test(t)) return 'Fixed Coupon Note'
  if (/\benhanced growth\b|\ber\b|\blookback\b/.test(t)) return 'Enhanced Growth (ER/Lookback)'
  if (/\boption\b.*\bloan\b|\bequity release\b|\blof\b/.test(t)) return 'Option & Loan Facility'
  if (/\bprotected equity loan\b|\bpel\b/.test(t)) return 'Protected Equity Loan'
  if (/\blimited recourse loan\b|\blrl\b/.test(t)) return 'Lending (LRL)'
  if (/\bhedge\b|\bcollar\b|\bput\b/.test(t)) return 'Hedging'

  switch (objective) {
    case 'Enhanced Income': return 'Fixed Coupon Note'
    case 'Growth': return 'Discount-Entry Note'
    case 'Capital Preservation': return 'Principal Protected Note'
    case 'Equity Release': return 'Option & Loan Facility'
    case 'Tax-Effective': return 'Protected Equity Loan'
    default: return 'Fixed Coupon Note'
  }
}

// ---------------- Mechanics chips ----------------
type Chip = { k: string; v: string }

function riskBarrierBand(risk: WizardInputs['riskProfile']) {
  if (risk === 'Conservative') return '50–60% KI'
  if (risk === 'Aggressive')   return '30–40% KI'
  return '40–50% KI'
}

function defaultAutocall(underliers: string[]) {
  const isIndex = underliers.every(u => /SPX|SX5E|XJO|NDX|DAX|HSI|MSCI|NASDAQ|S&P/i.test(u))
  return isIndex ? 'Quarterly AC' : 'Semi-annual AC'
}

function ppnProtection(risk: WizardInputs['riskProfile']) {
  return risk === 'Aggressive' ? '90–95% Prot' : '95–100% Prot'
}

function participationBand(risk: WizardInputs['riskProfile'], tenorM: number) {
  const y = Math.max(0.5, Math.min(6, tenorM / 12))
  const low = 120 + Math.round(8 * y)
  const high = (risk === 'Aggressive' ? 200 : risk === 'Moderate' ? 180 : 160) + Math.round(5 * y)
  return `${low}–${high}% Part.`
}

function discountBand(risk: WizardInputs['riskProfile']) {
  if (risk === 'Aggressive') return '15–25% Disc.'
  if (risk === 'Conservative') return '25–35% Disc.'
  return '20–30% Disc.'
}

function smartEntryLevel(risk: WizardInputs['riskProfile']) {
  if (risk === 'Aggressive') return 'SE @ ~80–85%'
  if (risk === 'Conservative') return 'SE @ ~85–90%'
  return 'SE @ ~83–88%'
}

function lvrBand(risk: WizardInputs['riskProfile']) {
  if (risk === 'Aggressive') return 'LVR 75–90%'
  if (risk === 'Conservative') return 'LVR 60–75%'
  return 'LVR 70–85%'
}

function illiquidityFlag(underliers: string[]) {
  const exotic = underliers.filter(u => !/SPX|SX5E|XJO|NDX|DAX|HSI|MSCI|ETF|ASX|S&P|NASDAQ/i.test(u))
  return exotic.length >= 2 ? 'May be harder to price' : null
}

export function mechanicsChipsForSuggestion(s: Suggestion, inputs: WizardInputs): Chip[] {
  const fam = detectFamilyFromTitle(s.title, inputs.objective)
  const chips: Chip[] = []
  const coupon = s.indicativeCoupon ? s.indicativeCoupon.replace(/\s*\(.*?\)\s*$/, '') : undefined
  const illiq = illiquidityFlag(inputs.underliers)

  switch (fam) {
    case 'Fixed Coupon Note':
      chips.push({ k: 'Barrier', v: riskBarrierBand(inputs.riskProfile) })
      chips.push({ k: 'Autocall', v: defaultAutocall(inputs.underliers) })
      if (coupon) chips.push({ k: 'Coupon', v: coupon })
      break

    case 'Smart-Entry Note':
      chips.push({ k: 'Smart-Entry', v: smartEntryLevel(inputs.riskProfile) })
      chips.push({ k: 'Autocall', v: defaultAutocall(inputs.underliers) })
      if (coupon) chips.push({ k: 'Coupon', v: coupon })
      break

    case 'Discount-Entry Note':
      chips.push({ k: 'Discount', v: discountBand(inputs.riskProfile) })
      chips.push({ k: 'Worst-of', v: inputs.underliers.length > 1 ? 'Basket (WP)' : 'Single' })
      break

    case 'Principal Protected Note':
      chips.push({ k: 'Protection', v: ppnProtection(inputs.riskProfile) })
      chips.push({ k: 'Part.', v: participationBand(inputs.riskProfile, inputs.tenorMonths) })
      break

    case 'Enhanced Growth (ER/Lookback)':
      chips.push({ k: 'Part.', v: participationBand(inputs.riskProfile, inputs.tenorMonths) })
      chips.push({ k: 'Feature', v: 'Lookback / Avg-out' })
      break

    case 'Option & Loan Facility':
      chips.push({ k: 'Collar', v: 'Put floor / Call cap' })
      chips.push({ k: 'Loan', v: lvrBand(inputs.riskProfile) })
      break

    case 'Protected Equity Loan':
      chips.push({ k: 'Loan', v: lvrBand(inputs.riskProfile) })
      chips.push({ k: 'Note', v: 'Potential tax deductibility' })
      break

    case 'Lending (LRL)':
      chips.push({ k: 'Loan', v: lvrBand(inputs.riskProfile) })
      chips.push({ k: 'Risk', v: 'Loss limited to interest' })
      break

    case 'Hedging':
      chips.push({ k: 'Structure', v: 'Put / Put-Spread / Collar' })
      chips.push({ k: 'Focus', v: 'Downside reduction' })
      break
  }

  if (illiq) chips.push({ k: 'Note', v: illiq })
  chips.push({ k: 'Tenor', v: `${inputs.tenorMonths}m` })
  chips.push({ k: 'CCY', v: inputs.investmentCurrency })

  return chips
}
