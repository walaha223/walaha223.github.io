-- WalahaStore — Module « Carnet de correspondance enrichi » (code 'correspondence')
-- A appliquer APRES 20250625000400_homework_submissions.sql.
--
-- Observations / remarques positives / incidents légers par élève, avec
-- accusé de lecture parent (rempli côté app mobile plus tard). Écriture
-- verrouillée par le paywall WalahaStore 'correspondence'.

CREATE TABLE IF NOT EXISTS public.school_correspondence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.canonical_schools (id),
  student_id UUID NOT NULL REFERENCES public.school_students (id),
  entry_type TEXT NOT NULL DEFAULT 'observation' CHECK (
    entry_type IN ('observation', 'positive', 'incident')
  ),
  subject TEXT,
  content TEXT NOT NULL,
  period TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  parent_ack_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS school_correspondence_set_updated_at ON public.school_correspondence;
CREATE TRIGGER school_correspondence_set_updated_at
  BEFORE UPDATE ON public.school_correspondence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_school_correspondence_school
  ON public.school_correspondence (school_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_correspondence_student
  ON public.school_correspondence (student_id);

ALTER TABLE public.school_correspondence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_correspondence_select ON public.school_correspondence;
CREATE POLICY school_correspondence_select
  ON public.school_correspondence FOR SELECT
  TO authenticated
  USING (public.is_active_school_staff(school_id));

DROP POLICY IF EXISTS school_correspondence_insert ON public.school_correspondence;
CREATE POLICY school_correspondence_insert
  ON public.school_correspondence FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_active_school_staff(school_id, ARRAY['school_owner', 'school_director', 'teacher', 'class_master'])
    AND public.school_has_active_module(school_id, 'correspondence')
  );

DROP POLICY IF EXISTS school_correspondence_update ON public.school_correspondence;
CREATE POLICY school_correspondence_update
  ON public.school_correspondence FOR UPDATE
  TO authenticated
  USING (public.is_active_school_staff(school_id, ARRAY['school_owner', 'school_director', 'teacher', 'class_master']))
  WITH CHECK (public.is_active_school_staff(school_id, ARRAY['school_owner', 'school_director', 'teacher', 'class_master']));

COMMENT ON TABLE public.school_correspondence IS
  'Carnet de correspondance enrichi (module WalahaStore ''correspondence'') : observations, remarques, incidents par élève.';
