import {
  Truck,
  Layers,
  Sparkles,
  Zap,
  Wrench,
  Droplet,
  FileText,
  Boxes,
  ShieldCheck,
  Package,
  CircleDollarSign,
  Briefcase,
} from 'lucide-react'
import type { SupplierCategory, SupplierPaymentTerms } from '@/types/crm.types'

export interface MarketHubOption {
  id: string
  nameEn: string
  nameBn: string
  area: string
  district: string
  division: string
  descriptionEn: string
  descriptionBn: string
}

export const BANGLADESH_MARKET_HUBS: MarketHubOption[] = [
  {
    id: 'nayabazar',
    nameEn: 'Nayabazar Paper & Board Market',
    nameBn: 'নয়াবাজার পেপার ও বোর্ড মার্কেট',
    area: 'Nayabazar, Kotwali',
    district: 'Dhaka',
    division: 'Dhaka',
    descriptionEn: 'Major hub for art paper, duplex board, offset sheets & chemical consumables.',
    descriptionBn: 'আর্ট পেপার, ডুপ্লেক্স বোর্ড, অফসেট শিট ও প্রেস কেমিক্যালের পাইকারি মোকাম।',
  },
  {
    id: 'chawkbazar',
    nameEn: 'Chawkbazar Acrylic & Plastic Hub',
    nameBn: 'চকবাজার এক্রিলিক ও প্লাস্টিক মোকাম',
    area: 'Chawkbazar, Lalbagh',
    district: 'Dhaka',
    division: 'Dhaka',
    descriptionEn: 'Cast acrylic, clear sheets, mirror acrylic, foam boards & sign hardware.',
    descriptionBn: 'কাস্ট এক্রিলিক, ক্লিয়ার শিট, মিরর এক্রিলিক, ফোম বোর্ড ও সাইনেজ হার্ডওয়্যারের প্রধান হাব।',
  },
  {
    id: 'fakirapool',
    nameEn: 'Fakirapool & Arambagh Press Zone',
    nameBn: 'ফকিরাপুল ও আরামবাগ প্রেস পাড়া',
    area: 'Fakirapool, Motijheel',
    district: 'Dhaka',
    division: 'Dhaka',
    descriptionEn: 'Commercial printing presses, plate making, inks & die cutting specialists.',
    descriptionBn: 'কমার্শিয়াল প্রিন্টিং, প্লেট মেকিং, কালি ও ডাই কাটিং সাপ্লায়ারদের মূল কেন্দ্র।',
  },
  {
    id: 'islampur',
    nameEn: 'Islampur Textile & Banner Media',
    nameBn: 'ইসলামপুর টেক্সটাইল ও ব্যানার মিডিয়া',
    area: 'Islampur, Sadarghat',
    district: 'Dhaka',
    division: 'Dhaka',
    descriptionEn: 'Flag fabric, satin cloth, roll banner substrates & packaging fabrics.',
    descriptionBn: 'পতাকা কাপড়, সাটিন ফেব্রিক, ড্রপ ব্যানার ও প্যাকেজিং টেক্সটাইল মোকাম।',
  },
  {
    id: 'dholaikhal',
    nameEn: 'Dholaikhal Metal & MS Frame Hub',
    nameBn: 'ধোলাইখাল মেটাল ও এমএস ফ্রেম জোন',
    area: 'Dholaikhal, Sutrapur',
    district: 'Dhaka',
    division: 'Dhaka',
    descriptionEn: 'MS angle, pipes, SS sheets, neon transformer parts & billboard structures.',
    descriptionBn: 'এমএস এঙ্গেল, পাইপ, এসএস শিট ও বিলবোর্ড মেটাল ফ্রেমের নির্ভরযোগ্য মার্কেট।',
  },
  {
    id: 'tejgaon',
    nameEn: 'Tejgaon Light Industrial Depot',
    nameBn: 'তেজগাঁও লাইট ইন্ডাস্ট্রিয়াল ডিপো',
    area: 'Tejgaon I/A',
    district: 'Dhaka',
    division: 'Dhaka',
    descriptionEn: 'Large media roll importers, solvent ink distributors & CNC machinery spare parts.',
    descriptionBn: 'রোল মিডিয়া আমদানিকারক, সলভেন্ট কালি ডিস্ট্রিবিউটর ও সিএনসি যন্ত্রাংশ ডিপো।',
  },
  {
    id: 'bogura',
    nameEn: 'Bogura Paper & Packaging Mills Hub',
    nameBn: 'বগুড়া পেপার ও প্যাকেজিং মিলস হাব',
    area: 'Chak Jitu, Bogura',
    district: 'Bogura',
    division: 'Rajshahi',
    descriptionEn: 'Craft paper, packaging fluting, corrugated liner & raw box stock.',
    descriptionBn: 'ক্রাফট পেপার, কার্টন ফ্লাউটিং ও প্যাকেজিং বোর্ডের উত্তরবঙ্গের মোকাম।',
  },
  {
    id: 'chittagong',
    nameEn: 'Chittagong Port & Asadganj Import Depot',
    nameBn: 'চট্টগ্রাম পোর্ট ও আসাদগঞ্জ ইমপোর্ট ডিপো',
    area: 'Asadganj / Khatunganj',
    district: 'Chittagong',
    division: 'Chittagong',
    descriptionEn: 'Direct sea container vinyl, ACP sheets, banner rolls & industrial solvents.',
    descriptionBn: 'সরাসরি বন্দর ইমপোর্ট ভিনাইল, এসিপি প্যানেল ও ইন্ডাস্ট্রিয়াল সলভেন্ট হাব।',
  },
  {
    id: 'other',
    nameEn: 'Local Market / Direct Supplier',
    nameBn: 'লোকাল মার্কেট / সরাসরি সাপ্লায়ার',
    area: 'Local Area',
    district: 'Dhaka',
    division: 'Dhaka',
    descriptionEn: 'Local retail vendor, manufacturer representative or direct partner.',
    descriptionBn: 'স্থানীয় খুচরা ভেন্ডর বা সরাসরি সরবরাহকারী পার্টনার।',
  },
]

