-- Add all missing columns to condition_logs
ALTER TABLE condition_logs
  ADD COLUMN IF NOT EXISTS supplement_logs jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS straight_sleep boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS extra_sleep jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sunlight boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sunlight_minutes int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS study_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mood int CHECK (mood BETWEEN 1 AND 5);
