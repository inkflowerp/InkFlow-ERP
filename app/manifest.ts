import type { MetadataRoute } from 'next'
import { BRAND } from '@/config/brand'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} - Printing & Signage OS`,
    short_name: BRAND.name,
    description: 'Operating System for Digital Printing, Offset Press, Packaging, and LED Signage in Bangladesh.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Quick Quote',
        short_name: 'Quote',
        description: 'Calculate instant print estimate in BDT',
        url: '/pricing',
      },
      {
        name: 'Production Floor',
        short_name: 'Production',
        description: 'View assigned print jobs and press queue',
        url: '/production',
      },
      {
        name: 'Today\'s Sales',
        short_name: 'Sales',
        description: 'Owner daily sales and collection KPI',
        url: '/sales',
      },
    ],
    categories: ['business', 'productivity', 'utilities'],
  }
}
