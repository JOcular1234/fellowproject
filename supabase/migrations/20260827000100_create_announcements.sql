/*
# Announcements

## Purpose
Admin-published announcements that appear on the public site via a
floating notification bell. Supports pinning (always shows at top)
and deactivation (soft delete, preserves history).

## Tables
1. `announcements` — id, title, body, is_pinned, is_active, created_by, timestamps

## Security (RLS)
- Public (anon) can SELECT active announcements only
- Admin (authenticated) can do full CRUD
*/

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, created_at DESC);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_announcements_updated ON announcements;
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Public: read active announcements only
DROP POLICY IF EXISTS "public_select_announcements" ON announcements;
CREATE POLICY "public_select_announcements" ON announcements FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- Admin: full CRUD
DROP POLICY IF EXISTS "admin_insert_announcements" ON announcements;
CREATE POLICY "admin_insert_announcements" ON announcements FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_update_announcements" ON announcements;
CREATE POLICY "admin_update_announcements" ON announcements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_delete_announcements" ON announcements;
CREATE POLICY "admin_delete_announcements" ON announcements FOR DELETE TO authenticated USING (true);
