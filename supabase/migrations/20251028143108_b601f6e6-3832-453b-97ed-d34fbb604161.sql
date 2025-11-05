-- Create daily quiz completions table
CREATE TABLE public.daily_quiz_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_date DATE NOT NULL DEFAULT CURRENT_DATE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 3),
  questions_data JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  bonus_points_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, quiz_date)
);

-- Enable RLS
ALTER TABLE public.daily_quiz_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own quiz history
CREATE POLICY "Users can view their own quiz completions"
ON public.daily_quiz_completions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own quiz completions
CREATE POLICY "Users can insert their own quiz completions"
ON public.daily_quiz_completions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_quiz_completions_user_date ON public.daily_quiz_completions(user_id, quiz_date);
CREATE INDEX idx_quiz_completions_date ON public.daily_quiz_completions(quiz_date);