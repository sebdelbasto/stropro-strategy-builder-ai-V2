import { z } from 'zod'

export const SuggestionSchema = z.object({
  title: z.string(),
  explainer: z.string(),
  indicativeCoupon: z.string().optional(),
  articleUrl: z.string().url().optional(),
  parameters: z.record(z.union([z.string(), z.number()])).default({})
})

export const SuggestionListSchema = z.object({
  suggestions: z.array(SuggestionSchema).min(1),
  note: z.string().optional()
})

export type SuggestionList = z.infer<typeof SuggestionListSchema>
