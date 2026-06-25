-- Walaha Admin Center — policies d'écriture pour rendre les actions WAC opérationnelles
-- A appliquer APRES 20250623000100_wac_admin.sql.
-- Toutes les écritures restent gated par is_walaha_admin() et tracées dans admin_audit_logs.

-- ---------------------------------------------------------------------------
-- Fonction utilitaire : vérifie qu'un admin actif possède l'un des rôles donnés
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_admin_role(roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_members
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role = ANY (roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- Audit logs : un admin actif peut INSÉRER une entrée à son nom
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS admin_audit_logs_insert_admin ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_insert_admin
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_walaha_admin()
    AND admin_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Utilisateurs : archivage / restauration (deleted_at) par la modération
-- Pas de suppression physique : on bascule seulement deleted_at.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS users_update_walaha_admin ON public.users;
CREATE POLICY users_update_walaha_admin
  ON public.users FOR UPDATE
  TO authenticated
  USING (public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'moderator']))
  WITH CHECK (public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'moderator']));

-- ---------------------------------------------------------------------------
-- Jeux éducatifs : publication / archivage / rejet par le content manager
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS educational_activities_manage_content ON public.educational_activities;
CREATE POLICY educational_activities_manage_content
  ON public.educational_activities FOR UPDATE
  TO authenticated
  USING (public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'content_manager']))
  WITH CHECK (public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'content_manager']));

-- ---------------------------------------------------------------------------
-- Rappels (déjà créés en 20250623000100, listés ici pour mémoire) :
--   moderation_reports      : UPDATE autorisé via is_walaha_admin()
--   school_digital_payments : ALL autorisé pour super_admin / walaha_admin / finance
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION public.has_admin_role(TEXT[]) IS
  'Vrai si l''utilisateur courant est un admin WAC actif portant l''un des rôles fournis.';
