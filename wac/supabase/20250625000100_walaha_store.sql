-- WalahaStore — boutique de modules scolaires
-- A appliquer APRES 20250624000400_wac_user_moderation.sql.
--
-- Deux tables :
--   store_modules        : catalogue gere par la Walaha Team (WAC).
--   store_subscriptions  : cycle de vie ecole <-> module (demande -> activation).
-- Securite : catalogue lisible par tout utilisateur authentifie (sauf modules
-- desactives) ; abonnements visibles par l'ecole concernee et la Walaha Team ;
-- approbation / activation reservees aux admins WAC.

-- ---------------------------------------------------------------------------
-- Catalogue des modules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'premium',
  description TEXT,
  objective TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_used TEXT,
  pricing_type TEXT NOT NULL DEFAULT 'annual' CHECK (
    pricing_type IN ('included', 'annual', 'monthly', 'per_student', 'per_school', 'one_time', 'quote')
  ),
  price_amount INT,
  price_currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'available' CHECK (
    status IN ('available', 'beta', 'coming_soon', 'quote', 'premium_reserved', 'disabled')
  ),
  requires_validation BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS store_modules_set_updated_at ON public.store_modules;
CREATE TRIGGER store_modules_set_updated_at
  BEFORE UPDATE ON public.store_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Abonnements / demandes d'activation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.store_modules (id),
  school_id UUID NOT NULL REFERENCES public.canonical_schools (id),
  requested_by UUID REFERENCES auth.users (id),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (
    status IN ('requested', 'approved', 'active', 'rejected', 'suspended', 'cancelled', 'expired')
  ),
  price_agreed INT,
  note TEXT,
  decision_note TEXT,
  decided_by UUID REFERENCES auth.users (id),
  decided_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, school_id)
);

DROP TRIGGER IF EXISTS store_subscriptions_set_updated_at ON public.store_subscriptions;
CREATE TRIGGER store_subscriptions_set_updated_at
  BEFORE UPDATE ON public.store_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_store_subscriptions_status
  ON public.store_subscriptions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_subscriptions_school
  ON public.store_subscriptions (school_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.store_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;

-- Catalogue : visible par tout authentifie (modules non supprimes, non desactives)
-- + les admins voient tout.
DROP POLICY IF EXISTS store_modules_select_public ON public.store_modules;
CREATE POLICY store_modules_select_public
  ON public.store_modules FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND status <> 'disabled');

DROP POLICY IF EXISTS store_modules_select_admin ON public.store_modules;
CREATE POLICY store_modules_select_admin
  ON public.store_modules FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

DROP POLICY IF EXISTS store_modules_manage_admin ON public.store_modules;
CREATE POLICY store_modules_manage_admin
  ON public.store_modules FOR ALL
  TO authenticated
  USING (public.has_admin_role(ARRAY['super_admin', 'walaha_admin']))
  WITH CHECK (public.has_admin_role(ARRAY['super_admin', 'walaha_admin']));

-- Abonnements : l'ecole concernee (school_staff actif) + la Walaha Team.
DROP POLICY IF EXISTS store_subscriptions_select ON public.store_subscriptions;
CREATE POLICY store_subscriptions_select
  ON public.store_subscriptions FOR SELECT
  TO authenticated
  USING (
    public.is_walaha_admin()
    OR EXISTS (
      SELECT 1 FROM public.school_staff st
      WHERE st.school_id = store_subscriptions.school_id
        AND st.user_id = auth.uid()
        AND st.status = 'active'
    )
  );

-- Une ecole peut DEMANDER l'activation (status requested) pour son ecole.
DROP POLICY IF EXISTS store_subscriptions_request ON public.store_subscriptions;
CREATE POLICY store_subscriptions_request
  ON public.store_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND status = 'requested'
    AND EXISTS (
      SELECT 1 FROM public.school_staff st
      WHERE st.school_id = store_subscriptions.school_id
        AND st.user_id = auth.uid()
        AND st.status = 'active'
        AND st.role IN ('school_owner', 'school_director')
    )
  );

-- Approbation / activation / rejet : Walaha Team uniquement.
DROP POLICY IF EXISTS store_subscriptions_manage_admin ON public.store_subscriptions;
CREATE POLICY store_subscriptions_manage_admin
  ON public.store_subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_walaha_admin())
  WITH CHECK (public.is_walaha_admin());

-- ---------------------------------------------------------------------------
-- Seed : 7 modules MVP (section 19.3) — ne pas dupliquer le standard / WalahaPlay
-- ---------------------------------------------------------------------------
INSERT INTO public.store_modules (code, name, category, description, objective, pricing_type, price_amount, status, sort_order)
VALUES
  ('homework', 'Devoirs et exercices numériques', 'Pédagogie',
   'Devoirs, exercices et activités liés aux propres classes de l''école, avec suivi des rendus.',
   'Donner du travail propre à l''école et suivre les rendus côté parent.',
   'annual', 50000, 'available', 1),
  ('exam_prep', 'Préparation DEF / Baccalauréat', 'Pédagogie',
   'Espace de préparation aux examens propre à l''école : programme, sujets, corrigés, suivi des candidats.',
   'Aller au-delà des ressources générales avec un parcours d''examen propre à l''école.',
   'per_student', 1000, 'available', 2),
  ('correspondence', 'Carnet de correspondance enrichi', 'Communication',
   'Suivi structuré des remarques, observations, incidents légers et accusés de lecture parents.',
   'Structurer les échanges importants école-familles au-delà de la messagerie.',
   'annual', 30000, 'available', 3),
  ('parent_meetings', 'Rendez-vous parents-professeurs', 'Communication',
   'Organisation des créneaux, demandes, validations et rappels de rencontres.',
   'Organiser les rencontres sans appels répétitifs ni cahiers papier.',
   'annual', 25000, 'available', 4),
  ('discipline', 'Suivi disciplinaire et comportement', 'Administration',
   'Observations, avertissements, sanctions, efforts et progrès, par période.',
   'Suivre le comportement des élèves sans le mélanger à la messagerie.',
   'annual', 30000, 'available', 5),
  ('school_portal_custom', 'Portail Web École personnalisé', 'Premium',
   'Mini-site professionnel connecté à Walaha : page publique, branding, contact, préinscription.',
   'Donner à l''école une présence officielle en ligne.',
   'annual', 75000, 'beta', 6),
  ('advanced_analytics', 'Statistiques avancées et analytics', 'Pilotage',
   'Analyses détaillées : résultats, présences, paiements, engagement, progression, exports.',
   'Piloter l''école au-delà du tableau de bord standard.',
   'annual', 40000, 'available', 7)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE public.store_modules IS 'Catalogue WalahaStore : modules premium / avancés activables par école.';
COMMENT ON TABLE public.store_subscriptions IS 'Cycle de vie école ↔ module WalahaStore (demande, approbation, activation).';
