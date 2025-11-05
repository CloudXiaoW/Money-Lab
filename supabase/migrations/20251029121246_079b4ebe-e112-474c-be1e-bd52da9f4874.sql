-- Add profile information columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN display_name TEXT NOT NULL DEFAULT 'New Investor',
ADD COLUMN avatar_url TEXT,
ADD COLUMN bio TEXT,
ADD COLUMN public_profile BOOLEAN DEFAULT true,
ADD COLUMN show_real_name BOOLEAN DEFAULT false,
ADD COLUMN email_notifications BOOLEAN DEFAULT true,
ADD COLUMN age_range TEXT,
ADD COLUMN experience_level TEXT DEFAULT 'beginner',
ADD COLUMN investment_goals TEXT[],
ADD COLUMN timezone TEXT DEFAULT 'UTC',
ADD COLUMN currency_preference TEXT DEFAULT 'USD',
ADD COLUMN language TEXT DEFAULT 'en';

-- Add validation constraints
ALTER TABLE public.profiles
ADD CONSTRAINT display_name_length CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 50),
ADD CONSTRAINT bio_length CHECK (bio IS NULL OR char_length(bio) <= 200),
ADD CONSTRAINT valid_age_range CHECK (age_range IS NULL OR age_range IN ('18-24', '25-34', '35-44', '45-54', '55+')),
ADD CONSTRAINT valid_experience_level CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
ADD CONSTRAINT valid_currency CHECK (currency_preference IN ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'));

-- Create index for leaderboard queries using display_name
CREATE INDEX idx_profiles_display_name ON public.profiles(display_name);