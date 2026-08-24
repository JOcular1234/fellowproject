-- Fix: schema-qualify admins table references in trigger functions
-- The auth service runs with a different search_path that doesn't include public

CREATE OR REPLACE FUNCTION handle_new_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admins (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    (CASE WHEN NEW.email = 'mfonobongumoh75@gmail.com' THEN 'SUPER_ADMIN' ELSE 'ADMIN' END)::admin_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auto_confirm_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email_confirmed_at = now();
  RETURN NEW;
END;
$$;
