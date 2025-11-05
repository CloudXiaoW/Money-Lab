-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Add badges to user_stats (already exists, but ensuring structure)
-- Badges: 'first_prediction', 'streak_3', 'streak_7', 'streak_30', 'accuracy_10', 'accuracy_50'

-- Create notification table for user alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('prediction_result', 'badge_earned', 'streak_milestone')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Schedule the evaluation to run daily at midnight UTC
SELECT cron.schedule(
  'evaluate-daily-predictions',
  '0 0 * * *', -- Run at 00:00 UTC every day
  $$
  SELECT
    net.http_post(
        url:='https://qcitzsvwnvbeztspkepf.supabase.co/functions/v1/evaluate-predictions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjaXR6c3Z3bnZiZXp0c3BrZXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTEwMTEsImV4cCI6MjA3NzIyNzAxMX0.rQB1Zs52ySYXhwKRRs6Raza1SwMUYzjE8kDvungIbs4"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);