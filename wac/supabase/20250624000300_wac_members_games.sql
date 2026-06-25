-- Walaha Admin Center — gestion des membres + création de jeux
-- A appliquer APRES 20250624000200_school_requests.sql.

-- ---------------------------------------------------------------------------
-- admin_members : un admin actif peut LISTER tous les membres de la team
-- (la création / le changement de rôle / la révocation passent par l'Edge
--  Function `wac-manage-admins` en service role, réservée au super_admin).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS admin_members_select_admin ON public.admin_members;
CREATE POLICY admin_members_select_admin
  ON public.admin_members FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

-- ---------------------------------------------------------------------------
-- educational_activities : création de jeux par le content manager / admin
-- (la modification existe déjà via educational_activities_manage_content).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS educational_activities_insert_content ON public.educational_activities;
CREATE POLICY educational_activities_insert_content
  ON public.educational_activities FOR INSERT
  TO authenticated
  WITH CHECK (public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'content_manager']));
