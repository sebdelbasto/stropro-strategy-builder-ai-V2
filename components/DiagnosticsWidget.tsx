'use client'
import { useEffect, useState } from 'react'

export default function DiagnosticsWidget() {
  const [diag, setDiag] = useState<any>(null)
  const [plat, setPlat] = useState<any>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const a = await fetch('/api/diagnostics').then(r=>r.json()).catch(()=>null)
        const b = await fetch('/api/platform/health').then(r=>r.json()).catch(()=>null)
        setDiag(a); setPlat(b)
      } catch {}
    }
    load()
  }, [])

  return (
    <div className="fixed top-2 right-2 z-40">
      <button className="btn-secondary text-xs" onClick={()=>setOpen(o=>!o)}>
        {open ? 'Close' : 'Diagnostics'}
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs shadow-lg min-w-[280px]">
          <div className="font-medium mb-1">Environment</div>
          <div className="space-y-1">
            <div>Model: <span className="opacity-80">{diag?.model ?? '—'}</span></div>
            <div>OpenAI Key: <span className={`opacity-80 ${diag?.hasOpenAIKey?'text-green-600':'text-red-600'}`}>{String(!!diag?.hasOpenAIKey)}</span></div>
            <div>Article base: <span className="opacity-80">{diag?.articleBase ?? diag?.nextPublicArticleBase ?? '—'}</span></div>
          </div>
          <div className="font-medium mt-2 mb-1">Platform</div>
          <div className="space-y-1">
            <div>Base: <span className="opacity-80">{plat?.base ?? '—'}</span></div>
            <div>Health: <span className={`opacity-80 ${plat?.ok?'text-green-600':'text-red-600'}`}>{String(!!plat?.ok)}</span></div>
            <div>Recent count: <span className="opacity-80">{plat?.count ?? '—'}</span></div>
          </div>
          <div className="mt-2 text-[11px] opacity-70">Only visible to you (dev widget).</div>
        </div>
      )}
    </div>
  )
}
