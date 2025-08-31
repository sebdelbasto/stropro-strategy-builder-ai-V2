'use client'
import { useEffect, useRef, useState } from 'react'

export default function ChatPanel({
  onAssistant,
  context
}: {
  onAssistant?: (m: { role: 'assistant', content: string }) => void
  context?: any
}) {
  const MAX_TURNS = Number(process.env.NEXT_PUBLIC_MAX_CHAT_TURNS || 6)
  const COOLDOWN_MS = Number(process.env.NEXT_PUBLIC_CHAT_COOLDOWN_MS || 8000)

  const [messages, setMessages] = useState<Array<{ role: 'user'|'assistant', content: string }>>([
    { role: 'assistant', content: 'Hi! Ask about structured investments, or say “refine ideas” to tune parameters.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [nextAllowedAt, setNextAllowedAt] = useState<number>(0)
  const [tick, setTick] = useState(0) // forces re-render during cooldown

  const lastSendAt = useRef<number>(0)

  // re-render every 500ms so cooldown countdown updates
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 500)
    return () => clearInterval(id)
  }, [])

  async function send() {
    const now = Date.now()
    if (now < nextAllowedAt) return
    if (!input.trim()) return
    if (messages.length >= MAX_TURNS) return

    const nextMsgs = [...messages, { role: 'user' as const, content: input.trim() }]
    setMessages(nextMsgs)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMsgs, lastAt: lastSendAt.current, context }),
      })
      const j = await res.json()

      if (j.wait) {
        setNextAllowedAt(Date.now() + (j.wait || COOLDOWN_MS))
        setLoading(false)
        return
      }

      const reply = (j && j.message) ? String(j.message) : '…'
      const newMsgs = [...nextMsgs, { role: 'assistant' as const, content: reply }]
      setMessages(newMsgs)
      lastSendAt.current = Date.now()
      setNextAllowedAt(j?.nextAllowedAt || (Date.now() + COOLDOWN_MS))
      setLoading(false)
      onAssistant?.({ role: 'assistant', content: reply })
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'AI is unavailable. Please try again or use "Generate ideas".' }])
      setLoading(false)
    }
  }

  const canType = messages.length < MAX_TURNS
  const cooldownLeft = Math.max(0, Math.ceil((nextAllowedAt - Date.now())/1000))

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Ask about structured investments</div>
        <div className="small opacity-70">
          {canType ? `Remaining: ${Math.max(0, MAX_TURNS - messages.length)}` : 'Chat limit reached'}
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-auto pr-1">
        {messages.map((m,i)=>(
          <div key={i} className={m.role==='assistant' ? 'small' : 'text-sm'}>
            <span className="opacity-60">{m.role==='assistant'?'AI':'You'}:</span> {m.content}
          </div>
        ))}
      </div>

      {canType ? (
        <div className="flex items-center gap-2">
          <input
            className="input flex-1"
            placeholder={cooldownLeft>0 ? `Cooling down… ${cooldownLeft}s` : 'e.g., Lower barrier / quarterly autocall / AUD'}
            value={input}
            disabled={loading || cooldownLeft>0}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') send() }}
          />
          <button className="btn-secondary" onClick={send} disabled={loading || cooldownLeft>0}>Send</button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="small">Chat limit reached to help manage costs.</div>
          <a className="btn-secondary" href="mailto:pricing@stropro.com?subject=Backtest%20or%20Pricing%20Request">
            Contact desk
          </a>
        </div>
      )}
    </div>
  )
}