export interface CategoryMeta {
  id: string
  labelEn: string
  labelBn: string
  color: string
  badgeClass: string
  icon: any
}

export const SUPPLIER_CATEGORY_META: Record<string, CategoryMeta> = {
  media: {
    id: 'media',
    labelEn: 'Media (Flex / Vinyl / Banner)',
    labelBn: 'মিডিয়া (ফ্লেক্স / ভিনাইল / ব্যানার)',
    color: '#0284c7',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    icon: Layers,
  },
  acrylic: {
    id: 'acrylic',
    labelEn: 'Acrylic & Sheets (Cast / Mirror)',
    labelBn: 'এক্রিলিক ও শিট (কাস্ট / মিরর)',
    color: '#8b5cf6',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    icon: Sparkles,
  },
  led: {
    id: 'led',
    labelEn: 'LED & Power Supplies',
    labelBn: 'এলইডি ও পাওয়ার সাপ্লাই',
    color: '#f59e0b',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    icon: Zap,
  },
  hardware: {
    id: 'hardware',
    labelEn: 'Hardware & Display Stands',
    labelBn: 'হার্ডওয়্যার ও ডিসপ্লে স্ট্যান্ড',
    color: '#64748b',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: Wrench,
  },
  ink: {
    id: 'ink',
    labelEn: 'Ink & Solvents (UV / Eco)',
    labelBn: 'কালি ও সলভেন্ট (ইউভি / ইকো)',
    color: '#ec4899',
    badgeClass: 'bg-pink-50 text-pink-800 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800',
    icon: Droplet,
  },
  paper: {
    id: 'paper',
    labelEn: 'Paper & Board (Art / Offset)',
    labelBn: 'কাগজ ও বোর্ড (আর্ট / অফসেট)',
    color: '#10b981',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    icon: FileText,
  },
  pvc: {
    id: 'pvc',
    labelEn: 'PVC & Foam Board (Celuka)',
    labelBn: 'পিভিসি ও ফোম বোর্ড (সেলুকা)',
    color: '#06b6d4',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    icon: Boxes,
  },
  aluminum: {
    id: 'aluminum',
    labelEn: 'Aluminum & ACP Panels',
    labelBn: 'অ্যালুমিনিয়াম ও এসিপি প্যানেল',
    color: '#6366f1',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    icon: ShieldCheck,
  },
  other: {
    id: 'other',
    labelEn: 'General & Other Consumables',
    labelBn: 'সাধারণ ও অন্যান্য সামগ্রী',
    color: '#6b7280',
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    icon: Package,
  },
}

