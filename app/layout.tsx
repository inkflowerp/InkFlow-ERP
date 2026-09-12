import type { Metadata, Viewport } from 'next'
import { Inter, Hind_Siliguri, JetBrains_Mono } from 'next/font/google'
import { I18nProvider } from '@/i18n/context'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-hind-siliguri',
  display: 'swap',
  preload: false,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
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
    <html
      lang="bn"
      className={`${inter.variable} ${hindSiliguri.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
