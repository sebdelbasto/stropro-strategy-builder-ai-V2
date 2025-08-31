import './globals.css'
import type { Metadata } from 'next'
import DiagnosticsWidget from '@/components/DiagnosticsWidget'

export const metadata: Metadata = {
  title: 'Strategy Builder – Stropro',
  description: 'Guided structured-investment idea generator for licensed advisers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DiagnosticsWidget />
        {children}
      </body>
    </html>
  )
}
