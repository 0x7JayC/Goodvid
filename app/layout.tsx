import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import Nav from '@/components/nav'

export const metadata: Metadata = {
  title: 'Goodvid — AI Video Production',
  description: 'Personal AI video generator powered by Seedance',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased min-h-[100dvh] bg-zinc-950">
        <Nav />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  )
}

