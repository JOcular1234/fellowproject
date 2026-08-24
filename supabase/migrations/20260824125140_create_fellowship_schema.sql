/*
# Python Fellows Project Hub — Core Schema

## Purpose
Creates the relational database for an internal fellowship project-grouping
portal. Fellows do NOT have accounts; only administrators authenticate.
The public site reads published groups; the admin area manages all data.

## Tables
1. `fellows` — id, first_name, last_name, email (unique, internal only),
   ranking (int), lessons_completed (int), level (enum), timestamps.
2. `project_rounds` — id, name, description, status (DRAFT/PUBLISHED/ARCHIVED), timestamps.
3. `project_groups` — id, project_round_id (FK), level (enum), group_number,
   name, timestamps. Unique (round, level, group_number).
4. `group_members` — id, project_group_id (FK), fellow_id (FK), is_leader,
   timestamps. Unique (group, fellow). One leader per group (partial unique
   index). One fellow per round (trigger).
5. `projects` — id, project_group_id (unique FK), title, description, status
   (NOT_SUBMITTED/SUBMITTED/APPROVED/NEEDS_REVISION), submitted_at, updated_at.

## Security (RLS)
- Public (anon) SELECT only published rounds, their groups/members/projects.
- `fellows` is admin-only; public reads name+level through `public_fellows` view.
- All writes are admin-only (authenticated).
- Email, ranking, lessons_completed never exposed publicly.

## Notes
- `public_fellows` is a view (cannot have RLS); it exposes only safe columns.
*/

-- ===== Enums =====
DO $$ BEGIN
  CREATE TYPE fellow_level AS ENUM ('ADVANCED', 'UPPER_INTERMEDIATE', 'INTERMEDIATE', 'DEVELOPING', 'BEGINNER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_round_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== Fellows =====
CREATE TABLE IF NOT EXISTS fellows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  ranking integer NOT NULL DEFAULT 0,
  lessons_completed integer NOT NULL DEFAULT 0,
  level fellow_level NOT NULL DEFAULT 'BEGINNER',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Project Rounds =====
CREATE TABLE IF NOT EXISTS project_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status project_round_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Project Groups =====
CREATE TABLE IF NOT EXISTS project_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_round_id uuid NOT NULL REFERENCES project_rounds(id) ON DELETE CASCADE,
  level fellow_level NOT NULL,
  group_number integer NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_round_id, level, group_number)
);

-- ===== Group Members =====
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_group_id uuid NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
  fellow_id uuid NOT NULL REFERENCES fellows(id) ON DELETE CASCADE,
  is_leader boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_group_id, fellow_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_leader_per_group
  ON group_members (project_group_id)
  WHERE is_leader = true;

CREATE OR REPLACE FUNCTION enforce_one_group_per_round()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM group_members gm
    JOIN project_groups pg ON pg.id = gm.project_group_id
    WHERE gm.fellow_id = NEW.fellow_id
      AND pg.project_round_id = (
        SELECT pg2.project_round_id FROM project_groups pg2 WHERE pg2.id = NEW.project_group_id
      )
      AND gm.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Fellow already in a group within this project round';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_one_group_per_round ON group_members;
CREATE TRIGGER trg_one_group_per_round
  BEFORE INSERT OR UPDATE OF fellow_id, project_group_id ON group_members
  FOR EACH ROW EXECUTE FUNCTION enforce_one_group_per_round();

-- ===== Projects =====
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_group_id uuid UNIQUE NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
  title text,
  description text,
  status project_status NOT NULL DEFAULT 'NOT_SUBMITTED',
  submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== updated_at triggers =====
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fellows_updated ON fellows;
CREATE TRIGGER trg_fellows_updated BEFORE UPDATE ON fellows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_rounds_updated ON project_rounds;
CREATE TRIGGER trg_rounds_updated BEFORE UPDATE ON project_rounds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_groups_updated ON project_groups;
CREATE TRIGGER trg_groups_updated BEFORE UPDATE ON project_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_members_updated ON group_members;
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON group_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_projects_updated ON projects;
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_groups_round ON project_groups(project_round_id);
CREATE INDEX IF NOT EXISTS idx_groups_level ON project_groups(level);
CREATE INDEX IF NOT EXISTS idx_members_group ON group_members(project_group_id);
CREATE INDEX IF NOT EXISTS idx_members_fellow ON group_members(fellow_id);
CREATE INDEX IF NOT EXISTS idx_projects_group ON projects(project_group_id);

