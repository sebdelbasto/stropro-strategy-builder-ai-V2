'use client'
import { useEffect } from 'react'
import StrategyWizard from '@/components/StrategyWizard'

export default function EmbedPage() {
  useEffect(() => {
    const post = () => {
      const h = document.documentElement.scrollHeight || document.body.scrollHeight || 1000
      window.parent?.postMessage({ type: 'stropro-embed-height', height: h }, '*')
    }
    const ro = new ResizeObserver(post)
    ro.observe(document.body)
    window.addEventListener('load', post)
    window.addEventListener('resize', post)
    post()
    return () => {
      ro.disconnect()
      window.removeEventListener('load', post)
      window.removeEventListener('resize', post)
    }
  }, [])

  return (
    <main className="container py-6">
      <StrategyWizard embedMode />
    </main>
  )
}
