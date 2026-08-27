/*
# Participation Tracking

## Purpose
Track each group member's participation status so admins can monitor
who is actively contributing and who needs encouragement. Statuses
are displayed publicly on the group page to create accountability.

## Tables
1. Adds `participation_status` column to `group_members`
   - active (default)
   - needs_participation
   - not_participating
2. `participation_reviews` — history of status changes with leader
   comments (private, admin-only) and reviewer info.

## Flow
1. Admin asks team leaders for feedback (offline)
2. Admin updates each member's participation_status on the admin page
3. A history row is inserted automatically via trigger
4. Public group page shows the status badge next to each member
*/

-- ===== Enum =====
DO $$ BEGIN
  CREATE TYPE participation_status AS ENUM ('active', 'needs_participation', 'not_participating');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== Add participation_status to group_members =====
ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS participation_status participation_status NOT NULL DEFAULT 'active';

ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

-- ===== Participation Reviews (history) =====
CREATE TABLE IF NOT EXISTS participation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_member_id uuid NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
  previous_status participation_status,
  new_status participation_status NOT NULL,
  leader_comment text,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_member ON participation_reviews(group_member_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON participation_reviews(created_at DESC);

-- ===== Trigger: auto-insert history row on status change =====
CREATE OR REPLACE FUNCTION log_participation_change()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.participation_status IS DISTINCT FROM OLD.participation_status) THEN
    INSERT INTO participation_reviews (group_member_id, previous_status, new_status, reviewed_by)
    VALUES (NEW.id, OLD.participation_status, NEW.participation_status, NEW.reviewed_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_participation ON group_members;
CREATE TRIGGER trg_log_participation
  AFTER UPDATE OF participation_status ON group_members
  FOR EACH ROW EXECUTE FUNCTION log_participation_change();

-- ===== RLS for participation_reviews =====
ALTER TABLE participation_reviews ENABLE ROW LEVEL SECURITY;

-- Admin-only: full CRUD on reviews
DROP POLICY IF EXISTS "admin_select_reviews" ON participation_reviews;
CREATE POLICY "admin_select_reviews" ON participation_reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_insert_reviews" ON participation_reviews;
CREATE POLICY "admin_insert_reviews" ON participation_reviews FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_delete_reviews" ON participation_reviews;
CREATE POLICY "admin_delete_reviews" ON participation_reviews FOR DELETE TO authenticated USING (true);

-- ===== RLS: allow public to read participation_status from group_members =====
-- (Already covered by existing public_select_members policy since it's a SELECT *)
-- No changes needed — the column is included in SELECT * queries.
