-- Phase K3/K4 : intents paiement mobile, OCR bulletins (métadonnées), analytics WalahaPlay WAC.

-- ---------------------------------------------------------------------------
-- K3 — Intents de paiement intégré (Wave / Orange Money)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fee_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id UUID NOT NULL REFERENCES public.school_fees (id) ON DELETE CASCADE,
  school_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users (id) DEFAULT auth.uid(),
  provider TEXT NOT NULL CHECK (provider IN ('wave', 'orange_money', 'manual')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  reference_code TEXT NOT NULL UNIQUE,
  payment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'expired', 'cancelled')
  ),
  external_reference TEXT,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_payment_intents_fee
  ON public.fee_payment_intents (fee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fee_payment_intents_status
  ON public.fee_payment_intents (status, expires_at);

DROP TRIGGER IF EXISTS fee_payment_intents_set_updated_at ON public.fee_payment_intents;
CREATE TRIGGER fee_payment_intents_set_updated_at
  BEFORE UPDATE ON public.fee_payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.fee_payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY fee_payment_intents_pwe_read
  ON public.fee_payment_intents FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pwe_caller_context() ctx
      WHERE ctx.school_id = fee_payment_intents.school_id
    )
  );

CREATE POLICY fee_payment_intents_pwe_insert
  ON public.fee_payment_intents FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.pwe_caller_context() ctx
      WHERE ctx.school_id = fee_payment_intents.school_id
        AND ctx.role IN (
          'school_owner', 'school_director', 'school_secretary', 'school_accountant'
        )
    )
  );

CREATE POLICY fee_payment_intents_pwe_update
  ON public.fee_payment_intents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pwe_caller_context() ctx
      WHERE ctx.school_id = fee_payment_intents.school_id
        AND ctx.role IN (
          'school_owner', 'school_director', 'school_secretary', 'school_accountant'
        )
    )
  );

-- Brouillons OCR (texte extrait, pas de stockage image).
CREATE TABLE IF NOT EXISTS public.bulletin_ocr_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) DEFAULT auth.uid(),
  canonical_student_id UUID REFERENCES public.canonical_students (id),
  extracted_text TEXT NOT NULL,
  structured_json JSONB,
  source_mime TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulletin_ocr_drafts_user
  ON public.bulletin_ocr_drafts (user_id, created_at DESC);

ALTER TABLE public.bulletin_ocr_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY bulletin_ocr_drafts_own
  ON public.bulletin_ocr_drafts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Lecture agrégée WalahaPlay pour les admins WAC.
CREATE POLICY activity_sessions_read_wac_admin
  ON public.activity_sessions FOR SELECT
  TO authenticated
  USING (public.is_walaha_admin());

