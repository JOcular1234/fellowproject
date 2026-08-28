/*
# Presentation Phases
Adds a presentation_phase column to track which stage of the project
lifecycle a presentation belongs to (initial review, progress review, final).
*/

-- Add presentation_phase column with default
ALTER TABLE presentations
  ADD COLUMN IF NOT EXISTS presentation_phase text NOT NULL DEFAULT 'initial_review'
  CHECK (presentation_phase IN ('initial_review', 'progress_review', 'final_presentation'));

-- Backfill existing rows (they're all treated as initial review by default)
UPDATE presentations SET presentation_phase = 'initial_review' WHERE presentation_phase IS NULL;
