'use client'

import { useMemo, useRef, useState } from 'react'
import type { Objective, Suggestion, WizardInputs } from '@/lib/types'
import ChatPanel from '@/components/ChatPanel'
import { articleForFamily } from '@/lib/ai'
import { mechanicsChipsForSuggestion, detectFamilyFromTitle } from '@/lib/heuristics'
import QuickExplainer from '@/components/QuickExplainer'

// If API doesn't return an article link, we always fall back to this:
const DEFAULT_ARTICLE =
  process.env.NEXT_PUBLIC_ARTICLE_BASE || 'https://www.stropro.com/investments-solutions'

const OBJECTIVES: Objective[] = [
  'Capital Preservation',
  'Enhanced Income',
  'Growth',
  'Equity Release',
  'Tax-Effective',
]

const DEFAULTS: WizardInputs = {
  objective: 'Capital Preservation',
  tenorMonths: 24,
  underliers: ['SPX'],
  riskProfile: 'Moderate',
  investmentCurrency: 'USD',
  notes: '',
  investorTypeConfirmed: false,
}

export default function StrategyWizard({ embedMode }: { embedMode?: boolean }) {
  const [step, setStep] = useState(0)
  const [inputs, setInputs] = useState<WizardInputs>({ ...DEFAULTS })
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selected, setSelected] = useState<Suggestion | undefined>()
  const [sent, setSent] = useState(false)
  const [fallbackEcho, setFallbackEcho] = useState<any>(null)
  const [chatHint, setChatHint] = useState<string>('')
  const transcriptRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  // Evidence strip / modal
  const [sampleSize, setSampleSize] = useState<number>(0)
  const [peekOpen, setPeekOpen] = useState(false)
  const [peekRows, setPeekRows] = useState<Array<any>>([])
  const [peekBand, setPeekBand] = useState<string | undefined>()

  const canGenerate = useMemo(
    () => !!inputs.objective && inputs.tenorMonths >= 3 && inputs.underliers.length > 0,
    [inputs]
  )

  function pushUser(msg: string) {
    transcriptRef.current.push({ role: 'user', content: msg })
  }
  function pushAI(msg: string) {
    transcriptRef.current.push({ role: 'assistant', content: msg })
  }

  async function fetchCohortPreview() {
    try {
      const r = await fetch('/api/catalog/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: inputs.objective,
          underliers: inputs.underliers,
          tenorMonths: inputs.tenorMonths,
          investmentCurrency: inputs.investmentCurrency,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Preview failed')
      setPeekRows(j?.samplePeek || [])
      setPeekBand(j?.band)
      setPeekOpen(true)
    } catch (e: any) {
      alert(e?.message || 'Could not load preview.')
    }
  }

  async function generateIdeas() {
    setLoading(true)
    pushUser(
      `Generate ${inputs.objective} ideas for ${inputs.underliers.join(', ')} over ${
        inputs.tenorMonths
      }m (${inputs.riskProfile}, ${inputs.investmentCurrency}). Notes: ${inputs.notes || '—'}`
    )
    try {
      const r = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      })

      if (!r.ok) {
        setSampleSize(0)
        const years = Math.round((inputs.tenorMonths / 12) * 10) / 10
        const list: Suggestion[] = [
          {
            title: `${inputs.objective}: Base Idea`,
            explainer: `Illustrative ${inputs.objective.toLowerCase()} structure over ${years} years on ${inputs.underliers.join(
              ', '
            )}. Tuned to ${inputs.riskProfile} in ${inputs.investmentCurrency}.`,
            articleUrl: DEFAULT_ARTICLE,
            parameters: {
              Tenor: `${inputs.tenorMonths}m`,
              Risk: inputs.riskProfile,
              Currency: inputs.investmentCurrency,
              Underliers: inputs.underliers.join(', '),
            },
          },
        ]
        setSuggestions(list)
        setSelected(undefined)
        pushAI(`Proposed ideas (fallback): ${list.map((s) => s.title).join('; ')}`)
        setStep(2)
        return
      }

      const j = await r.json()
      setSampleSize(Number(j?.sampleSize || 0))
      const list: Suggestion[] = (j.suggestions || []).map((s: Suggestion) => ({
        ...s,
        articleUrl: s.articleUrl || DEFAULT_ARTICLE,
      }))
      setSuggestions(list)
      setSelected(undefined)
      pushAI(`Proposed ideas: ${list.map((s) => s.title).join('; ')}`)
      setStep(2)
    } catch {
      setSampleSize(0)
      const years = Math.round((inputs.tenorMonths / 12) * 10) / 10
      const list: Suggestion[] = [
        {
          title: `${inputs.objective}: Base Idea`,
          explainer: `Illustrative ${inputs.objective.toLowerCase()} structure over ${years} years on ${inputs.underliers.join(
            ', '
          )}. Tuned to ${inputs.riskProfile} in ${inputs.investmentCurrency}.`,
          articleUrl: DEFAULT_ARTICLE,
          parameters: {
            Tenor: `${inputs.tenorMonths}m`,
            Risk: inputs.riskProfile,
            Currency: inputs.investmentCurrency,
            Underliers: inputs.underliers.join(', '),
          },
        },
      ]
      setSuggestions(list)
      setSelected(undefined)
      pushAI(`Proposed ideas (offline fallback): ${list.map((s) => s.title).join('; ')}`)
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  async function refineFromChat() {
    const notes = chatHint ? `${inputs.notes || ''}\nRefinement: ${chatHint}` : inputs.notes
    setInputs((v) => ({ ...v, notes }))
    await generateIdeas()
  }

  async function sendPriceRequest(payload: {
    name: string
    email: string
    firm?: string
    phone?: string
  }) {
    setLoading(true)
    try {
      const res = await fetch('/api/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: payload,
          inputs,
          selectedSuggestion: selected,
          transcript: transcriptRef.current,
        }),
      })
      const j = await res.json()
      if (j && j.ok) setSent(true)
      else if (j && j.echo) setFallbackEcho(j.echo)
      else throw new Error('Could not submit.')
    } catch (e: any) {
      alert(e.message || 'Could not submit. Please email pricing@stropro.com.')
    } finally {
      setLoading(false)
    }
  }

  // Soft warning if many exotic underliers
  function illiquiditySoftFlag(us: string[]) {
    const exotic = us.filter(
      (u) => !/SPX|SX5E|XJO|NDX|DAX|HSI|MSCI|ETF|ASX|S&P|NASDAQ/i.test(u)
    )
    return exotic.length >= 2
      ? `Some underliers may be harder to price (check liquidity, borrow, corp actions): ${exotic
          .slice(0, 3)
          .join(', ')}`
      : null
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* Stepper */}
      <div className="flex items-center gap-3">
        {['Objective', 'Parameters', 'Ideas', 'Submit'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`badge ${step === i ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : ''}`}
            >
              {i + 1}
            </span>
            <span className="text-sm">{label}</span>
            {i < 3 && <div className="w-6 h-px bg-zinc-300 dark:bg-zinc-700" />}
          </div>
        ))}
      </div>

      {/* Step 0: Objective */}
      {step === 0 && (
        <div className="card space-y-4">
          <div>
            <label className="label">What’s the primary objective?</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {OBJECTIVES.map((obj) => (
                <button
                  type="button"
                  key={obj}
                  onClick={() => setInputs((v) => ({ ...v, objective: obj }))}
                  className={`btn-secondary text-left ${
                    inputs.objective === obj ? 'ring-2 ring-stroBlue' : ''
                  }`}
                >
                  {obj}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="small">Educational demo – wholesale clients only</div>
            <button type="button" className="btn-primary" onClick={() => setStep(1)}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Parameters */}
      {step === 1 && (
        <div className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Tenor (months)</label>
              <input
                type="number"
                className="input"
                min={3}
                max={72}
                value={inputs.tenorMonths}
                onChange={(e) => setInputs((v) => ({ ...v, tenorMonths: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="label">Risk profile</label>
              <select
                className="input"
                value={inputs.riskProfile}
                onChange={(e) => setInputs((v) => ({ ...v, riskProfile: e.target.value as any }))}
              >
                <option>Conservative</option>
                <option>Moderate</option>
                <option>Aggressive</option>
              </select>
            </div>
            <div>
              <label className="label">Currency</label>
              <select
                className="input"
                value={inputs.investmentCurrency}
                onChange={(e) =>
                  setInputs((v) => ({ ...v, investmentCurrency: e.target.value as any }))
                }
              >
                <option>USD</option>
                <option>AUD</option>
                <option>EUR</option>
              </select>
            </div>
            <div>
              <label className="label">
                Underliers (comma separated – e.g., SPX, SX5E, AAPL)
              </label>
              <input
                className="input"
                value={inputs.underliers.join(', ')}
                onChange={(e) =>
                  setInputs((v) => ({
                    ...v,
                    underliers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Thesis / notes (optional)</label>
              <textarea
                className="input h-24"
                value={inputs.notes}
                onChange={(e) => setInputs((v) => ({ ...v, notes: e.target.value }))}
              />
            </div>
            <label className="inline-flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                className="scale-110"
                checked={!!inputs.investorTypeConfirmed}
                onChange={(e) =>
                  setInputs((v) => ({ ...v, investorTypeConfirmed: e.target.checked }))
                }
              />
              <span className="small">I confirm I’m a licensed adviser / wholesale client.</span>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <button type="button" className="btn-secondary" onClick={() => setStep(0)}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary disabled:opacity-40"
              disabled={!canGenerate || !inputs.investorTypeConfirmed || loading}
              onClick={generateIdeas}
            >
              {loading ? 'Generating…' : 'Generate ideas'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Ideas */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Soft guardrail if underliers look exotic */}
          {(() => {
            const note = illiquiditySoftFlag(inputs.underliers)
            return note ? (
              <div className="card small border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                {note}
              </div>
            ) : null
          })()}

          <div className="card space-y-3">
            <h3 className="text-lg font-semibold">Suggestions</h3>
            {!suggestions.length && <p className="small">No ideas yet. Try again.</p>}

            <div className="grid gap-3">
              {suggestions.map((s, idx) => {
                // Compute explainer link from detected family if no valid articleUrl
                const family = detectFamilyFromTitle(s.title, inputs.objective)
const link = articleForFamily(family, DEFAULT_ARTICLE)

                return (
                  <div
                    key={`${s.title}-${idx}`}
                    className={`rounded-2xl p-4 border ${
                      selected === s ? 'border-stroBlue' : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{s.title}</div>
                        {s.indicativeCoupon && (
                          <div className="small mt-1">
                            Indicative: {s.indicativeCoupon}{' '}
                            <span className="opacity-60">(illustrative only)</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setSelected(s)}
                      >
                        {selected === s ? 'Selected' : 'Select'}
                      </button>
                    </div>

                    <div className="mt-2 whitespace-pre-wrap text-sm">{s.explainer}</div>

                    {/* Mechanics chips */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {mechanicsChipsForSuggestion(s, inputs).map((c) => (
                        <div key={`${s.title}-${c.k}-${c.v}`} className="badge">
                          <span className="opacity-60 mr-1">{c.k}:</span>
                          {c.v}
                        </div>
                      ))}
                    </div>

                    {/* Quick explainer (block, above link) */}
                    <QuickExplainer family={family} />

                    {/* Evidence strip */}
                    <div className="mt-2 flex items-center gap-2 small">
                      <span className="opacity-70">
                        Based on {sampleSize} similar Stropro products (last 12–18m)
                      </span>
                      <button
                        type="button"
                        onClick={fetchCohortPreview}
                        className="underline opacity-90 hover:opacity-100"
                      >
                        Peek
                      </button>
                      {sampleSize > 0 && (
                        <span className="opacity-70">• May have live examples on platform</span>
                      )}
                      {peekBand && <span className="opacity-60">• Median band: {peekBand}</span>}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <a className="small underline" href={link} target="_blank" rel="noreferrer">
                        Read explainer
                      </a>
                    </div>

                    {!!Object.keys(s.parameters || {}).length && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(s.parameters).map(([k, v]) => (
                          <div key={k} className="badge">
                            {k}: {String(v)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary disabled:opacity-40"
                disabled={!selected}
                onClick={() => setStep(3)}
              >
                Price this strategy
              </button>
            </div>
          </div>

          <ChatPanel
            onAssistant={(m) => {
              transcriptRef.current.push({ role: 'assistant', content: m.content })
              setChatHint(m.content)
            }}
            context={{ inputs, suggestions }}
          />
          <div className="flex justify-end">
            <button type="button" className="btn-secondary" onClick={refineFromChat}>
              Refine ideas from chat
            </button>
          </div>

          <Disclosure />
        </div>
      )}

      {/* Step 3: Submit */}
      {step === 3 && (
        <SubmitCard
          loading={loading}
          sent={sent}
          echo={fallbackEcho}
          onBack={() => setStep(2)}
          onSubmit={sendPriceRequest}
        />
      )}

      {/* Peek modal */}
      {peekOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg w-[min(720px,92vw)] p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Similar products (sample)</div>
              <button className="btn-secondary" onClick={() => setPeekOpen(false)}>
                Close
              </button>
            </div>

            {peekBand && <div className="small mb-2 opacity-70">Band: {peekBand}</div>}

            {!peekRows.length ? (
              <div className="small opacity-70">
                No data loaded. Ensure <code>STROPRO_API_BASE</code> and{' '}
                <code>STROPRO_API_KEY</code> are set.
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-auto space-y-2 pr-1">
                {peekRows.map((r, i) => (
                  <div
                    key={r.id || i}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-2"
                  >
                    <div className="text-sm font-medium">{r.name || r.id}</div>
                    <div className="small opacity-80">
                      {r.type} • {r.currency} • {r.tenorMonths ? `${r.tenorMonths}m` : '—'}
                      {typeof r.couponPct === 'number' ? ` • ${r.couponPct}% p.a.` : ''}
                    </div>
                    <div className="small opacity-60">
                      Underliers: {(r.underliers || []).join(', ') || '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Header() {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Build a Strategy</h1>
        <p className="small">Guided idea generation for licensed advisers. Educational; not personal advice.</p>
      </div>
    </div>
  )
}

function Disclosure() {
  return (
    <div className="card small leading-relaxed">
      <strong>Important:</strong> Educational prototype for licensed advisers/wholesale clients only. Not personal advice. Indicative ranges are illustrative and depend on live markets & final terms.
    </div>
  )
}

function SubmitCard({
  loading,
  sent,
  echo,
  onSubmit,
  onBack,
}: {
  loading: boolean
  sent: boolean
  echo: any
  onSubmit: (p: { name: string; email: string; firm?: string; phone?: string }) => Promise<void>
  onBack: () => void
}) {
  const [form, setForm] = useState({ name: '', email: '', firm: '', phone: '' })
  const valid = form.name.length > 1 && /@/.test(form.email)
  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Send to Investment Desk</h3>
      {sent ? (
        <div className="space-y-2">
          <p>Thanks! The desk has your request and transcript. We’ll optimise the idea and come back to you.</p>
          <div className="small opacity-70">You’ll also receive a copy by email (if configured).</div>
        </div>
      ) : echo ? (
        <div className="space-y-3">
          <p className="small">
            Email service not configured. Copy the payload below and send it to <strong>pricing@stropro.com</strong>:
          </p>
          <textarea className="input h-48">{JSON.stringify(echo, null, 2)}</textarea>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Work email</label>
              <input
                className="input"
                value={form.email}
                onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Firm (optional)</label>
              <input
                className="input"
                value={form.firm}
                onChange={(e) => setForm((v) => ({ ...v, firm: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Phone (optional)</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button type="button" className="btn-secondary" onClick={onBack}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary disabled:opacity-40"
              disabled={!valid || loading}
              onClick={() => onSubmit(form)}
            >
              {loading ? 'Sending…' : 'Submit to desk'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
