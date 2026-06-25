-- Walaha Admin Center — tables internes, audit et signalements globaux
-- A appliquer dans Supabase avant d'utiliser le WAC en production.

CREATE TABLE IF NOT EXISTS public.admin_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (
    role IN (
      'super_admin',
      'walaha_admin',
      'moderator',
      'support',
      'finance',
      'school_validator',
      'content_manager'
    )
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'suspended', 'revoked')
  ),
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

DROP TRIGGER IF EXISTS admin_members_set_updated_at ON public.admin_members;
CREATE TRIGGER admin_members_set_updated_at
  BEFORE UPDATE ON public.admin_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users (id),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  old_data JSONB,
  new_data JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
  ON public.admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target
  ON public.admin_audit_logs (target_type, target_id);

CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users (id),
  target_type TEXT NOT NULL,
  target_id UUID,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_review', 'resolved', 'rejected', 'escalated')
  ),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'critical')
  ),
  assigned_admin_id UUID REFERENCES auth.users (id),
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS moderation_reports_set_updated_at ON public.moderation_reports;
CREATE TRIGGER moderation_reports_set_updated_at
  BEFORE UPDATE ON public.moderation_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_moderation_reports_status
  ON public.moderation_reports (status, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS public.school_digital_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_school_id UUID REFERENCES public.canonical_schools (id),
  school_name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  billed_students INT NOT NULL DEFAULT 0,
  amount_per_student_xof INT NOT NULL DEFAULT 5000,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled', 'refunded')
  ),
  proof_storage_path TEXT,
  confirmed_by UUID REFERENCES auth.users (id),
  confirmed_at TIMESTAMPTZ,
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (canonical_school_id, academic_year)
);

DROP TRIGGER IF EXISTS school_digital_payments_set_updated_at ON public.school_digital_payments;
CREATE TRIGGER school_digital_payments_set_updated_at
  BEFORE UPDATE ON public.school_digital_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_school_digital_payments_status
  ON public.school_digital_payments (academic_year, status);

CREATE OR REPLACE FUNCTION public.is_walaha_admin()
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
  );
$$;

ALTER TABLE public.admin_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_digital_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_members_select_self_or_admin ON public.admin_members;
DROP POLICY IF EXISTS admin_members_select_self ON public.admin_members;
CREATE POLICY admin_members_select_self
  ON public.admin_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS admin_members_manage_super_admin ON public.admin_members;

DROP POLICY IF EXISTS admin_audit_logs_select_admin ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_select_admin
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

DROP POLICY IF EXISTS moderation_reports_select_admin ON public.moderation_reports;
CREATE POLICY moderation_reports_select_admin
  ON public.moderation_reports FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

DROP POLICY IF EXISTS moderation_reports_update_admin ON public.moderation_reports;
CREATE POLICY moderation_reports_update_admin
  ON public.moderation_reports FOR UPDATE
  TO authenticated
  USING (public.is_walaha_admin())
  WITH CHECK (public.is_walaha_admin());

DROP POLICY IF EXISTS school_digital_payments_select_admin ON public.school_digital_payments;
CREATE POLICY school_digital_payments_select_admin
  ON public.school_digital_payments FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

DROP POLICY IF EXISTS school_digital_payments_manage_finance ON public.school_digital_payments;
CREATE POLICY school_digital_payments_manage_finance
  ON public.school_digital_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('super_admin', 'walaha_admin', 'finance')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('super_admin', 'walaha_admin', 'finance')
    )
  );

DROP POLICY IF EXISTS users_select_walaha_admin ON public.users;
CREATE POLICY users_select_walaha_admin
  ON public.users FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

DROP POLICY IF EXISTS canonical_schools_select_walaha_admin ON public.canonical_schools;
CREATE POLICY canonical_schools_select_walaha_admin
  ON public.canonical_schools FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

DROP POLICY IF EXISTS canonical_students_select_walaha_admin ON public.canonical_students;
CREATE POLICY canonical_students_select_walaha_admin
  ON public.canonical_students FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

DROP POLICY IF EXISTS canonical_tutors_select_walaha_admin ON public.canonical_tutors;
CREATE POLICY canonical_tutors_select_walaha_admin
  ON public.canonical_tutors FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

DROP POLICY IF EXISTS educational_activities_select_walaha_admin ON public.educational_activities;
CREATE POLICY educational_activities_select_walaha_admin
  ON public.educational_activities FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

COMMENT ON TABLE public.admin_members IS 'Membres internes autorisés à accéder au Walaha Admin Center.';
COMMENT ON TABLE public.admin_audit_logs IS 'Journal obligatoire des actions sensibles réalisées dans le WAC.';
COMMENT ON TABLE public.moderation_reports IS 'Signalements globaux traités par la Walaha Team.';
COMMENT ON TABLE public.school_digital_payments IS 'Suivi WAC du frais numérique scolaire annuel : 5 000 FCFA par élève.';