export interface PaymentTermOption {
  id: SupplierPaymentTerms | string
  labelEn: string
  labelBn: string
  days: number
  descriptionEn: string
  descriptionBn: string
}

export const SUPPLIER_PAYMENT_TERMS: PaymentTermOption[] = [
  {
    id: 'cash',
    labelEn: 'Cash on Delivery',
    labelBn: 'ক্যাশ অন ডেলিভারি',
    days: 0,
    descriptionEn: 'Immediate spot payment upon inspection.',
    descriptionBn: 'মাল বুঝে নেওয়ার সাথে সাথে নগদ পরিশোধ।',
  },
  {
    id: 'credit_7',
    labelEn: 'Credit 7 Days',
    labelBn: 'সাপ্তাহিক বাকি (৭ দিন)',
    days: 7,
    descriptionEn: 'Weekly payment settlement cycle.',
    descriptionBn: 'প্রতি সপ্তাহের নির্দিষ্ট দিনে বিল পরিশোধ।',
  },
  {
    id: 'credit_15',
    labelEn: 'Credit 15 Days',
    labelBn: 'পাক্ষিক বাকি (১৫ দিন)',
    days: 15,
    descriptionEn: 'Fortnightly clearance terms.',
    descriptionBn: '১৫ দিনের মধ্যে ব্যাংক বা চেকে বিল পরিশোধ।',
  },
  {
    id: 'credit_30',
    labelEn: 'Credit 30 Days',
    labelBn: 'মাসিক বাকি (৩০ দিন)',
    days: 30,
    descriptionEn: 'Monthly billing with 30-day post-dated cheque.',
    descriptionBn: 'মাসিক অ্যাকাউন্ট স্টেটমেন্ট ও ৩০ দিনের চেকের সুবিধা।',
  },
  {
    id: 'credit_60',
    labelEn: 'Credit 60 Days',
    labelBn: 'দ্বিমাসিক বাকি (৬০ দিন)',
    days: 60,
    descriptionEn: 'Extended credit for bulk mill imports.',
    descriptionBn: 'আমদানি কার্গো ও বাল্ক মিল সাপ্লাইয়ের জন্য ৬০ দিনের ক্রেডিট।',
  },
  {
    id: 'advance',
    labelEn: 'Advance Payment Required',
    labelBn: 'শতভাগ অগ্রিম পেমেন্ট',
    days: 0,
    descriptionEn: 'Full payment before delivery dispatch.',
    descriptionBn: 'মালামাল পাঠানোর পূর্বে সম্পূর্ণ পরিশোধ।',
  },
]

export const BANGLADESH_BANKS = [
  'Dutch-Bangla Bank PLC (DBBL)',
  'Islami Bank Bangladesh PLC (IBBL)',
  'BRAC Bank PLC',
  'The City Bank PLC',
  'Eastern Bank PLC (EBL)',
  'United Commercial Bank PLC (UCB)',
  'Prime Bank PLC',
  'Mutual Trust Bank PLC (MTB)',
  'Dhaka Bank PLC',
  'Bank Asia PLC',
  'Sonali Bank PLC',
  'Pubali Bank PLC',
  'Standard Chartered Bangladesh',
  'HSBC Bangladesh',
  'bKash Merchant Account',
  'Nagad Merchant Account',
  'Cash Counter Petty Cash',
]
