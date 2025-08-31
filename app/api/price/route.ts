import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import sgMail from '@sendgrid/mail'

const ContactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  firm: z.string().optional(),
  phone: z.string().optional(),
})
const PriceSchema = z.object({
  contact: ContactSchema,
  inputs: z.any(),
  selectedSuggestion: z.any().optional(),
  transcript: z.array(z.object({ role: z.enum(['user','assistant']), content: z.string() }))
})

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parse = PriceSchema.safeParse(body)
    if (!parse.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const data = parse.data
    const to = process.env.RECIPIENT_EMAIL
    const from = process.env.FROM_EMAIL
    if (!to || !from) return NextResponse.json({ error: 'Email env not configured' }, { status: 500 })

    const sgKey = process.env.SENDGRID_API_KEY
    if (!sgKey) return NextResponse.json({ ok: false, message: 'SENDGRID_API_KEY missing', echo: data }, { status: 200 })

    sgMail.setApiKey(sgKey)
    const subject = `New Pricing Request – ${data.inputs.objective} – ${data.inputs.underliers?.join(', ')}`

    const html = `
      <h2>${process.env.COMPANY_NAME || 'Company'} – Strategy Pricing Request</h2>
      <p><strong>Name:</strong> ${escapeHtml(data.contact.name)}<br/>
         <strong>Email:</strong> ${escapeHtml(data.contact.email)}<br/>
         <strong>Firm:</strong> ${escapeHtml(data.contact.firm || '')}<br/>
         <strong>Phone:</strong> ${escapeHtml(data.contact.phone || '')}</p>
      <hr/>
      <h3>Inputs</h3>
      <pre style="white-space:pre-wrap">${escapeHtml(JSON.stringify(data.inputs, null, 2))}</pre>
      <h3>Selected Suggestion</h3>
      <pre style="white-space:pre-wrap">${escapeHtml(JSON.stringify(data.selectedSuggestion || {}, null, 2))}</pre>
      <h3>Transcript</h3>
      <pre style="white-space:pre-wrap">${escapeHtml(JSON.stringify(data.transcript, null, 2))}</pre>
      <hr/>
      <p style="font-size:12px;color:#666">Auto-generated from the embedded Strategy Builder.</p>
    `
    await sgMail.send({ to, from, subject, html })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
function escapeHtml(str: string) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
