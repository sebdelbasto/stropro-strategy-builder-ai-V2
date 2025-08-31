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
