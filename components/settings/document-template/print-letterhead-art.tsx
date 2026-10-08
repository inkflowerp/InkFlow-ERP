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
        <div className="pt-5 pl-6 sm:pt-6 sm:pl-7 z-10 max-w-[55%]">
          <div className="flex items-center gap-2">
            {/* PrintFlow Stylized Logo Mark */}
            <div className="flex items-center gap-1.5">
              <svg
                viewBox="0 0 32 32"
                fill="none"
                className="h-8 w-8 shrink-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 16C6 10.477 10.477 6 16 6C21.523 6 26 10.477 26 16C26 21.523 21.523 26 16 26"
                  stroke="#10B981"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="16" cy="16" r="4" fill="#047857" />
                <path
                  d="M8 22L16 14L24 22"
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-[#064E3B] leading-none block">
                  {companyName}
                </span>
                <span
                  style={{ fontSize: '10px', lineHeight: '12px' }}
                  className="font-bold tracking-widest text-[#059669] uppercase block mt-0.5"
                >
                  SIGNAGE • PRINT • GROW TOGETHER
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div
            style={{ fontSize: '9px', lineHeight: '12px' }}
            className="mt-2 space-y-0.5 text-[#374151] font-medium leading-tight"
          >
            <div className="flex items-center gap-1">
              <span className="text-[#059669]">⌂</span>
              <span>{address}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="text-[#059669]">☎</span>
                <span>{phone}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[#059669]">✉</span>
                <span>{email}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#059669]">🌐</span>
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
          <div className="absolute top-3 sm:top-4 right-4 sm:right-6 text-right z-10 text-white">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight uppercase drop-shadow-xs">
              {documentTypeTitleEn}
            </h1>
            <p className="text-sm sm:text-base font-bold text-white/85 leading-none bangla-text mt-0.5">
              {documentTypeTitleBn}
            </p>
            <p
              style={{ fontSize: '8.5px', lineHeight: '11px' }}
              className="font-semibold text-white/90 uppercase tracking-widest mt-1"
            >
              YOUR PRINTING & SIGNAGE PARTNER
            </p>
          </div>
        </div>
      </div>

      {/* 2. OPTIONAL WATERMARK FOR FULL PAGE MODE */}
      {mode === 'full_page' && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
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
            style={{ fontSize: '8px', lineHeight: '10px' }}
            className="absolute -top-3.5 left-0 right-0 px-4 flex items-center justify-center gap-1.5 sm:gap-2.5 font-bold text-[#065F46]"
          >
            {[
              { label: 'LED SIGNAGE', icon: '💡' },
              { label: 'DIGITAL PRINT', icon: '🖨️' },
              { label: 'ACP SIGNAGE', icon: '🏢' },
              { label: 'ACRYLIC SIGNAGE', icon: '✨' },
              { label: 'VEHICLE BRANDING', icon: '🚐' },
              { label: 'PVC PRINT', icon: '📜' },
              { label: 'CUSTOM PRINT', icon: '🏷️' },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white border border-success-border shadow-2xs whitespace-nowrap"
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Contact Strip */}
        <div
          style={{ fontSize: '9px', lineHeight: '12px' }}
          className="bg-[#064E3B] text-white px-5 py-1.5 flex items-center justify-between font-medium"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-white/85">
              <span>🌐</span>
              <span>{website}</span>
            </span>
            <span className="flex items-center gap-1 text-white/85">
              <span>✉</span>
              <span>{email}</span>
            </span>
            <span className="flex items-center gap-1 text-white/85">
              <span>☎</span>
              <span>{phone}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-white/90">
            <span>/printflowbd</span>
            <span style={{ fontSize: '7px' }}>ⓕ ⓘ ⓨ ⓛ</span>
          </div>
        </div>
      </div>
    </div>
  )
}
