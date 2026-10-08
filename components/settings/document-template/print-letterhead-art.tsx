'use client'

import React from 'react'

interface PrintLetterheadArtProps {
  documentTypeTitleEn?: string
  documentTypeTitleBn?: string
  companyName?: string
  tagline?: string
  companyLogoUrl?: string
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
  companyName = 'Vision Sign',
  tagline,
  companyLogoUrl,
  phone = '+880 1712 345678',
  email = 'info@printflow.bd',
  website = 'www.printflow.bd',
  address = 'House 12, Road 5, Sector 7, Uttara, Dhaka-1230',
  mode = 'full_page',
  className = '',
}: PrintLetterheadArtProps) {
  // Social media handle derived from company name
  const socialHandle = companyName
    ? companyName.toLowerCase().replace(/[^a-z0-9]/g, '')
    : 'printflowbd'

  return (
    <div
      data-letterhead-artwork="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. TOP HEADER ARTWORK (Compact height ~13.5% to never overlap safe area) */}
      <div className="absolute top-0 left-0 right-0 h-[13.5%] w-full flex items-start justify-between">
        {/* Top Left: Logo & Corporate Identity */}
        <div className="pt-2 pl-3 sm:pt-2.5 sm:pl-4 z-10 max-w-[48%]">
          <div className="flex items-center gap-2">
            {companyLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={companyLogoUrl}
                alt={companyName}
                className="h-8 w-8 object-contain shrink-0 rounded-xs"
              />
            ) : (
              /* Ribbon Swirl Logo Mark */
              <svg
                viewBox="0 0 36 36"
                fill="none"
                className="h-7 w-7 shrink-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Upper emerald ribbon loop */}
                <path
                  d="M6 18C6 11.373 11.373 6 18 6C24.627 6 29 10 29 15C29 20 23 23 18 20C14 17.6 12 14 15 10"
                  stroke="#10B981"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                />
                {/* Lower dark green ribbon loop */}
                <path
                  d="M30 18C30 24.627 24.627 30 18 30C11.373 30 7 26 7 21C7 16 13 13 18 16C22 18.4 24 22 21 26"
                  stroke="#064E3B"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                />
                {/* Center golden highlight node */}
                <circle cx="18" cy="18" r="3" fill="#EAB308" />
              </svg>
            )}

            <div>
              {/* Company Name: Dynamic & Exactly 24px */}
              <div className="flex items-baseline leading-none">
                {companyName === 'PrintFlow' ? (
                  <>
                    <span
                      style={{ fontSize: '24px', lineHeight: '26px' }}
                      className="font-black text-[#111827] tracking-tight"
                    >
                      Print
                    </span>
                    <span
                      style={{ fontSize: '24px', lineHeight: '26px' }}
                      className="font-black text-[#10B981] tracking-tight"
                    >
                      Flow
                    </span>
                  </>
                ) : (
                  <span
                    style={{ fontSize: '24px', lineHeight: '26px' }}
                    className="font-black text-[#111827] tracking-tight block truncate max-w-[220px]"
                    title={companyName}
                  >
                    {companyName}
                  </span>
                )}
              </div>
              {/* Tagline: Exactly 8px */}
              <span
                style={{ fontSize: '8px', lineHeight: '10px', letterSpacing: '0.1em' }}
                className="font-bold text-[#4B5563] uppercase block mt-0.5 tracking-wider whitespace-nowrap"
              >
                SIGNAGE &nbsp;|&nbsp; PRINT &nbsp;|&nbsp; GROW TOGETHER
              </span>
            </div>
          </div>

          {/* Contact Details with Circular Micro-Icons: Exactly 8px */}
          <div
            style={{ fontSize: '8px', lineHeight: '11px' }}
            className="mt-1 space-y-0.5 text-[#374151] font-medium"
          >
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-[#111827] text-white shrink-0">
                <svg className="w-1.5 h-1.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
              </span>
              <span className="truncate max-w-[210px]">{address}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-[#111827] text-white shrink-0">
                  <svg className="w-1.5 h-1.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z" />
                  </svg>
                </span>
                <span>{phone}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-[#111827] text-white shrink-0">
                  <svg className="w-1.5 h-1.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                </span>
                <span>{email}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-[#111827] text-white shrink-0">
                <svg className="w-1.5 h-1.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1a2 2 0 0 0 2 2v1.93zm6.9-2.54A8 8 0 0 0 19 12c0-.68-.1-1.34-.28-1.96l-4.72 4.72a2 2 0 0 0-.58 1.41v1.17c1.37-.43 2.59-1.25 3.48-2.34z" />
                </svg>
              </span>
              <span>{website}</span>
            </div>
          </div>
        </div>

        {/* Top Right: Layered Organic Blade & Swoosh Header Banner */}
        <div className="relative w-[52%] h-full">
          <svg
            viewBox="0 0 450 140"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outermost pale mint wing/blade (far left) */}
            <path
              d="M 40 0 C 15 20, 0 35, 0 52 C 0 75, 45 110, 110 140 L 450 140 L 450 0 Z"
              fill="#D1FAE5"
              fillOpacity="0.75"
            />

            {/* Middle vivid emerald wing/blade */}
            <path
              d="M 90 0 C 65 25, 45 45, 45 62 C 45 88, 85 118, 145 140 L 450 140 L 450 0 Z"
              fill="#10B981"
            />

            {/* Main deep forest green banner body */}
            <path
              d="M 140 0 C 110 30, 85 55, 85 72 C 85 102, 130 126, 210 132 C 290 138, 380 135, 450 126 L 450 0 Z"
              fill="#064E3B"
            />

            {/* Bottom bright emerald contour stripe */}
            <path
              d="M 85 72 C 85 104, 130 128, 210 134 C 290 140, 380 137, 450 128"
              stroke="#10B981"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Top origami geometric facets / accents */}
            <polygon
              points="170,0 215,30 265,0"
              fill="#047857"
              fillOpacity="0.5"
            />
            <polygon
              points="280,0 330,38 410,0"
              fill="#059669"
              fillOpacity="0.4"
            />
            <polygon
              points="360,0 405,28 450,0"
              fill="#10B981"
              fillOpacity="0.3"
            />
          </svg>

          {/* Title Overlay in Dark Green Banner: RIGHT ALIGNED, SINGLE LINE */}
          <div className="absolute top-1.5 sm:top-2.5 right-0 w-full flex flex-col items-end text-right pr-3.5 sm:pr-6 z-10 text-white pointer-events-none">
            {/* Document Title: Single line, right-aligned, dynamic scale for long titles */}
            <h1
              style={{
                fontSize:
                  documentTypeTitleEn.length <= 11
                    ? '24px'
                    : documentTypeTitleEn.length <= 14
                    ? '21px'
                    : '20px',
                lineHeight: '26px',
                letterSpacing: '0.02em',
              }}
              className="font-black uppercase text-white drop-shadow-xs whitespace-nowrap text-right"
            >
              {documentTypeTitleEn}
            </h1>

            {/* Bengali Subheading with Gold Accent Bar: Right-aligned */}
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <div className="w-7 sm:w-9 h-[2px] bg-[#EAB308] rounded-full shrink-0" />
              <span
                style={{ fontSize: '12px', lineHeight: '14px' }}
                className="font-bold text-white tracking-normal text-right whitespace-nowrap"
              >
                {documentTypeTitleBn}
              </span>
            </div>

            {/* Partner Subtitle: Right-aligned, Single Line */}
            <p
              style={{ fontSize: '8px', lineHeight: '10px', letterSpacing: '0.12em' }}
              className="font-bold text-white/90 uppercase tracking-widest mt-0.5 text-right whitespace-nowrap"
            >
              {tagline || 'YOUR PRINTING & SIGNAGE PARTNER'}
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
              fontSize="12"
              fontWeight="900"
              textAnchor="middle"
              fill="#064E3B"
            >
              {companyName}
            </text>
          </svg>
        </div>
      )}

      {/* 3. BOTTOM FOOTER ARTWORK & SERVICE BADGES (Compact height ~8% to leave room for content) */}
      <div className="absolute bottom-0 left-0 right-0 h-[8%] w-full flex flex-col justify-end">
        {/* 7 Core Service Badges Row */}
        <div className="relative w-full bg-white/95 border-t border-[#E5E7EB] py-0.5 px-2 z-10">
          <div className="grid grid-cols-7 divide-x divide-[#E5E7EB] text-center">
            {/* 1. LED SIGNAGE */}
            <div className="px-0.5 flex flex-col items-center justify-center">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M8 16v4M16 16v4M5 20h14" />
                <text x="12" y="12.5" fontSize="5.5" fontWeight="900" textAnchor="middle" fill="#111827" stroke="none">LED</text>
              </svg>
              <span
                style={{ fontSize: '8px', lineHeight: '10px' }}
                className="font-bold text-[#374151] uppercase tracking-tight mt-0.5 leading-none"
              >
                LED SIGNAGE
              </span>
            </div>

            {/* 2. DIGITAL PRINT */}
            <div className="px-0.5 flex flex-col items-center justify-center">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.5">
                <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="7" rx="1" />
                <circle cx="18" cy="12" r="1" fill="#111827" />
              </svg>
              <span
                style={{ fontSize: '8px', lineHeight: '10px' }}
                className="font-bold text-[#374151] uppercase tracking-tight mt-0.5 leading-none"
              >
                DIGITAL PRINT
              </span>
            </div>

            {/* 3. ACP SIGNAGE */}
            <div className="px-0.5 flex flex-col items-center justify-center">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 12l10 5 10-5" />
                <path d="M2 17l10 5 10-5" />
              </svg>
              <span
                style={{ fontSize: '8px', lineHeight: '10px' }}
                className="font-bold text-[#374151] uppercase tracking-tight mt-0.5 leading-none"
              >
                ACP SIGNAGE
              </span>
            </div>

            {/* 4. ACRYLIC SIGNAGE */}
            <div className="px-0.5 flex flex-col items-center justify-center">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.5">
                <rect x="5" y="3" width="14" height="18" rx="2" />
                <circle cx="8" cy="6" r="1" fill="#111827" />
                <circle cx="16" cy="6" r="1" fill="#111827" />
                <circle cx="8" cy="18" r="1" fill="#111827" />
                <circle cx="16" cy="18" r="1" fill="#111827" />
              </svg>
              <span
                style={{ fontSize: '8px', lineHeight: '10px' }}
                className="font-bold text-[#374151] uppercase tracking-tight mt-0.5 leading-none"
              >
                ACRYLIC SIGNAGE
              </span>
            </div>

            {/* 5. VEHICLE BRANDING */}
            <div className="px-0.5 flex flex-col items-center justify-center">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.5">
                <path d="M3 15V6a2 2 0 0 1 2-2h10l4 5v6H3z" />
                <circle cx="7.5" cy="16.5" r="2.5" />
                <circle cx="16.5" cy="16.5" r="2.5" />
                <path d="M15 9h4" />
              </svg>
              <span
                style={{ fontSize: '8px', lineHeight: '10px' }}
                className="font-bold text-[#374151] uppercase tracking-tight mt-0.5 leading-none"
              >
                VEHICLE BRANDING
              </span>
            </div>

            {/* 6. PVC PRINT */}
            <div className="px-0.5 flex flex-col items-center justify-center">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.5">
                <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                <path d="M16 3v4a2 2 0 0 0 2 2h4" />
                <path d="M8 13h8M8 17h5" />
              </svg>
              <span
                style={{ fontSize: '8px', lineHeight: '10px' }}
                className="font-bold text-[#374151] uppercase tracking-tight mt-0.5 leading-none"
              >
                PVC PRINT
              </span>
            </div>

            {/* 7. CUSTOM PRINT */}
            <div className="px-0.5 flex flex-col items-center justify-center">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.5">
                <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a2 2 0 0 0 1.51 1.63L6 11.23V20a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8.77l1.63-.44a2 2 0 0 0 1.51-1.63l.58-3.47a2 2 0 0 0-1.34-2.23z" />
              </svg>
              <span
                style={{ fontSize: '8px', lineHeight: '10px' }}
                className="font-bold text-[#374151] uppercase tracking-tight mt-0.5 leading-none"
              >
                CUSTOM PRINT
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Dark Green Bar + Right Side Organic Wave */}
        <div className="relative w-full">
          {/* Bottom Right Golden & Emerald Swoop */}
          <div className="absolute bottom-0 right-0 w-[28%] h-10 pointer-events-none overflow-hidden z-20">
            <svg
              viewBox="0 0 200 60"
              fill="none"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              {/* Amber / Gold upward wave */}
              <path
                d="M 0 60 C 50 60 80 40 120 18 C 150 2 180 0 200 12 L 200 60 Z"
                fill="#F59E0B"
              />
              {/* Emerald green wave */}
              <path
                d="M 20 60 C 70 60 100 42 135 22 C 165 6 185 8 200 20 L 200 60 Z"
                fill="#10B981"
              />
              {/* Dark forest green base */}
              <path
                d="M 50 60 C 95 60 125 46 155 30 C 180 18 190 20 200 28 L 200 60 Z"
                fill="#064E3B"
              />
            </svg>
          </div>

          {/* Contact Strip: Dynamic from Business Information */}
          <div
            style={{ fontSize: '8px', lineHeight: '10px' }}
            className="bg-[#064E3B] text-white px-3 py-1 flex items-center justify-between font-medium z-10 relative"
          >
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-white/90">
                <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1a2 2 0 0 0 2 2v1.93zm6.9-2.54A8 8 0 0 0 19 12c0-.68-.1-1.34-.28-1.96l-4.72 4.72a2 2 0 0 0-.58 1.41v1.17c1.37-.43 2.59-1.25 3.48-2.34z" />
                </svg>
                <span>{website}</span>
              </span>
              <span className="text-white/40">|</span>
              <span className="flex items-center gap-1 text-white/90">
                <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <span>{email}</span>
              </span>
              <span className="text-white/40">|</span>
              <span className="flex items-center gap-1 text-white/90">
                <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z" />
                </svg>
                <span>{phone}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-white/90 pr-10">
              <div className="flex items-center gap-0.5">
                {/* Facebook icon */}
                <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-white text-[#064E3B]">
                  <svg className="w-1.5 h-1.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95C18.05 21.45 22 17.19 22 12z" />
                  </svg>
                </span>
                {/* Instagram icon */}
                <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-white text-[#064E3B]">
                  <svg className="w-1.5 h-1.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </span>
                {/* YouTube icon */}
                <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-white text-[#064E3B]">
                  <svg className="w-1.5 h-1.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </span>
                {/* LinkedIn icon */}
                <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-white text-[#064E3B]">
                  <svg className="w-1.5 h-1.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </span>
              </div>
              <span className="tracking-wide">/{socialHandle}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
