-- WAC — Configuration centralisée des prix.
-- A appliquer APRES 20250625000900_school_billing_accounting.sql.

CREATE TABLE IF NOT EXISTS public.app_pricing_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('school_subscription', 'store', 'play', 'service')),
  pricing_type TEXT NOT NULL DEFAULT 'annual' CHECK (
    pricing_type IN ('annual', 'monthly', 'per_student', 'per_school', 'one_time', 'included', 'quote')
  ),
  price_amount INT,
  price_currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'draft')),
  description TEXT,
  updated_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS app_pricing_configs_set_updated_at ON public.app_pricing_configs;
CREATE TRIGGER app_pricing_configs_set_updated_at
  BEFORE UPDATE ON public.app_pricing_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.app_pricing_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_pricing_configs_select_admin ON public.app_pricing_configs;
CREATE POLICY app_pricing_configs_select_admin
  ON public.app_pricing_configs FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

DROP POLICY IF EXISTS app_pricing_configs_manage_admin ON public.app_pricing_configs;
CREATE POLICY app_pricing_configs_manage_admin
  ON public.app_pricing_configs FOR ALL
  TO authenticated
  USING (public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'finance']))
  WITH CHECK (public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'finance']));

ALTER TABLE public.educational_activities
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'included' CHECK (
    pricing_type IN ('included', 'one_time', 'monthly', 'annual', 'per_student', 'per_school', 'quote')
  ),
  ADD COLUMN IF NOT EXISTS price_amount INT,
  ADD COLUMN IF NOT EXISTS price_currency TEXT NOT NULL DEFAULT 'XOF';

INSERT INTO public.app_pricing_configs (
  config_key,
  label,
  category,
  pricing_type,
  price_amount,
  price_currency,
  status,
  description
)
VALUES (
  'school_subscription_default',
  'Souscription annuelle par école',
  'school_subscription',
  'per_student',
  5000,
  'XOF',
  'active',
  'Prix par élève utilisé pour préparer la facturation annuelle des écoles.'
)
ON CONFLICT (config_key) DO NOTHING;

COMMENT ON TABLE public.app_pricing_configs IS
  'Configuration centrale des prix WAC : souscription école, services, modules et règles globales.';
