-- WalahaStore — demandes de modules personnalisés (sur devis)
-- A appliquer APRES 20250625000100_walaha_store.sql.
--
-- Une école peut demander un module sur mesure (section 4.3 / 16). La Walaha
-- Team traite la demande (devis, étude) depuis le WAC.

CREATE TABLE IF NOT EXISTS public.store_custom_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.canonical_schools (id),
  requested_by UUID REFERENCES auth.users (id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_review', 'quoted', 'closed', 'rejected')
  ),
  internal_note TEXT,
  handled_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS store_custom_requests_set_updated_at ON public.store_custom_requests;
CREATE TRIGGER store_custom_requests_set_updated_at
  BEFORE UPDATE ON public.store_custom_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_store_custom_requests_status
  ON public.store_custom_requests (status, created_at DESC);

ALTER TABLE public.store_custom_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_custom_requests_select ON public.store_custom_requests;
CREATE POLICY store_custom_requests_select
  ON public.store_custom_requests FOR SELECT
  TO authenticated
  USING (
    public.is_walaha_admin()
    OR EXISTS (
      SELECT 1 FROM public.school_staff st
      WHERE st.school_id = store_custom_requests.school_id
        AND st.user_id = auth.uid()
        AND st.status = 'active'
    )
  );

DROP POLICY IF EXISTS store_custom_requests_insert ON public.store_custom_requests;
CREATE POLICY store_custom_requests_insert
  ON public.store_custom_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND status = 'open'
    AND EXISTS (
      SELECT 1 FROM public.school_staff st
      WHERE st.school_id = store_custom_requests.school_id
        AND st.user_id = auth.uid()
        AND st.status = 'active'
        AND st.role IN ('school_owner', 'school_director')
    )
  );

DROP POLICY IF EXISTS store_custom_requests_manage_admin ON public.store_custom_requests;
CREATE POLICY store_custom_requests_manage_admin
  ON public.store_custom_requests FOR UPDATE
  TO authenticated
  USING (public.is_walaha_admin())
  WITH CHECK (public.is_walaha_admin());

COMMENT ON TABLE public.store_custom_requests IS
  'Demandes de modules WalahaStore personnalisés (sur devis), traitées par la Walaha Team.';
