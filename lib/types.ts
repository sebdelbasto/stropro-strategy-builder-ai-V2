import { z } from 'zod'

export const Objectives = [
  'Capital Preservation',
  'Enhanced Income',
  'Growth',
  'Equity Release',
  'Tax-Effective',
] as const

export type Objective = typeof Objectives[number]

export const InputSchema = z.object({
  objective: z.enum(Objectives),
  tenorMonths: z.number().min(3).max(72),
  underliers: z.array(z.string()).min(1),
  riskProfile: z.enum(['Conservative', 'Moderate', 'Aggressive']),
  investmentCurrency: z.enum(['USD','AUD','EUR']).default('USD'),
  notes: z.string().optional(),
  investorTypeConfirmed: z.boolean().optional(),
})

export type WizardInputs = z.infer<typeof InputSchema>

export type Suggestion = {
  title: string
  explainer: string
  indicativeCoupon?: string
  articleUrl?: string
  parameters: Record<string, string | number>
}

export type PriceRequest = {
  contact: { name: string; email: string; firm?: string; phone?: string }
  inputs: WizardInputs
  selectedSuggestion?: Suggestion
  transcript: Array<{ role: 'user' | 'assistant'; content: string }>
}
