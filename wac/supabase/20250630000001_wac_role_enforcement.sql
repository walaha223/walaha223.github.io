-- Durcissement de l'enforcement des rôles WAC côté serveur (least privilege).
--
-- Contexte : l'UI (wac.js > ACTION_ROLES / canAct) masque déjà les boutons selon
-- le rôle, mais plusieurs policies RLS d'écriture n'étaient gardées que par
-- public.is_walaha_admin() — c.-à-d. N'IMPORTE QUEL admin actif. Un admin sans le
-- bon rôle (ex. finance, content_manager, school_validator) pouvait donc, via
-- l'API Supabase directe, contourner l'UI et :
--   • modifier des signalements de modération,
--   • approuver / activer / tarifer des abonnements WalahaStore,
--   • traiter des demandes de modules sur devis,
--   • insérer dans l'historique des prix.
--
-- On aligne ces policies sur la matrice ACTION_ROLES du WAC via has_admin_role().
-- (admin_audit_logs INSERT reste large : chaque admin doit pouvoir tracer ses
--  propres actions.)

-- 1) Signalements de modération — réservé aux rôles de modération.
--    JS : report.claim/escalate = +support ; resolve/reject/assign = modération.
DROP POLICY IF EXISTS moderation_reports_update_admin ON public.moderation_reports;
CREATE POLICY moderation_reports_update_admin
  ON public.moderation_reports FOR UPDATE
  TO authenticated
  USING (
    public.has_admin_role(
      ARRAY['super_admin', 'walaha_admin', 'moderator', 'support']
    )
  )
  WITH CHECK (
    public.has_admin_role(
      ARRAY['super_admin', 'walaha_admin', 'moderator', 'support']
    )
  );

-- 2) Abonnements WalahaStore — réservé à la finance (approbation, activation,
--    renouvellement, rejet, suspension, prix négocié).
DROP POLICY IF EXISTS store_subscriptions_manage_admin ON public.store_subscriptions;
CREATE POLICY store_subscriptions_manage_admin
  ON public.store_subscriptions FOR UPDATE
  TO authenticated
  USING (
    public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'finance'])
  )
  WITH CHECK (
    public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'finance'])
  );

-- 3) Demandes de modules sur devis — finance (devis) + support (revue/clôture).
DROP POLICY IF EXISTS store_custom_requests_manage_admin ON public.store_custom_requests;
CREATE POLICY store_custom_requests_manage_admin
  ON public.store_custom_requests FOR UPDATE
  TO authenticated
  USING (
    public.has_admin_role(
      ARRAY['super_admin', 'walaha_admin', 'finance', 'support']
    )
  )
  WITH CHECK (
    public.has_admin_role(
      ARRAY['super_admin', 'walaha_admin', 'finance', 'support']
    )
  );

-- 4) Historique des prix d'abonnement — donnée financière, réservé finance.
DROP POLICY IF EXISTS store_price_history_admin_insert ON public.store_subscription_price_history;
CREATE POLICY store_price_history_admin_insert
  ON public.store_subscription_price_history FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_admin_role(ARRAY['super_admin', 'walaha_admin', 'finance'])
  );
