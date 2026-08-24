/*
# Team Meetings
Each project group can have one meeting link (Google Meet).
Admin manages the link; public users see it on the group page.
*/

-- ===== Enums =====
DO $$ BEGIN
  CREATE TYPE meeting_platform AS ENUM ('GOOGLE_MEET');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE meeting_status AS ENUM ('NOT_SET', 'ACTIVE', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== Team meetings table =====
CREATE TABLE IF NOT EXISTS team_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_group_id uuid NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
  platform meeting_platform NOT NULL DEFAULT 'GOOGLE_MEET',
  meeting_url text NOT NULL,
  status meeting_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One meeting row per group (enforced by unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_meetings_group ON team_meetings(project_group_id);

-- ===== Updated_at trigger =====
DROP TRIGGER IF EXISTS trg_team_meetings_updated ON team_meetings;
CREATE TRIGGER trg_team_meetings_updated BEFORE UPDATE ON team_meetings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== RLS =====
ALTER TABLE team_meetings ENABLE ROW LEVEL SECURITY;

-- Public can see meetings for published groups only
DROP POLICY IF EXISTS "public_select_meetings" ON team_meetings;
CREATE POLICY "public_select_meetings" ON team_meetings FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM project_groups pg
    JOIN project_rounds pr ON pr.id = pg.project_round_id
    WHERE pg.id = team_meetings.project_group_id AND pr.status = 'PUBLISHED'
  ));

-- Admin full CRUD
DROP POLICY IF EXISTS "admin_insert_meetings" ON team_meetings;
CREATE POLICY "admin_insert_meetings" ON team_meetings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_update_meetings" ON team_meetings;
CREATE POLICY "admin_update_meetings" ON team_meetings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_delete_meetings" ON team_meetings;
CREATE POLICY "admin_delete_meetings" ON team_meetings FOR DELETE TO authenticated USING (true);