CREATE OR REPLACE FUNCTION public.pwe_create_fee_payment_intent(
  p_fee_id UUID,
  p_provider TEXT DEFAULT 'wave'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_role TEXT;
  v_fee public.school_fees%ROWTYPE;
  v_remaining NUMERIC;
  v_ref TEXT;
  v_url TEXT;
  v_intent_id UUID;
BEGIN
  SELECT school_id, role INTO v_school_id, v_role
  FROM public.pwe_caller_context();

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Accès PWE requis.';
  END IF;

  IF v_role NOT IN ('school_owner', 'school_director', 'school_secretary', 'school_accountant') THEN
    RAISE EXCEPTION 'Permission insuffisante.';
  END IF;

  IF p_provider NOT IN ('wave', 'orange_money', 'manual') THEN
    RAISE EXCEPTION 'Fournisseur invalide.';
  END IF;

  SELECT * INTO v_fee
  FROM public.school_fees
  WHERE id = p_fee_id AND school_id = v_school_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Frais introuvable.';
  END IF;

  v_remaining := GREATEST(0, v_fee.amount - COALESCE(v_fee.paid_amount, 0));
  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'Ce frais est déjà soldé.';
  END IF;

  v_ref := 'WAL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  v_url := CASE p_provider
    WHEN 'wave' THEN
      'https://pay.wave.com/c/' || v_ref || '?amount=' || trunc(v_remaining)::text
    WHEN 'orange_money' THEN
      'https://multi.app.orange-money.com/pay?ref=' || v_ref || '&amount=' || trunc(v_remaining)::text
    ELSE NULL
  END;

  INSERT INTO public.fee_payment_intents (
    fee_id, school_id, provider, amount, reference_code, payment_url
  )
  VALUES (
    p_fee_id, v_school_id, p_provider, v_remaining, v_ref, v_url
  )
  RETURNING id INTO v_intent_id;

  RETURN json_build_object(
    'intent_id', v_intent_id,
    'reference_code', v_ref,
    'amount', v_remaining,
    'currency', 'XOF',
    'provider', p_provider,
    'payment_url', v_url,
    'expires_at', (now() + INTERVAL '48 hours')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pwe_complete_fee_payment_intent(
  p_intent_id UUID,
  p_external_reference TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_role TEXT;
  v_intent public.fee_payment_intents%ROWTYPE;
BEGIN
  SELECT school_id, role INTO v_school_id, v_role
  FROM public.pwe_caller_context();

  IF v_role NOT IN ('school_owner', 'school_director', 'school_secretary', 'school_accountant') THEN
    RAISE EXCEPTION 'Permission insuffisante.';
  END IF;

  SELECT * INTO v_intent
  FROM public.fee_payment_intents
  WHERE id = p_intent_id AND school_id = v_school_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intent introuvable.';
  END IF;

  IF v_intent.status <> 'pending' THEN
    RAISE EXCEPTION 'Intent déjà traité.';
  END IF;

  UPDATE public.fee_payment_intents
  SET status = 'completed',
      completed_at = now(),
      external_reference = COALESCE(p_external_reference, external_reference)
  WHERE id = p_intent_id;

  PERFORM public.pwe_record_fee_payment(
    p_fee_id := v_intent.fee_id,
    p_amount := v_intent.amount,
    p_status := 'paid'
  );

  RETURN json_build_object('ok', true, 'intent_id', p_intent_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.wac_play_analytics(p_days INT DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since TIMESTAMPTZ := now() - make_interval(days => GREATEST(1, LEAST(p_days, 365)));
  v_total BIGINT;
  v_completed BIGINT;
  v_abandoned BIGINT;
  v_avg_duration NUMERIC;
  v_avg_success NUMERIC;
  v_top JSON;
  v_daily JSON;
BEGIN
  IF NOT public.is_walaha_admin() THEN
    RAISE EXCEPTION 'Accès WAC requis.';
  END IF;

  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE status = 'completed')::bigint,
    COUNT(*) FILTER (WHERE status = 'abandoned')::bigint,
    AVG(duration_real_minutes) FILTER (WHERE duration_real_minutes IS NOT NULL),
    AVG(success_level) FILTER (WHERE success_level IS NOT NULL)
  INTO v_total, v_completed, v_abandoned, v_avg_duration, v_avg_success
  FROM public.activity_sessions
  WHERE started_at >= v_since;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_top
  FROM (
    SELECT
      s.activity_id,
      COALESCE(a.title, s.activity_id) AS title,
      COUNT(*)::int AS sessions,
      COUNT(*) FILTER (WHERE s.status = 'completed')::int AS completed,
      ROUND(AVG(s.duration_real_minutes)::numeric, 1) AS avg_duration_minutes
    FROM public.activity_sessions s
    LEFT JOIN public.educational_activities a ON a.id = s.activity_id
    WHERE s.started_at >= v_since
    GROUP BY s.activity_id, a.title
    ORDER BY sessions DESC
    LIMIT 12
  ) t;

  SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json)
  INTO v_daily
  FROM (
    SELECT
      date_trunc('day', started_at)::date AS day,
      COUNT(*)::int AS sessions,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
    FROM public.activity_sessions
    WHERE started_at >= v_since
    GROUP BY 1
    ORDER BY 1
  ) d;

  RETURN json_build_object(
    'period_days', p_days,
    'total_sessions', COALESCE(v_total, 0),
    'completed', COALESCE(v_completed, 0),
    'abandoned', COALESCE(v_abandoned, 0),
    'completion_rate_pct',
      CASE WHEN COALESCE(v_total, 0) = 0 THEN 0
      ELSE ROUND(100.0 * v_completed / v_total, 1) END,
    'avg_duration_minutes', ROUND(COALESCE(v_avg_duration, 0)::numeric, 1),
    'avg_success_level', ROUND(COALESCE(v_avg_success, 0)::numeric, 2),
    'top_activities', v_top,
    'daily', v_daily
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pwe_create_fee_payment_intent(UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.pwe_complete_fee_payment_intent(UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.wac_play_analytics(INT)
  TO authenticated;
