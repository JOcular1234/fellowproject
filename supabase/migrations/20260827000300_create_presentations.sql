-- Live presentations and reactions
-- Allows admin to control which group is presenting, and public visitors to react

CREATE TABLE IF NOT EXISTS presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_round_id uuid NOT NULL REFERENCES project_rounds(id) ON DELETE CASCADE,
  project_group_id uuid NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one live presentation at a time per round
CREATE UNIQUE INDEX IF NOT EXISTS one_live_presentation_per_round
  ON presentations (project_round_id)
  WHERE status = 'live';

CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id uuid NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('thumbs_up', 'heart', 'fire', 'laugh')),
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent multiple reactions from the same session for the same presentation
CREATE UNIQUE INDEX IF NOT EXISTS one_reaction_per_session
  ON reactions (presentation_id, session_id);

-- Enable RLS
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Presentations: public can read, only admins can write
CREATE POLICY "Public can read presentations"
  ON presentations FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert presentations"
  ON presentations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update presentations"
  ON presentations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete presentations"
  ON presentations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
    )
  );

-- Reactions: public can read, insert, and delete (no auth required)
CREATE POLICY "Public can read reactions"
  ON reactions FOR SELECT
  USING (true);

CREATE POLICY "Public can insert reactions"
  ON reactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can delete reactions"
  ON reactions FOR DELETE
  USING (true);
