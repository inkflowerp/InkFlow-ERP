-- Migration 119: Fast Text & Trigram Search Optimization (pg_trgm)
-- Enables pg_trgm extension in extensions schema and builds GIN trigram indexes
-- for fuzzy and substring search on customers, products, invoices, quotations, and sales orders.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Customers Search (Name, Mobile, Company)
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON public.customers USING gin (name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_mobile_trgm ON public.customers USING gin (mobile extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_company_name_trgm ON public.customers USING gin (company_name extensions.gin_trgm_ops);

-- Products Search (Name, SKU)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm ON public.products USING gin (sku extensions.gin_trgm_ops);

-- Invoices Search (Invoice Number, Customer Name)
CREATE INDEX IF NOT EXISTS idx_invoices_number_trgm ON public.invoices USING gin (invoice_number extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_name_trgm ON public.invoices USING gin (customer_name extensions.gin_trgm_ops);

-- Quotations Search (Quotation Number, Customer Name)
CREATE INDEX IF NOT EXISTS idx_quotations_number_trgm ON public.quotations USING gin (quotation_number extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_name_trgm ON public.quotations USING gin (customer_name extensions.gin_trgm_ops);

-- Sales Orders Search (Order Number, Customer Name)
CREATE INDEX IF NOT EXISTS idx_sales_orders_number_trgm ON public.sales_orders USING gin (order_number extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_name_trgm ON public.sales_orders USING gin (customer_name extensions.gin_trgm_ops);
