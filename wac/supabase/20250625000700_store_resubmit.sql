-- WalahaStore — Autoriser une nouvelle demande après rejet / annulation / expiration
-- A appliquer APRES 20250625000600_parent_visibility.sql.
--
-- Avant : UNIQUE(module_id, school_id) bloquait toute re-demande même après un
-- rejet. Après : un seul abonnement "vivant" (requested/approved/active/suspended)
-- par (module, école), mais l'historique terminé n'empêche plus une nouvelle demande.

ALTER TABLE public.store_subscriptions
  DROP CONSTRAINT IF EXISTS store_subscriptions_module_id_school_id_key;

DROP INDEX IF EXISTS idx_store_subscriptions_live_unique;
CREATE UNIQUE INDEX idx_store_subscriptions_live_unique
  ON public.store_subscriptions (module_id, school_id)
  WHERE status IN ('requested', 'approved', 'active', 'suspended');

COMMENT ON INDEX public.idx_store_subscriptions_live_unique IS
  'Un seul abonnement actif/en cours par (module, école) ; les statuts terminés (rejected/cancelled/expired) n''empêchent pas une nouvelle demande.';
