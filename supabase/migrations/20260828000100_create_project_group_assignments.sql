/*
# Project Group Assignments (Collaboration)
Allows multiple groups to be linked to the same project.
The original projects.project_group_id remains the "primary" group.
This junction table tracks additional collaborating groups.
*/

CREATE TABLE IF NOT EXISTS project_group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_group_id uuid NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, project_group_id)
);

-- Index for looking up all groups on a project
CREATE INDEX IF NOT EXISTS idx_assignments_project
  ON project_group_assignments (project_id);

-- Index for looking up all projects a group is assigned to
CREATE INDEX IF NOT EXISTS idx_assignments_group
  ON project_group_assignments (project_group_id);

-- ===== RLS =====
ALTER TABLE project_group_assignments ENABLE ROW LEVEL SECURITY;

-- Public can read assignments for published rounds
DROP POLICY IF EXISTS "public_select_assignments" ON project_group_assignments;
CREATE POLICY "public_select_assignments" ON project_group_assignments FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM project_groups pg
    JOIN project_rounds pr ON pr.id = pg.project_round_id
    WHERE pg.id = project_group_assignments.project_group_id AND pr.status = 'PUBLISHED'
  ));

-- Admins can do everything
DROP POLICY IF EXISTS "admin_insert_assignments" ON project_group_assignments;
CREATE POLICY "admin_insert_assignments" ON project_group_assignments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_assignments" ON project_group_assignments;
CREATE POLICY "admin_delete_assignments" ON project_group_assignments FOR DELETE
  TO authenticated USING (true);
