-- Walaha Admin Center — Demandes d'écoles (workflow de validation officielle)
-- A appliquer APRES 20250624000100_wac_actions.sql.
--
-- Principe : tout utilisateur authentifié peut SOUMETTRE une demande d'école.
-- Seule la Walaha Team (school_validator / walaha_admin / super_admin) peut la
-- traiter. La validation officielle (création canonical_schools + code ECO-)
-- passe par l'Edge Function `wac-validate-school` (service role), jamais le client.

CREATE TABLE IF NOT EXISTS public.school_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school_type TEXT NOT NULL DEFAULT 'primaire',
  country TEXT DEFAULT 'Mali',
  city TEXT,
  commune TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  promoter_name TEXT,
  director_name TEXT,
  requested_by UUID REFERENCES auth.users (id),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
    status IN ('pending_review', 'verified', 'active', 'rejected', 'suspended', 'archived')
  ),
  internal_note TEXT,
  reviewed_by UUID REFERENCES auth.users (id),
  reviewed_at TIMESTAMPTZ,
  canonical_school_id UUID REFERENCES public.canonical_schools (id),
  public_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS school_requests_set_updated_at ON public.school_requests;
CREATE TRIGGER school_requests_set_updated_at
  BEFORE UPDATE ON public.school_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_school_requests_status
  ON public.school_requests (status, created_at DESC);

ALTER TABLE public.school_requests ENABLE ROW LEVEL SECURITY;

-- Le demandeur voit sa propre demande ; un admin WAC voit toutes les demandes.
DROP POLICY IF EXISTS school_requests_select ON public.school_requests;
CREATE POLICY school_requests_select
  ON public.school_requests FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid() OR public.is_walaha_admin());

-- Tout utilisateur authentifié peut soumettre une demande (à son nom).
DROP POLICY IF EXISTS school_requests_insert_self ON public.school_requests;
CREATE POLICY school_requests_insert_self
  ON public.school_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- La modération (vérifier / rejeter / noter) est réservée aux validateurs.
-- La validation officielle (status = active + canonical_school_id) reste faite
-- par l'Edge Function en service role, mais on autorise ici les transitions
-- de modération non destructives côté client.
DROP POLICY IF EXISTS school_requests_update_admin ON public.school_requests;
CREATE POLICY school_requests_update_admin
  ON public.school_requests FOR UPDATE
  TO authenticated
  USING (public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'school_validator']))
  WITH CHECK (public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'school_validator']));

COMMENT ON TABLE public.school_requests IS
  'Demandes d''écoles soumises par les utilisateurs et traitées par la Walaha Team. La validation crée une canonical_schools officielle via Edge Function.';
