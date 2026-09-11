import type { Metadata, Viewport } from 'next'
import { Hind_Siliguri } from 'next/font/google'
import { I18nProvider } from '@/i18n/context'
import './globals.css'

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-hind-siliguri',
  display: 'swap',
  preload: false,
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
}

export const metadata: Metadata = {
  title: 'PrintERP SaaS - Operating System for Printing & Signage in Bangladesh',
  description:
    'Production-ready SaaS for digital printing, offset press, flex/banner, stickers, packaging, LED signage, acrylic fabrication, and installation businesses in Bangladesh.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PrintERP',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="bn" className={hindSiliguri.variable} suppressHydrationWarning>
      <body className={`${hindSiliguri.className} antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-cyan-500 selection:text-white`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
