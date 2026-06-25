-- WalahaStore — Module Devoirs : suivi par élève (rendus, notes, corrections)
-- A appliquer APRES 20250625000300_homework_module.sql.
--
-- Une ligne par (devoir, élève). Statut : assigned (à faire) / submitted (rendu)
-- / corrected (corrigé). Écriture verrouillée par le paywall 'homework'.

CREATE TABLE IF NOT EXISTS public.school_homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES public.school_homework (id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.school_students (id),
  school_id UUID NOT NULL REFERENCES public.canonical_schools (id),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'submitted', 'corrected')),
  grade NUMERIC(5, 2),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (homework_id, student_id)
);

DROP TRIGGER IF EXISTS school_homework_submissions_set_updated_at ON public.school_homework_submissions;
CREATE TRIGGER school_homework_submissions_set_updated_at
  BEFORE UPDATE ON public.school_homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_homework_submissions_homework
  ON public.school_homework_submissions (homework_id);

ALTER TABLE public.school_homework_submissions ENABLE ROW LEVEL SECURITY;

-- Lecture : personnel actif de l'école.
DROP POLICY IF EXISTS homework_submissions_select ON public.school_homework_submissions;
CREATE POLICY homework_submissions_select
  ON public.school_homework_submissions FOR SELECT
  TO authenticated
  USING (public.is_active_school_staff(school_id));

-- Création : personnel pédagogique + module actif (paywall).
DROP POLICY IF EXISTS homework_submissions_insert ON public.school_homework_submissions;
CREATE POLICY homework_submissions_insert
  ON public.school_homework_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_school_staff(school_id, ARRAY['school_owner', 'school_director', 'teacher', 'class_master'])
    AND public.school_has_active_module(school_id, 'homework')
  );

-- Mise à jour : personnel pédagogique de l'école.
DROP POLICY IF EXISTS homework_submissions_update ON public.school_homework_submissions;
CREATE POLICY homework_submissions_update
  ON public.school_homework_submissions FOR UPDATE
  TO authenticated
  USING (public.is_active_school_staff(school_id, ARRAY['school_owner', 'school_director', 'teacher', 'class_master']))
  WITH CHECK (public.is_active_school_staff(school_id, ARRAY['school_owner', 'school_director', 'teacher', 'class_master']));

COMMENT ON TABLE public.school_homework_submissions IS
  'Suivi par élève d''un devoir (à faire / rendu / corrigé, note, feedback).';
