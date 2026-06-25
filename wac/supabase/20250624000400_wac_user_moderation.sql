-- Walaha Admin Center — Phase 1 : modération des comptes utilisateurs
-- A appliquer APRES 20250624000300_wac_members_games.sql.
--
-- La suspension réelle (bannissement) se fait via l'Edge Function
-- `wac-moderate-user` (Supabase Auth admin + service role). Cette table sert
-- à AFFICHER le statut de modération dans le WAC ; elle est écrite uniquement
-- côté serveur (service role), lue par les admins.

CREATE TABLE IF NOT EXISTS public.user_moderation (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'suspended', 'blocked')
  ),
  reason TEXT,
  moderated_by UUID REFERENCES auth.users (id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS user_moderation_set_updated_at ON public.user_moderation;
CREATE TRIGGER user_moderation_set_updated_at
  BEFORE UPDATE ON public.user_moderation
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_moderation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_moderation_select_admin ON public.user_moderation;
CREATE POLICY user_moderation_select_admin
  ON public.user_moderation FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

COMMENT ON TABLE public.user_moderation IS
  'Statut de modération WAC d''un compte (active / suspended / blocked). Écrit en service role via Edge Function.';
