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
      {/* 1. TOP HEADER ARTWORK: Exact match to Reference Image 2 */}
      <div className="absolute top-0 left-0 right-0 h-[13.5%] w-full flex items-start justify-between overflow-hidden">
        {/* Full-width Precision Swoosh SVG */}
        <svg
          viewBox="0 0 1024 213"
          fill="none"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Light Sage Shadow / Swoosh Layer */}
          <path
            d="M 495 0 L 595 160 Q 615 200 655 213 L 1024 213 L 1024 0 Z"
            fill="#E7EDEA"
          />

          {/* Main Deep Forest Green Banner (#0A2E26) */}
          <path
            d="M 545 0 L 642 165 Q 662 202 705 213 L 1024 213 L 1024 0 Z"
            fill="#0A2E26"
          />
        </svg>

        {/* Top Left: Logo & Corporate Identity */}
        <div className="relative z-10 pt-2.5 pl-4 sm:pt-3 sm:pl-5 max-w-[50%] h-full flex flex-col justify-between pb-2">
          {/* Brand Mark & Tagline */}
          <div>
            <div className="flex items-center gap-2.5">
              {companyLogoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={companyLogoUrl}
                  alt={companyName}
                  className="h-9 w-auto max-w-[130px] object-contain shrink-0 rounded-xs"
                />
              ) : (
                /* Stylized "P" Ribbon Logo Mark matching Reference */
                <svg
                  viewBox="0 0 36 36"
                  fill="none"
                  className="h-8 w-8 shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Stem of P in deep dark forest green */}
                  <path
                    d="M6 5v26h6V20h8c6.6 0 10.5-3.5 10.5-7.5S26.6 5 20 5H6z"
                    fill="#0A2E26"
                  />
                  {/* Golden top swoop flourish */}
                  <path
                    d="M6 11c5-3 12-4 17-2 3.5 1.5 5.5 3.5 6.5 5.5-2.5-3.5-7-6-13-5.5C11.5 9.5 8 10 6 11z"
                    fill="#F59E0B"
                  />
                  {/* Emerald middle swoop flourish */}
                  <path
                    d="M6 18c6-3.5 13-4 18-2 3 1.5 5 3.5 5.5 5-2-3-6-5-12-4.5C12 17 8 17.5 6 18z"
                    fill="#10B981"
                  />
                </svg>
              )}

              <div>
                {/* Company Name: Dynamic */}
                <div className="flex items-baseline leading-none">
                  {companyName === 'PrintFlow' ? (
                    <>
                      <span
                        style={{ fontSize: '26px', lineHeight: '28px' }}
                        className="font-black text-[#0A2E26] tracking-tight"
                      >
                        Print
                      </span>
                      <span
                        style={{ fontSize: '26px', lineHeight: '28px' }}
                        className="font-black text-[#16A34A] tracking-tight"
                      >
                        Flow
                      </span>
                    </>
                  ) : (
                    <span
                      style={{ fontSize: '24px', lineHeight: '26px' }}
                      className="font-black text-[#0A2E26] tracking-tight block truncate max-w-[240px]"
                      title={companyName}
                    >
                      {companyName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tagline: SIGNAGE | PRINT | GROW TOGETHER */}
            <span
              style={{ fontSize: '8.5px', lineHeight: '11px', letterSpacing: '0.14em' }}
              className="font-bold text-[#4B5563] uppercase block mt-1 tracking-wider whitespace-nowrap"
            >
              {tagline || 'SIGNAGE \u00A0|\u00A0 PRINT \u00A0|\u00A0 GROW TOGETHER'}
            </span>
          </div>

          {/* Contact Details with Standalone Vector Icons (No Circles) */}
          <div
            style={{ fontSize: '9px', lineHeight: '13px' }}
            className="mt-1.5 space-y-1 text-[#1F2937] font-medium"
          >
            {/* Line 1: Location Pin & Address */}
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[#0A2E26] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>
              <span className="truncate max-w-[270px]">{address}</span>
            </div>

            {/* Line 2: Phone & Email with generous spacing */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#0A2E26] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z" />
                </svg>
                <span className="whitespace-nowrap">{phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#0A2E26] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <span className="truncate max-w-[150px]">{email}</span>
              </div>
            </div>

            {/* Line 3: Website Globe */}
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[#0A2E26] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1a2 2 0 0 0 2 2v1.93zm6.9-2.54A8 8 0 0 0 19 12c0-.68-.1-1.34-.28-1.96l-4.72 4.72a2 2 0 0 0-.58 1.41v1.17c1.37-.43 2.59-1.25 3.48-2.34z" />
              </svg>
              <span className="truncate max-w-[270px]">{website}</span>
            </div>
          </div>
        </div>

        {/* Top Right: Header Title Block in Dark Green Banner */}
        <div className="relative z-10 w-[46%] h-full flex flex-col items-end text-right justify-center pr-6 sm:pr-10 pointer-events-none">
          {/* Document Title: Single line, right-aligned, dynamic scale */}
          <h1
            style={{
              fontSize:
                documentTypeTitleEn.length <= 9
                  ? '30px'
                  : documentTypeTitleEn.length <= 13
                  ? '25px'
                  : '21px',
              lineHeight: '1.1',
              letterSpacing: '0.04em',
            }}
            className="font-black uppercase text-white tracking-wide whitespace-nowrap drop-shadow-xs text-right"
          >
            {documentTypeTitleEn}
          </h1>

          {/* Bengali Subheading with Gold Accent Bar: Right-aligned */}
          <div className="flex items-center justify-end gap-2.5 mt-1">
            <div className="w-8 sm:w-10 h-[2.5px] bg-[#B88C2F] rounded-full shrink-0" />
            <span
              style={{ fontSize: '18px', lineHeight: '22px' }}
              className="font-bold text-white tracking-normal whitespace-nowrap text-right"
            >
              {documentTypeTitleBn}
            </span>
          </div>

          {/* Partner Subtitle: Right-aligned, Single Line */}
          <p
            style={{ fontSize: '8.5px', lineHeight: '11px', letterSpacing: '0.18em' }}
            className="font-bold text-white/90 uppercase tracking-widest mt-2 whitespace-nowrap text-right"
          >
            {tagline || 'YOUR PRINTING & SIGNAGE PARTNER'}
          </p>
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
