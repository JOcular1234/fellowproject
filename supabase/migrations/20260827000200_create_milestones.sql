/*
# Milestones / Deadline Tracking

## Purpose
Admin sets project milestones with due dates for each project round.
Fellows see upcoming deadlines with countdown on the public site.

## Tables
1. `milestones` — title, description, due_date, round_id, is_completed

## Security (RLS)
- Public (anon) can SELECT milestones for published rounds only
- Admin (authenticated) can do full CRUD
*/

CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_round_id uuid NOT NULL REFERENCES project_rounds(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_round ON milestones(project_round_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due ON milestones(due_date);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_milestones_updated ON milestones;
CREATE TRIGGER trg_milestones_updated BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Public: read milestones for published rounds
DROP POLICY IF EXISTS "public_select_milestones" ON milestones;
CREATE POLICY "public_select_milestones" ON milestones FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_rounds
      WHERE project_rounds.id = milestones.project_round_id
      AND project_rounds.status = 'PUBLISHED'
    )
  );

-- Admin: full CRUD
DROP POLICY IF EXISTS "admin_insert_milestones" ON milestones;
CREATE POLICY "admin_insert_milestones" ON milestones FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_update_milestones" ON milestones;
CREATE POLICY "admin_update_milestones" ON milestones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_delete_milestones" ON milestones;
CREATE POLICY "admin_delete_milestones" ON milestones FOR DELETE TO authenticated USING (true);
