export type FamilyKey =
  | 'Fixed Coupon Note'
  | 'Smart-Entry Note'
  | 'Discount-Entry Note'
  | 'Principal Protected Note'
  | 'Enhanced Growth (ER/Lookback)'
  | 'Option & Loan Facility'
  | 'Protected Equity Loan'
  | 'Lending (LRL)'
  | 'Hedging'

type Explainer = { what:string[]; when:string[]; risks:string[] }

const E: Record<FamilyKey, Explainer> = {
  'Fixed Coupon Note': {
    what: [
      'Periodic coupon (typically monthly/quarterly), contingent on downside barrier not breached at maturity.',
      'Autocall mechanics may redeem early once underliers above trigger on observation.',
    ],
    when: [
      'Seek enhanced income with significant downside protection.',
      'Comfortable with worst-of baskets and issuer credit risk.'
    ],
    risks: [
      'Barrier breach → capital linked to worst performer at maturity.',
      'Issuer credit risk; market/vol volatility can affect secondary value.'
    ],
  },
  'Smart-Entry Note': {
    what: [
      'Income as per FCN plus the option to acquire shares at a discount (smart-entry level) if markets sell off.',
      'Autocall may apply; worst-of mechanics on baskets.'
    ],
    when: [
      'Want income now and a pre-defined buy-the-dip entry if markets fall.'
    ],
    risks: [
      'If smart-entry triggers near lows, you take shares; capital at risk thereafter.',
      'Issuer credit risk.'
    ],
  },
  'Discount-Entry Note': {
    what: [
      'Pay reduced entry (e.g., 20–30% discount) to the underlier or basket.',
      'At maturity: cash if above entry, shares if below.'
    ],
    when: [
      'Bullish with valuation discipline; missed the run and want a buffer.'
    ],
    risks: [
      'Bear markets can still deliver losses on received shares.',
      'Worst-of basket risk; issuer credit risk.'
    ],
  },
  'Principal Protected Note': {
    what: [
      'Protection level (e.g., 95–100%) at maturity, with upside participation and/or cap.',
      'Often includes averaging windows to reduce timing risk.'
    ],
    when: [
      'Capital preservation priority; willing to trade some upside for protection.'
    ],
    risks: [
      'Protection applies at maturity only; secondary can be volatile.',
      'Participation/caps limit upside; issuer credit risk.'
    ],
  },
  'Enhanced Growth (ER/Lookback)': {
    what: [
      'Capital-efficient participation (e.g., ER index), often with lookback entry/average out.',
      'Small outlay for notional exposure; upside geared vs cash outlay.'
    ],
    when: [
      'Return-seeking investors who accept full loss of outlay if underlier underperforms.'
    ],
    risks: [
      'Can lose full outlay; path-dependency of lookback/averaging.',
      'Issuer credit risk.'
    ],
  },
  'Option & Loan Facility': {
    what: [
      'Borrow against stock collateral; collar overlays (put floor/call cap) protect collateral.',
      'Access liquidity without immediate disposal.'
    ],
    when: [
      'Large single-name holdings; want liquidity and risk management.'
    ],
    risks: [
      'Collateral/volatility risk; settlement of options at maturity.',
      'Financing costs; counterparty risk.'
    ],
  },
  'Protected Equity Loan': {
    what: [
      'Loan secured by equities with protection to the loan amount; optional cap to reduce interest.',
      'Dividends/franking flow during term; pay interest (often prepaid).'
    ],
    when: [
      'Tax-effective equity exposure with defined downside to loan amount (seek independent tax advice).'
    ],
    risks: [
      'Tax outcomes depend on circumstances; seek independent tax advice.',
      'Issuer/financier risk; cap limits upside.'
    ],
  },
  'Lending (LRL)': {
    what: [
      'Limited recourse loan funds 100% exposure; investor’s loss limited to interest/outlay.',
      'Often references ER indices; high capital efficiency.'
    ],
    when: [
      'Return-seeking; accept loss of paid interest if underlier underperforms (seek tax advice on deductibility).'
    ],
    risks: [
      'Full loss of interest/outlay possible; leverage magnifies outcomes.',
      'Counterparty risk.'
    ],
  },
  'Hedging': {
    what: [
      'Puts/put-spreads/collars to reduce downside of equity portfolios.',
      'Customised maturities/strikes to meet risk budget.'
    ],
    when: [
      'Desire drawdown control or volatility management.'
    ],
    risks: [
      'Premium/drag; basis risk vs portfolio; roll costs.'
    ],
  },
}

export function getFamilyExplainer(f: FamilyKey): Explainer {
  return E[f]
}
