import type { WizardInputs } from './types'

export function couponRange(inputs: WizardInputs): string {
  const { objective, tenorMonths, riskProfile, underliers } = inputs
  const tenorY = Math.max(0.5, Math.min(6, tenorMonths / 12))
  const isIndex = underliers.every(u => /SPX|XJO|NDX|ASX|EURO|SX5E|HSI|MCHI|KWEB|FXI|S&P|MSCI|NASDAQ|DAX/i.test(u))

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
