import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ONK Solutions — Contract Notes & Tally Integration',
  description: 'Parse broker contract notes and export journal entries to TallyPrime. Designed by ONK Solutions.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
