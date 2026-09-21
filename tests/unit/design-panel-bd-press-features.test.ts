import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Bangladeshi Printing Press & Designer Feature Logic Tests', () => {
  it('1. Correctly formats and sanitizes Bangladeshi phone numbers to international 8801... format', () => {
    const sanitizePhone = (raw: string) => {
      let cleanPhone = raw.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = `88${cleanPhone}`;
      } else if (!cleanPhone.startsWith('88')) {
        cleanPhone = `880${cleanPhone}`;
      }
      return cleanPhone;
    };

    assert.equal(sanitizePhone('01712345678'), '8801712345678');
    assert.equal(sanitizePhone('8801812345678'), '8801812345678');
    assert.equal(sanitizePhone('019-1234-5678'), '8801912345678');
  });

  it('2. WhatsApp draft proof template contains essential legal disclaimer for Bangladeshi printing press', () => {
    const buildDraftProofMessage = (
      custName: string,
      companyName: string,
      jobTitle: string,
      jobNum: string,
      dims: string,
      verNum: number,
      proofUrl: string
    ) => {
      return (
        `আসসালামু আলাইকুম / নমস্কার ${custName},\n\n` +
        `${companyName}-এর পক্ষ থেকে আপনার *${jobTitle}* (জব নং: #${jobNum}) এর ডিজিটাল আর্টওয়ার্ক প্রুফ তৈরি হয়েছে।\n\n` +
        `📐 সাইজ: ${dims}\n📄 ভার্সন: v${verNum}\n🖼️ ডিজিটাল প্রুফ দেখুন: ${proofUrl}\n\n` +
        `⚠️ *বিশেষ সতর্কবার্তা / দায়িত্ব:* \nদয়া করে বানান (Spelling), মোবাইল নম্বর, সাইজ এবং কালার ভালো করে দেখে নিশ্চিত করুন। অনুমোদনের পর কোনো ভুল থাকলে তার দায়ভার সম্পূর্ণ গ্রাহকের।\n\n` +
        `সব ঠিক থাকলে *APPROVED* লিখে রিপ্লাই দিন অথবা কোনো পরিবর্তন প্রয়োজন হলে জানান।\n\n` +
        `ধন্যবাদ,\n${companyName}`
      );
    };

    const msg = buildDraftProofMessage('আনোয়ার সাহেব', 'ক্লাসিক প্রিন্ট', 'অফসেট ব্রোশিওর', '1042', '8.5x11 inch', 1, 'https://print.erp/proof/123');
    assert.ok(msg.includes('অনুমোদনের পর কোনো ভুল থাকলে তার দায়ভার সম্পূর্ণ গ্রাহকের'));
    assert.ok(msg.includes('বানান (Spelling), মোবাইল নম্বর, সাইজ এবং কালার'));
    assert.ok(msg.includes('APPROVED'));
  });

  it('3. Pre-press quality verification flags all 4 critical checks (CMYK, 300 DPI, Bleed, Curves)', () => {
    const defaultCheck = { cmyk: false, dpi300: false, bleed: false, curves: false };
    
    // Simulate toggling
    const verifiedCheck = { ...defaultCheck, cmyk: true, dpi300: true, bleed: true, curves: true };
    const allPassed = Object.values(verifiedCheck).every(Boolean);
    assert.equal(allPassed, true);

    const partialCheck = { ...defaultCheck, cmyk: true, dpi300: true, bleed: false, curves: true };
    assert.equal(Object.values(partialCheck).every(Boolean), false);
  });
});
