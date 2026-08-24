/*
# Admins Table
Tracks all admin users with roles (SUPER_ADMIN / ADMIN).
Triggers on auth.users auto-confirm emails and auto-insert into admins.
*/

-- ===== Enums =====
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== Admins table =====
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role admin_role NOT NULL DEFAULT 'ADMIN',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- ===== Auto-confirm email on signup =====
CREATE OR REPLACE FUNCTION auto_confirm_email()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_confirm_email ON auth.users;
CREATE TRIGGER trg_auto_confirm_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auto_confirm_email();

-- ===== Auto-insert into admins on user creation =====
CREATE OR REPLACE FUNCTION handle_new_admin()
RETURNS trigger AS $$
BEGIN
  INSERT INTO admins (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    (CASE WHEN NEW.email = 'mfonobongumoh75@gmail.com' THEN 'SUPER_ADMIN' ELSE 'ADMIN' END)::admin_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_new_admin ON auth.users;
CREATE TRIGGER trg_handle_new_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_admin();

-- ===== RLS =====
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Any authenticated admin can see the list
DROP POLICY IF EXISTS "admin_select_admins" ON admins;
CREATE POLICY "admin_select_admins" ON admins FOR SELECT
  TO authenticated USING (true);

-- Only super admin can delete
DROP POLICY IF EXISTS "super_admin_delete_admins" ON admins;
CREATE POLICY "super_admin_delete_admins" ON admins FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.role = 'SUPER_ADMIN')
  );

-- Only super admin can update roles
DROP POLICY IF EXISTS "super_admin_update_admins" ON admins;
CREATE POLICY "super_admin_update_admins" ON admins FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.role = 'SUPER_ADMIN')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.role = 'SUPER_ADMIN')
  );

-- ===== Insert existing auth users into admins =====
INSERT INTO admins (id, email, role)
SELECT id, email,
  (CASE WHEN email = 'mfonobongumoh75@gmail.com' THEN 'SUPER_ADMIN' ELSE 'ADMIN' END)::admin_role
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.users.id)
ON CONFLICT (id) DO NOTHING;

-- ===== Ensure super admin has correct role =====
UPDATE admins SET role = 'SUPER_ADMIN' WHERE email = 'mfonobongumoh75@gmail.com';
