'use client'

import React from 'react'

interface PrintLetterheadArtProps {
  documentTypeTitleEn?: string
  documentTypeTitleBn?: string
  companyName?: string
  phone?: string
  email?: string
  website?: string
  address?: string
  mode?: 'full_page' | 'header_footer'
  className?: string
}

export function PrintLetterheadArt({
  documentTypeTitleEn = 'QUOTATION',
  documentTypeTitleBn = 'কোটেশন',
  companyName = 'PrintFlow',
  phone = '+880 1712 345678',
  email = 'info@printflow.bd',
  website = 'www.printflow.bd',
  address = 'House 12, Road 5, Sector 7, Uttara, Dhaka-1230',
  mode = 'full_page',
  className = '',
}: PrintLetterheadArtProps) {
  return (
    <div
      data-letterhead-artwork="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. TOP HEADER ARTWORK */}
      <div className="absolute top-0 left-0 right-0 h-[17%] w-full flex items-start justify-between">
        {/* Top Left: Logo & Corporate Identity */}
        <div className="pt-4 pl-5 sm:pt-5 sm:pl-6 z-10 max-w-[55%]">
          <div className="flex items-center gap-2">
            {/* PrintFlow Stylized Logo Mark */}
            <div className="flex items-center gap-1.5">
              <svg
                viewBox="0 0 32 32"
                fill="none"
                className="h-7 w-7 shrink-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 16C6 10.477 10.477 6 16 6C21.523 6 26 10.477 26 16C26 21.523 21.523 26 16 26"
                  stroke="#10B981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="16" cy="16" r="3.5" fill="#047857" />
                <path
                  d="M8 22L16 14L24 22"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <span className="text-lg sm:text-xl font-black tracking-tight text-[#064E3B] leading-none block">
                  {companyName}
                </span>
                <span
                  style={{ fontSize: '8px', lineHeight: '10px' }}
                  className="font-bold tracking-widest text-[#059669] uppercase block mt-0.5"
                >
                  SIGNAGE • PRINT • GROW TOGETHER
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div
            style={{ fontSize: '8px', lineHeight: '11px' }}
            className="mt-1.5 space-y-0.5 text-[#374151] font-medium leading-tight"
          >
            <div className="flex items-center gap-1">
              <span className="text-[#059669] font-bold">⌂</span>
              <span>{address}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="text-[#059669] font-bold">☎</span>
                <span>{phone}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[#059669] font-bold">✉</span>
                <span>{email}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#059669] font-bold">🌐</span>
              <span className="text-[#065F46] font-semibold">{website}</span>
            </div>
          </div>
        </div>

        {/* Top Right: Flowing Curved Header Banner */}
        <div className="relative w-[48%] h-full">
          <svg
            viewBox="0 0 320 120"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background decorative wave curves */}
            <path
              d="M0 0C60 40 140 30 200 10L320 0V120H150C80 120 40 60 0 0Z"
              fill="#D1FAE5"
              fillOpacity="0.4"
            />
            <path
              d="M30 0C100 45 180 35 240 15L320 0V110H160C110 110 70 70 30 0Z"
              fill="#059669"
              fillOpacity="0.85"
            />
            <path
              d="M70 0C130 50 200 40 260 20L320 0V105H180C140 105 100 65 70 0Z"
              fill="#064E3B"
            />
          </svg>

          {/* Title overlay on dark green curve */}
          <div className="absolute top-2.5 sm:top-3.5 right-3.5 sm:right-5 text-right z-10 text-white">
            <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight uppercase">
              {documentTypeTitleEn}
            </h1>
            <p className="text-xs sm:text-sm font-bold text-white/90 leading-none mt-0.5">
              {documentTypeTitleBn}
            </p>
            <p
              style={{ fontSize: '7.5px', lineHeight: '9px' }}
              className="font-semibold text-white/80 uppercase tracking-widest mt-1"
            >
              YOUR PRINTING & SIGNAGE PARTNER
            </p>
          </div>
        </div>
      </div>

      {/* 2. OPTIONAL WATERMARK FOR FULL PAGE MODE */}
      {mode === 'full_page' && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-[45%] h-[45%]" fill="currentColor">
            <circle cx="50" cy="50" r="40" stroke="#064E3B" strokeWidth="6" fill="none" />
            <text
              x="50"
              y="56"
              fontSize="14"
              fontWeight="900"
              textAnchor="middle"
              fill="#064E3B"
            >
              PRINTFLOW
            </text>
          </svg>
        </div>
      )}

      {/* 3. BOTTOM FOOTER ARTWORK */}
      <div className="absolute bottom-0 left-0 right-0 h-[10%] w-full flex flex-col justify-end">
        {/* Category Service Pills Bar */}
        <div className="relative w-full">
          {/* Decorative swooshes */}
          <svg
            viewBox="0 0 600 45"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-8 block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 45C100 15 220 5 350 15C480 25 550 40 600 45H0Z"
              fill="#10B981"
              fillOpacity="0.3"
            />
            <path
              d="M0 45C120 22 250 15 400 22C490 27 560 38 600 45H0Z"
              fill="#F59E0B"
              fillOpacity="0.4"
            />
            <path
              d="M0 45C150 28 300 22 450 28C530 32 580 40 600 45H0Z"
              fill="#064E3B"
            />
          </svg>

          {/* Quick service feature icons row */}
          <div
            style={{ fontSize: '7px', lineHeight: '9px' }}
            className="absolute -top-3 left-0 right-0 px-4 flex items-center justify-center gap-1 sm:gap-2 font-bold text-[#065F46]"
          >
            {[
              {
                label: 'LED SIGNAGE',
                svg: (
                  <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                    <circle cx="12" cy="12" r="5" />
                  </svg>
                ),
              },
              {
                label: 'DIGITAL PRINT',
                svg: (
                  <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <path d="M6 14h12v8H6z" />
                  </svg>
                ),
              },
              {
                label: 'ACP SIGNAGE',
                svg: (
                  <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
                  </svg>
                ),
              },
              {
                label: 'ACRYLIC SIGNAGE',
                svg: (
                  <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                ),
              },
              {
                label: 'VEHICLE BRANDING',
                svg: (
                  <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                ),
              },
              {
                label: 'PVC PRINT',
                svg: (
                  <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                ),
              },
              {
                label: 'CUSTOM PRINT',
                svg: (
                  <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ),
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-white border border-[#10B981]/30 shadow-2xs whitespace-nowrap"
              >
                {s.svg}
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Contact Strip */}
        <div
          style={{ fontSize: '8px', lineHeight: '11px' }}
          className="bg-[#064E3B] text-white px-4 py-1.5 flex items-center justify-between font-medium"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-white/90">
              <span>🌐</span>
              <span>{website}</span>
            </span>
            <span className="flex items-center gap-1 text-white/90">
              <span>✉</span>
              <span>{email}</span>
            </span>
            <span className="flex items-center gap-1 text-white/90">
              <span>☎</span>
              <span>{phone}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-white/90">
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '6px' }} className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-white/20">f</span>
              <span style={{ fontSize: '6px' }} className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-white/20">x</span>
              <span style={{ fontSize: '6px' }} className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-white/20">in</span>
            </div>
            <span>/printflowbd</span>
          </div>
        </div>
      </div>
    </div>
  )
}
