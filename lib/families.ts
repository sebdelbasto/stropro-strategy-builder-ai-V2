import type { Objective, WizardInputs } from '@/lib/types'

export const FAMILIES = [
  'Fixed Coupon Note',
  'Smart-Entry Note',
  'Discount-Entry Note',
  'Principal Protected Note',
  'Enhanced Growth (ER/Lookback)',
  'Option & Loan Facility',
  'Protected Equity Loan',
  'Lending (LRL)',
  'Hedging',
] as const;

export type Family = typeof FAMILIES[number];

export const FAMILY_BY_OBJECTIVE: Record<Objective, Family[]> = {
  'Enhanced Income': [
    'Fixed Coupon Note',
    'Smart-Entry Note',
  ],
  'Capital Preservation': [
    'Principal Protected Note',
    'Protected Equity Loan',
    'Hedging',
  ],
  'Growth': [
    'Discount-Entry Note',
    'Enhanced Growth (ER/Lookback)',
    'Smart-Entry Note',
  ],
  'Equity Release': [
    'Option & Loan Facility',
    'Protected Equity Loan',
    'Hedging',
  ],
  'Tax-Effective': [
    'Protected Equity Loan',
    'Lending (LRL)',
    'Option & Loan Facility',
  ],
};


/**
 * Default adviser-facing mechanics per family, derived from inputs.
 * Returns only string values (no undefined) to satisfy Record<string,string>.
 */
export function defaultMechanics(family: Family, inputs: WizardInputs): Record<string, string> {
  const r = inputs.riskProfile
  const tenorM = inputs.tenorMonths
  const tenorY = Math.max(0.5, Math.min(6, tenorM / 12))
  const isIndex = (inputs.underliers || []).every(u =>
    /SPX|SX5E|XJO|NDX|DAX|HSI|MSCI|NASDAQ|S&P|ETF|VAS|IVV/i.test(u)
  )

  const KI =
    r === 'Conservative' ? '50–60% KI' :
    r === 'Aggressive'   ? '30–40% KI' :
                           '40–50% KI'

  const AC = isIndex ? 'Quarterly AC' : 'Semi-annual AC'

  const prot = r === 'Aggressive' ? '90–95% Prot' : '95–100% Prot'

  const partLow = 120 + Math.round(8 * tenorY)
  const partHigh = (r === 'Aggressive' ? 200 : r === 'Moderate' ? 180 : 160) + Math.round(5 * tenorY)
  const part = `${partLow}–${partHigh}% Part.`

  const disc =
    r === 'Aggressive'   ? '15–25% Disc.' :
    r === 'Conservative' ? '25–35% Disc.' :
                           '20–30% Disc.'

  const lvr =
    r === 'Aggressive'   ? 'LVR 75–90%' :
    r === 'Conservative' ? 'LVR 60–75%' :
                           'LVR 70–85%'

  const out: Record<string, string> = {}

  switch (family) {
    case 'Fixed Coupon Note':
      out['Barrier'] = KI
      out['Autocall'] = AC
      break
    case 'Smart-Entry Note':
      out['Smart-Entry'] = (r === 'Aggressive') ? 'SE @ ~80–85%' : (r === 'Conservative') ? 'SE @ ~85–90%' : 'SE @ ~83–88%'
      out['Autocall'] = AC
      break
    case 'Discount-Entry Note':
      out['Discount'] = disc
      out['Worst-of'] = (inputs.underliers || []).length > 1 ? 'Basket (WP)' : 'Single'
      break
    case 'Principal Protected Note':
      out['Protection'] = prot
      out['Part.'] = part
      break
    case 'Enhanced Growth (ER/Lookback)':
      out['Part.'] = part
      out['Feature'] = 'Lookback / Avg-out'
      break
    case 'Option & Loan Facility':
      out['Collar'] = 'Put floor / Call cap'
      out['Loan'] = lvr
      break
    case 'Protected Equity Loan':
      out['Protection'] = 'Loan amount'
      out['Cap'] = 'Optional to reduce rate'
      break
    case 'Lending (LRL)':
      out['Loan'] = lvr
      out['Risk'] = 'Loss limited to interest'
      break
    case 'Hedging':
      out['Structure'] = 'Put / Put-Spread / Collar'
      out['Focus'] = 'Downside reduction'
      break
  }

  // Always include Tenor/CCY for context
  out['Tenor'] = `${tenorM}m`
  out['CCY'] = inputs.investmentCurrency

  return out
}
