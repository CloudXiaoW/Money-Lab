-- Add quiz streak tracking columns to user_stats
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS quiz_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_quiz_date DATE;