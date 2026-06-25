-- WalahaStore — Module « Devoirs et exercices numériques » (premier module réel)
-- A appliquer APRES 20250625000200_store_custom_requests.sql.
--
-- Le module est PAYANT : l'accès en écriture est verrouillé tant que l'école
-- n'a pas un abonnement actif au module de code 'homework' (paywall serveur).

-- ---------------------------------------------------------------------------
-- Helper : l'école a-t-elle un module WalahaStore actif ?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.school_has_active_module(p_school_id UUID, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_subscriptions sub
    JOIN public.store_modules m ON m.id = sub.module_id
    WHERE sub.school_id = p_school_id
      AND m.code = p_code
      AND sub.status = 'active'
  );
$$;

-- Helper : l'utilisateur courant fait-il partie du personnel actif de l'école ?
CREATE OR REPLACE FUNCTION public.is_active_school_staff(p_school_id UUID, p_roles TEXT[] DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_staff st
    WHERE st.school_id = p_school_id
      AND st.user_id = auth.uid()
      AND st.status = 'active'
      AND (p_roles IS NULL OR st.role = ANY (p_roles))
  );
$$;

-- ---------------------------------------------------------------------------
-- Devoirs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.canonical_schools (id),
  class_id UUID REFERENCES public.school_classes (id),
  subject TEXT,
  title TEXT NOT NULL,
  instructions TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS school_homework_set_updated_at ON public.school_homework;
CREATE TRIGGER school_homework_set_updated_at
  BEFORE UPDATE ON public.school_homework
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_school_homework_school
  ON public.school_homework (school_id, status, due_date DESC);

ALTER TABLE public.school_homework ENABLE ROW LEVEL SECURITY;

-- Lecture : tout le personnel actif de l'école.
DROP POLICY IF EXISTS school_homework_select ON public.school_homework;
CREATE POLICY school_homework_select
  ON public.school_homework FOR SELECT
  TO authenticated
  USING (public.is_active_school_staff(school_id));

-- Création : personnel pédagogique + module 'homework' ACTIF (paywall).
DROP POLICY IF EXISTS school_homework_insert ON public.school_homework;
CREATE POLICY school_homework_insert
  ON public.school_homework FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_active_school_staff(school_id, ARRAY['school_owner', 'school_director', 'teacher', 'class_master'])
    AND public.school_has_active_module(school_id, 'homework')
  );

-- Modification / archivage : même périmètre.
DROP POLICY IF EXISTS school_homework_update ON public.school_homework;
CREATE POLICY school_homework_update
  ON public.school_homework FOR UPDATE
  TO authenticated
  USING (public.is_active_school_staff(school_id, ARRAY['school_owner', 'school_director', 'teacher', 'class_master']))
  WITH CHECK (public.is_active_school_staff(school_id, ARRAY['school_owner', 'school_director', 'teacher', 'class_master']));

COMMENT ON TABLE public.school_homework IS
  'Devoirs/exercices propres à une école (module WalahaStore payant ''homework'').';
COMMENT ON FUNCTION public.school_has_active_module(UUID, TEXT) IS
  'Vrai si l''école a un abonnement WalahaStore actif au module de code donné.';