-- ===== RLS =====
ALTER TABLE fellows ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Fellows: admin-only full CRUD
DROP POLICY IF EXISTS "admin_select_fellows" ON fellows;
CREATE POLICY "admin_select_fellows" ON fellows FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_insert_fellows" ON fellows;
CREATE POLICY "admin_insert_fellows" ON fellows FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_update_fellows" ON fellows;
CREATE POLICY "admin_update_fellows" ON fellows FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_delete_fellows" ON fellows;
CREATE POLICY "admin_delete_fellows" ON fellows FOR DELETE TO authenticated USING (true);

-- Project rounds
DROP POLICY IF EXISTS "public_select_published_rounds" ON project_rounds;
CREATE POLICY "public_select_published_rounds" ON project_rounds FOR SELECT
  TO anon, authenticated USING (status = 'PUBLISHED');
DROP POLICY IF EXISTS "admin_insert_rounds" ON project_rounds;
CREATE POLICY "admin_insert_rounds" ON project_rounds FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_update_rounds" ON project_rounds;
CREATE POLICY "admin_update_rounds" ON project_rounds FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_delete_rounds" ON project_rounds;
CREATE POLICY "admin_delete_rounds" ON project_rounds FOR DELETE TO authenticated USING (true);

-- Project groups
DROP POLICY IF EXISTS "public_select_groups" ON project_groups;
CREATE POLICY "public_select_groups" ON project_groups FOR SELECT
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM project_rounds pr WHERE pr.id = project_groups.project_round_id AND pr.status = 'PUBLISHED'));
DROP POLICY IF EXISTS "admin_insert_groups" ON project_groups;
CREATE POLICY "admin_insert_groups" ON project_groups FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_update_groups" ON project_groups;
CREATE POLICY "admin_update_groups" ON project_groups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_delete_groups" ON project_groups;
CREATE POLICY "admin_delete_groups" ON project_groups FOR DELETE TO authenticated USING (true);

-- Group members
DROP POLICY IF EXISTS "public_select_members" ON group_members;
CREATE POLICY "public_select_members" ON group_members FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM project_groups pg
    JOIN project_rounds pr ON pr.id = pg.project_round_id
    WHERE pg.id = group_members.project_group_id AND pr.status = 'PUBLISHED'
  ));
DROP POLICY IF EXISTS "admin_insert_members" ON group_members;
CREATE POLICY "admin_insert_members" ON group_members FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_update_members" ON group_members;
CREATE POLICY "admin_update_members" ON group_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_delete_members" ON group_members;
CREATE POLICY "admin_delete_members" ON group_members FOR DELETE TO authenticated USING (true);

-- Projects
DROP POLICY IF EXISTS "public_select_projects" ON projects;
CREATE POLICY "public_select_projects" ON projects FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM project_groups pg
    JOIN project_rounds pr ON pr.id = pg.project_round_id
    WHERE pg.id = projects.project_group_id AND pr.status = 'PUBLISHED'
  ));
DROP POLICY IF EXISTS "admin_insert_projects" ON projects;
CREATE POLICY "admin_insert_projects" ON projects FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_update_projects" ON projects;
CREATE POLICY "admin_update_projects" ON projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_delete_projects" ON projects;
CREATE POLICY "admin_delete_projects" ON projects FOR DELETE TO authenticated USING (true);

-- ===== Public-safe fellow view =====
CREATE OR REPLACE VIEW public_fellows AS
  SELECT id, first_name, last_name, level FROM fellows;
GRANT SELECT ON public_fellows TO anon, authenticated;
