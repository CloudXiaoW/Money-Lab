-- Create table for saved chat responses (favorites)
CREATE TABLE public.saved_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  asset TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for saved responses
CREATE POLICY "Users can view their own saved responses"
ON public.saved_responses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved responses"
ON public.saved_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved responses"
ON public.saved_responses
FOR DELETE
USING (auth.uid() = user_id);