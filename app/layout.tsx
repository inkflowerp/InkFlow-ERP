import type { Metadata, Viewport } from 'next'
import { Inter, Hind_Siliguri, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { I18nProvider } from '@/i18n/context'
import { PlatformSettingsProvider } from '@/components/providers/platform-settings-provider'
import { PlatformService } from '@/services/platform.service'
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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await PlatformService.getPublicPlatformSettings()
  const title = settings.app_title || `${settings.app_name || 'PrintERP'} SaaS - Operating System for Printing & Signage in Bangladesh`
  const description = settings.app_description || 'Production-ready SaaS for digital printing, offset press, flex/banner, stickers, packaging, LED signage, acrylic fabrication, and installation businesses in Bangladesh.'
  const favicon = settings.favicon_url || '/favicon.ico'

  return {
    title,
    description,
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: settings.app_name || 'PrintERP',
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialSettings = await PlatformService.getPublicPlatformSettings()

  return (
    <html
      lang="bn"
      className={`${inter.variable} ${hindSiliguri.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var key = 'printerp_theme';
                  var stored = localStorage.getItem(key);
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark) || (stored === 'system' && prefersDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
        <PlatformSettingsProvider initialSettings={initialSettings}>
          <ThemeProvider>
            <I18nProvider>{children}</I18nProvider>
          </ThemeProvider>
        </PlatformSettingsProvider>
      </body>
    </html>
  )
}

