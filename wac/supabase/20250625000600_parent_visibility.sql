-- WalahaStore — Visibilité PARENT des modules Devoirs et Carnet
-- A appliquer APRES 20250625000500_correspondence_module.sql.
--
-- Un parent lié (school_student_parents.parent_user_id, statut active) peut LIRE
-- les devoirs, le suivi et le carnet de SON enfant — jamais les autres élèves.
-- Aucune écriture côté parent (sauf accusé de lecture du carnet).

CREATE OR REPLACE FUNCTION public.is_parent_of_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_student_parents spp
    WHERE spp.student_id = p_student_id
      AND spp.parent_user_id = auth.uid()
      AND spp.status = 'active'
  );
$$;

-- Devoirs : le parent voit les devoirs de la classe de son enfant
-- (ou les devoirs « toutes classes » de son école).
DROP POLICY IF EXISTS school_homework_select_parent ON public.school_homework;
CREATE POLICY school_homework_select_parent
  ON public.school_homework FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.school_student_parents spp
      JOIN public.school_students st ON st.id = spp.student_id
      WHERE spp.parent_user_id = auth.uid()
        AND spp.status = 'active'
        AND st.school_id = school_homework.school_id
        AND (school_homework.class_id IS NULL OR school_homework.class_id = st.class_id)
    )
  );

-- Suivi : le parent voit uniquement la ligne de suivi de son enfant.
DROP POLICY IF EXISTS homework_submissions_select_parent ON public.school_homework_submissions;
CREATE POLICY homework_submissions_select_parent
  ON public.school_homework_submissions FOR SELECT
  TO authenticated
  USING (public.is_parent_of_student(student_id));

-- Carnet : le parent voit les entrées de son enfant.
DROP POLICY IF EXISTS school_correspondence_select_parent ON public.school_correspondence;
CREATE POLICY school_correspondence_select_parent
  ON public.school_correspondence FOR SELECT
  TO authenticated
  USING (public.is_parent_of_student(student_id));

-- Accusé de lecture : le parent peut marquer une entrée de SON enfant comme lue.
DROP POLICY IF EXISTS school_correspondence_ack_parent ON public.school_correspondence;
CREATE POLICY school_correspondence_ack_parent
  ON public.school_correspondence FOR UPDATE
  TO authenticated
  USING (public.is_parent_of_student(student_id))
  WITH CHECK (public.is_parent_of_student(student_id));

COMMENT ON FUNCTION public.is_parent_of_student(UUID) IS
  'Vrai si l''utilisateur courant est un parent actif lié à l''élève donné.';
