'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Package,
  Plus,
  Search,
  Tag,
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Layers,
  Calculator,
  ShieldAlert,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { ProductRecord, ProductType, UnitOfMeasure } from '@/types/product.types'
import { ProductService } from '@/services/product.service'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export default function ProductsCatalogPage() {
  const { company } = useTenant()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [products, setProducts] = useDataStore<ProductRecord[]>(STORAGE_KEYS.PRODUCTS, [])
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  const productCheck = checkCanCreate('max_products')

  const handleOpenAddProduct = () => {
    if (!productCheck.allowed) {
      openLimitExceededModal('max_products')
      return
    }
    setIsAddOpen(true)
  }

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [newPrice, setNewPrice] = useState<number>(0)
  const [priceReason, setPriceReason] = useState<string>('')
  const [notification, setNotification] = useState<string | null>(null)

  // New Product Form
  const [newProduct, setNewProduct] = useState({
    name: '',
    name_bn: '',
    sku: '',
    category: 'flex_banner',
    product_type: 'print_service' as ProductType,
    unit: 'sft' as UnitOfMeasure,
    material_spec: '',
    description: '',
    base_cost: 0,
    selling_price: 0,
    min_price: 0,
    tax_rate: 7.5,
  })

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!productCheck.allowed) {
      openLimitExceededModal('max_products')
      return
    }
    const created: ProductRecord = {
      id: `prd-${Date.now()}`,
      company_id: 'c-01',
      name: newProduct.name,
      name_bn: newProduct.name_bn || null,
      sku: newProduct.sku.toUpperCase() || `SKU-${Date.now().toString().slice(-4)}`,
      category: newProduct.category,
      product_type: newProduct.product_type,
      unit: newProduct.unit,
      material_spec: newProduct.material_spec || null,
      description: newProduct.description || null,
      base_cost: Number(newProduct.base_cost),
      selling_price: Number(newProduct.selling_price),
      min_price: Number(newProduct.min_price),
      tax_rate: Number(newProduct.tax_rate),
      pricing_formula: {
        model: 'dimensional_area',
        min_area_sft: 4,
        material_rate: Number(newProduct.base_cost) * 0.6,
        print_rate: Number(newProduct.base_cost) * 0.4,
        default_margin_percent: 45.0,
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, created)
    refreshUsage()
    setIsAddOpen(false)
    setNewProduct({
      name: '',
      name_bn: '',
      sku: '',
      category: 'flex_banner',
      product_type: 'print_service',
      unit: 'sft',
      material_spec: '',
      description: '',
      base_cost: 0,
      selling_price: 0,
      min_price: 0,
      tax_rate: 7.5,
    })
    showNotification(`Product '${created.name}' added to catalog.`)
  }

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    await ProductService.updatePrice(
      editingProduct.id,
      newPrice,
      priceReason || 'Manual catalog price adjustment',
      'Current User'
    )

    PrintERPDataStore.updateItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, editingProduct.id, {
      selling_price: newPrice,
      updated_at: new Date().toISOString(),
    })

    showNotification(
      `Updated ${editingProduct.name} selling price to ৳ ${newPrice}. Price change logged in history.`
    )
    setEditingProduct(null)
    setPriceReason('')
  }

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.name_bn && p.name_bn.includes(search)) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.material_spec && p.material_spec.toLowerCase().includes(search.toLowerCase()))

    const matchType = selectedType === 'all' || p.product_type === selectedType

    return matchSearch && matchType
  })

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Product & Service Catalog"
        titleBn="পণ্য ও সেবা তালিকা"
        descriptionEn="Standard printing rates, fabrication shop fees, installation tariffs, and floor cost benchmarks."
        descriptionBn="প্রিন্টিং রেট, ফেব্রিকেশন ফি, ইনস্টলেশন চার্জ এবং উৎপাদন খরচের তালিকা।"
        icon={Package}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2.5">
            <Link href={`/${slug}/pricing`}>
              <Button variant="outline" size="sm" className="text-xs bangla-text">
                <Calculator className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                {tBilingual('Open Live Estimator', 'লাইভ ক্যালকুলেটর')}
              </Button>
            </Link>

            <Button size="sm" onClick={handleOpenAddProduct} className="bg-blue-600 hover:bg-blue-700 text-xs bangla-text">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('New Product / Service', 'নতুন পণ্য / সেবা')}
            </Button>
          </div>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Search & Type Filter */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by product name, বাংলা নাম, SKU, material spec..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="w-full md:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full md:w-auto h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Product Types (সকল সেবা)</option>
              <option value="print_service">Print Service (প্রিন্ট সেবা)</option>
              <option value="fabrication_service">Fabrication Service (তৈরি/ফ্যাব্রিকেশন)</option>
              <option value="installation_service">Installation Service (ইনস্টলেশন)</option>
              <option value="finished_product">Finished Product (রেডি প্রোডাক্ট)</option>
              <option value="material">Raw Material (কাঁচামাল)</option>
              <option value="custom_job">Custom Job (বিশেষ কাজ)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Catalog Items ({filtered.length})</CardTitle>
            <span className="text-xs text-slate-400">Standard rates and production floor benchmarks</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Item & SKU</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Base Cost</th>
                <th className="py-3 px-4">Selling Rate</th>
                <th className="py-3 px-4">Min Price</th>
                <th className="py-3 px-4">Gross Margin</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => {
                const marginPercent =
                  item.selling_price > 0
                    ? Math.round(((item.selling_price - item.base_cost) / item.selling_price) * 100)
                    : 0

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    {/* Item & SKU */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/${slug}/products/${item.id}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-blue-600 flex items-center gap-1.5 group"
                      >
                        <span>{item.name}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                      </Link>
                      {item.name_bn && (
                        <div className="text-xs text-slate-500">{item.name_bn}</div>
                      )}
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {item.sku} • {item.material_spec || 'Standard Spec'}
                      </div>
                    </td>

                    {/* Product Type */}
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900">
                        {item.product_type.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Unit */}
                    <td className="py-3.5 px-4">
                      <span className="uppercase font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {item.unit}
                      </span>
                    </td>

                    {/* Base Cost */}
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500">
                      <CurrencyDisplay amount={item.base_cost} />
                    </td>

                    {/* Selling Rate */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <CurrencyDisplay amount={item.selling_price} />
                      <span className="text-xs font-normal text-slate-400">/{item.unit}</span>
                    </td>

                    {/* Min Price Floor */}
                    <td className="py-3.5 px-4 text-xs text-amber-700 dark:text-amber-400 font-medium">
                      <CurrencyDisplay amount={item.min_price} />
                    </td>

                    {/* Gross Margin */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                        {marginPercent}%
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProduct(item)
                            setNewPrice(item.selling_price)
                          }}
                          className="h-7 text-xs px-2"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Price
                        </Button>
                        <Link
                          href={`/${slug}/products/${item.id}`}
                          className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Formula
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL: ADD PRODUCT */}
      <ModalDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Add Catalog Item / Service Tariff"
        description="Configure printing media, fabrication item, or installation crew rates."
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pName" required>Product / Service Name (English)</Label>
              <Input
                id="pName"
                placeholder="e.g. Star Flex Banner 320gsm"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pNameBn">আইটেমের নাম (বাংলা)</Label>
              <Input
                id="pNameBn"
                placeholder="যেমন: স্টার ফ্লেক্স ব্যানার"
                value={newProduct.name_bn}
                onChange={(e) => setNewProduct({ ...newProduct, name_bn: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pSku" required>SKU / Item Code</Label>
              <Input
                id="pSku"
                placeholder="PRD-FLX-008"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pType" required>Product Type</Label>
              <select
                id="pType"
                value={newProduct.product_type}
                onChange={(e) => setNewProduct({ ...newProduct, product_type: e.target.value as ProductType })}
                className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="print_service">Print Service</option>
                <option value="fabrication_service">Fabrication Service</option>
                <option value="installation_service">Installation Service</option>
                <option value="finished_product">Finished Product</option>
                <option value="material">Raw Material</option>
                <option value="custom_job">Custom Job</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pUnit" required>Billing Unit</Label>
              <select
                id="pUnit"
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value as UnitOfMeasure })}
                className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="sft">Square Feet (sft)</option>
                <option value="pcs">Piece (pcs)</option>
                <option value="ft">Running Feet (ft)</option>
                <option value="inch">Inch</option>
                <option value="sheet">Sheet</option>
                <option value="roll">Roll</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="ltr">Liter (ltr)</option>
                <option value="hr">Labor Hour (hr)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pSpec">Material Specification</Label>
            <Input
              id="pSpec"
              placeholder="e.g. 320g Gloss Frontlit, 5mm Cast Acrylic, IP68 LEDs"
              value={newProduct.material_spec}
              onChange={(e) => setNewProduct({ ...newProduct, material_spec: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pCost" required>Base Cost (৳ BDT)</Label>
              <Input
                id="pCost"
                type="number"
                step="0.1"
                placeholder="14.50"
                value={newProduct.base_cost || ''}
                onChange={(e) => setNewProduct({ ...newProduct, base_cost: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pPrice" required>Selling Price (৳ BDT)</Label>
              <Input
                id="pPrice"
                type="number"
                step="0.1"
                placeholder="25.00"
                value={newProduct.selling_price || ''}
                onChange={(e) => setNewProduct({ ...newProduct, selling_price: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pMin" required>Min Floor Price (৳ BDT)</Label>
              <Input
                id="pMin"
                type="number"
                step="0.1"
                placeholder="18.00"
                value={newProduct.min_price || ''}
                onChange={(e) => setNewProduct({ ...newProduct, min_price: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Save Product
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: ADJUST PRICE WITH AUDIT REASON */}
      <ModalDialog
        open={Boolean(editingProduct)}
        onOpenChange={(open) => !open && setEditingProduct(null)}
        title="Adjust Catalog Selling Price"
        description={`Update official rate for ${editingProduct?.name} (${editingProduct?.sku}).`}
      >
        <form onSubmit={handleUpdatePrice} className="space-y-4 pt-1">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs">
            <div className="flex justify-between">
              <span>Current Base Cost:</span>
              <strong>৳ {editingProduct?.base_cost}</strong>
            </div>
            <div className="flex justify-between mt-1">
              <span>Current Selling Price:</span>
              <strong>৳ {editingProduct?.selling_price} / {editingProduct?.unit}</strong>
            </div>
            <div className="flex justify-between mt-1">
              <span>Minimum Floor Price:</span>
              <strong className="text-amber-600">৳ {editingProduct?.min_price}</strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPr" required>New Selling Price (৳ BDT / {editingProduct?.unit})</Label>
            <Input
              id="newPr"
              type="number"
              step="0.1"
              value={newPrice}
              onChange={(e) => setNewPrice(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="chgReason" required>Reason for Price Adjustment (Audit Log)</Label>
            <Input
              id="chgReason"
              placeholder="e.g. Raw solvent ink import duty increase from vendor"
              value={priceReason}
              onChange={(e) => setPriceReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Save & Log Audit History
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
