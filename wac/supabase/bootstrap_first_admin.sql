-- Remplacer l'email ci-dessous par l'email du compte Supabase Auth a promouvoir.
-- Le compte doit deja exister dans auth.users.

WITH selected_user AS (
  SELECT id, email
  FROM auth.users
  WHERE email = 'admin@walaha.ml'
  LIMIT 1
),
ensure_public_user AS (
  INSERT INTO public.users (id, email, display_name)
  SELECT id, email, 'Walaha Super Admin'
  FROM selected_user
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email
  RETURNING id
)
INSERT INTO public.admin_members (user_id, role, status)
SELECT id, 'super_admin', 'active'
FROM selected_user
ON CONFLICT (user_id) DO UPDATE
  SET role = 'super_admin',
      status = 'active';
