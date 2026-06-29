-- Walaha Admin Center — Demandes répétiteur (profil Parent → validation WAC)
-- A appliquer APRES les migrations WAC existantes (admin_members, is_walaha_admin).
-- Copie alignée sur WalahaTracker/supabase/migrations/20250629000001_tutor_requests.sql

CREATE TABLE IF NOT EXISTS public.tutor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.canonical_parents (id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users (id),
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  linked_teacher_id UUID REFERENCES public.canonical_teachers (id),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
    status IN ('pending_review', 'on_hold', 'approved', 'rejected')
  ),
  internal_note TEXT,
  reviewed_by UUID REFERENCES auth.users (id),
  reviewed_at TIMESTAMPTZ,
  canonical_tutor_id UUID REFERENCES public.canonical_tutors (id),
  public_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS tutor_requests_set_updated_at ON public.tutor_requests;
CREATE TRIGGER tutor_requests_set_updated_at
  BEFORE UPDATE ON public.tutor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tutor_requests_status
  ON public.tutor_requests (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_requests_parent_open
  ON public.tutor_requests (parent_id)
  WHERE status IN ('pending_review', 'on_hold');

ALTER TABLE public.tutor_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tutor_requests_select ON public.tutor_requests;
CREATE POLICY tutor_requests_select
  ON public.tutor_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR public.is_walaha_admin()
  );

DROP POLICY IF EXISTS tutor_requests_insert_self ON public.tutor_requests;
CREATE POLICY tutor_requests_insert_self
  ON public.tutor_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.canonical_parents cp
      WHERE cp.id = parent_id
        AND cp.user_id = auth.uid()
        AND cp.deleted_at IS NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.canonical_parents cp2
      WHERE cp2.id = parent_id
        AND cp2.linked_canonical_tutor_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS tutor_requests_update_admin ON public.tutor_requests;
CREATE POLICY tutor_requests_update_admin
  ON public.tutor_requests FOR UPDATE
  TO authenticated
  USING (
    public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'moderator'])
  )
  WITH CHECK (
    public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'moderator'])
  );

COMMENT ON TABLE public.tutor_requests IS
  'Demandes de profil répétiteur (REP-) soumises par un parent. La validation crée canonical_tutors via Edge Function wac-validate-tutor.';
