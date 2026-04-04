ALTER TABLE public.service_templates 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;