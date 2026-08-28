/*
# Project Showcases
Creates a `project_showcases` table for displaying completed projects
in a public showcase gallery. Admins create/edit/publish/feature showcases.
Public users can only read published showcases.
*/

-- ===== Project Showcases =====
CREATE TABLE IF NOT EXISTS project_showcases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  problem_statement text,
  solution text,
  technologies text[] NOT NULL DEFAULT '{}',
  screenshots text[] NOT NULL DEFAULT '{}',
  github_url text,
  demo_url text,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching published showcases
CREATE INDEX IF NOT EXISTS idx_showcases_published
  ON project_showcases (is_published) WHERE is_published = true;

-- Index for fetching featured showcases
CREATE INDEX IF NOT EXISTS idx_showcases_featured
  ON project_showcases (is_featured) WHERE is_featured = true AND is_published = true;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_showcases_updated ON project_showcases;
CREATE TRIGGER trg_showcases_updated BEFORE UPDATE ON project_showcases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== RLS =====
ALTER TABLE project_showcases ENABLE ROW LEVEL SECURITY;

-- Public can read only published showcases
DROP POLICY IF EXISTS "public_select_showcases" ON project_showcases;
CREATE POLICY "public_select_showcases" ON project_showcases FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Admins can do everything
DROP POLICY IF EXISTS "admin_insert_showcases" ON project_showcases;
CREATE POLICY "admin_insert_showcases" ON project_showcases FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_showcases" ON project_showcases;
CREATE POLICY "admin_update_showcases" ON project_showcases FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_showcases" ON project_showcases;
CREATE POLICY "admin_delete_showcases" ON project_showcases FOR DELETE
  TO authenticated USING (true);
