-- WAC — Facturation école et informations comptables.
-- A appliquer APRES 20250623000100_wac_admin.sql.

ALTER TABLE public.school_digital_payments
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS proforma_number TEXT,
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'proforma' CHECK (
    document_type IN ('proforma', 'invoice', 'receipt', 'credit_note')
  ),
  ADD COLUMN IF NOT EXISTS discount_xof INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS billing_contact TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS accounting_ref TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_school_digital_payments_school_year
  ON public.school_digital_payments (canonical_school_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_school_digital_payments_due_date
  ON public.school_digital_payments (due_date)
  WHERE status IN ('pending', 'partial', 'overdue');

COMMENT ON COLUMN public.school_digital_payments.invoice_number IS
  'Numéro de facture définitive WAC.';

COMMENT ON COLUMN public.school_digital_payments.proforma_number IS
  'Numéro de facture proforma WAC.';

COMMENT ON COLUMN public.school_digital_payments.discount_xof IS
  'Réduction commerciale/comptable appliquée au montant brut en FCFA.';

COMMENT ON COLUMN public.school_digital_payments.accounting_ref IS
  'Référence interne pour la tenue comptable et le rapprochement.';
