-- WalahaStore — Historique des prix et cycles d'abonnement.
-- A appliquer APRES 20250625000700_store_resubmit.sql.

CREATE TABLE IF NOT EXISTS public.store_subscription_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.store_subscriptions (id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.store_modules (id),
  school_id UUID REFERENCES public.canonical_schools (id),
  change_type TEXT NOT NULL DEFAULT 'updated' CHECK (
    change_type IN ('created', 'approved', 'activated', 'price_changed', 'renewed', 'status_changed', 'updated')
  ),
  old_price_agreed INT,
  new_price_agreed INT,
  price_currency TEXT NOT NULL DEFAULT 'XOF',
  old_status TEXT,
  new_status TEXT,
  old_expires_at TIMESTAMPTZ,
  new_expires_at TIMESTAMPTZ,
  changed_by UUID REFERENCES auth.users (id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_price_history_subscription
  ON public.store_subscription_price_history (subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_price_history_school
  ON public.store_subscription_price_history (school_id, created_at DESC);

ALTER TABLE public.store_subscription_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_price_history_select ON public.store_subscription_price_history;
CREATE POLICY store_price_history_select
  ON public.store_subscription_price_history FOR SELECT
  TO authenticated
  USING (
    public.is_walaha_admin()
    OR EXISTS (
      SELECT 1 FROM public.school_staff st
      WHERE st.school_id = store_subscription_price_history.school_id
        AND st.user_id = auth.uid()
        AND st.status = 'active'
    )
  );

DROP POLICY IF EXISTS store_price_history_admin_insert ON public.store_subscription_price_history;
CREATE POLICY store_price_history_admin_insert
  ON public.store_subscription_price_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_walaha_admin());

CREATE OR REPLACE FUNCTION public.store_subscription_price_history_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_change_type TEXT;
  v_currency TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.price_agreed IS NULL AND NEW.status = 'requested' THEN
      RETURN NEW;
    END IF;

    v_change_type := CASE
      WHEN NEW.status = 'approved' THEN 'approved'
      WHEN NEW.status = 'active' THEN 'activated'
      ELSE 'created'
    END;

    SELECT COALESCE(m.price_currency, 'XOF')
      INTO v_currency
    FROM public.store_modules m
    WHERE m.id = NEW.module_id;

    INSERT INTO public.store_subscription_price_history (
      subscription_id,
      module_id,
      school_id,
      change_type,
      old_price_agreed,
      new_price_agreed,
      price_currency,
      old_status,
      new_status,
      old_expires_at,
      new_expires_at,
      changed_by,
      note
    )
    VALUES (
      NEW.id,
      NEW.module_id,
      NEW.school_id,
      v_change_type,
      NULL,
      NEW.price_agreed,
      COALESCE(v_currency, 'XOF'),
      NULL,
      NEW.status,
      NULL,
      NEW.expires_at,
      COALESCE(NEW.decided_by, auth.uid()),
      COALESCE(NEW.decision_note, NEW.note)
    );

    RETURN NEW;
  END IF;

  IF NEW.price_agreed IS NOT DISTINCT FROM OLD.price_agreed
    AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at THEN
    RETURN NEW;
  END IF;

  v_change_type := CASE
    WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active' THEN 'activated'
    WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN 'approved'
    WHEN NEW.price_agreed IS DISTINCT FROM OLD.price_agreed THEN 'price_changed'
    WHEN NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN 'renewed'
    WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_changed'
    ELSE 'updated'
  END;

  SELECT COALESCE(m.price_currency, 'XOF')
    INTO v_currency
  FROM public.store_modules m
  WHERE m.id = NEW.module_id;

  INSERT INTO public.store_subscription_price_history (
    subscription_id,
    module_id,
    school_id,
    change_type,
    old_price_agreed,
    new_price_agreed,
    price_currency,
    old_status,
    new_status,
    old_expires_at,
    new_expires_at,
    changed_by,
    note
  )
  VALUES (
    NEW.id,
    NEW.module_id,
    NEW.school_id,
    v_change_type,
    OLD.price_agreed,
    NEW.price_agreed,
    COALESCE(v_currency, 'XOF'),
    OLD.status,
    NEW.status,
    OLD.expires_at,
    NEW.expires_at,
    COALESCE(NEW.decided_by, auth.uid()),
    COALESCE(NEW.decision_note, NEW.note)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_subscriptions_price_history ON public.store_subscriptions;
CREATE TRIGGER store_subscriptions_price_history
  AFTER INSERT OR UPDATE OF price_agreed, status, expires_at ON public.store_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.store_subscription_price_history_trigger();

COMMENT ON TABLE public.store_subscription_price_history IS
  'Historique métier WalahaStore : prix convenus, validations, activations, renouvellements et échéances par abonnement école.';
