-- Feature 5: Expert Consultations Table
CREATE TABLE public.expert_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expert_role TEXT NOT NULL CHECK (expert_role IN ('risk_manager', 'day_trader', 'long_term_investor')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.expert_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consultations"
  ON public.expert_consultations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consultations"
  ON public.expert_consultations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_expert_consultations_user_id ON public.expert_consultations(user_id);
CREATE INDEX idx_expert_consultations_created_at ON public.expert_consultations(created_at DESC);

-- Feature 1: Market Alerts Table
CREATE TABLE public.market_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  headline TEXT NOT NULL,
  snippet TEXT NOT NULL,
  url TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium')),
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.market_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts"
  ON public.market_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON public.market_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_market_alerts_user_id ON public.market_alerts(user_id);
CREATE INDEX idx_market_alerts_dismissed ON public.market_alerts(dismissed);
CREATE INDEX idx_market_alerts_created_at ON public.market_alerts(created_at DESC);

-- Feature 3: Portfolio Analyses Table
CREATE TABLE public.portfolio_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assets JSONB NOT NULL,
  strengths TEXT NOT NULL,
  weaknesses TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  diversity_score INTEGER NOT NULL CHECK (diversity_score BETWEEN 1 AND 10),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('cautious', 'balanced', 'aggressive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.portfolio_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analyses"
  ON public.portfolio_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
  ON public.portfolio_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_portfolio_analyses_user_id ON public.portfolio_analyses(user_id);
CREATE INDEX idx_portfolio_analyses_created_at ON public.portfolio_analyses(created_at DESC);

-- Feature 2: Social Predictions Table
CREATE TABLE public.social_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset TEXT NOT NULL,
  avg_target NUMERIC NOT NULL,
  bullish_percent INTEGER NOT NULL CHECK (bullish_percent BETWEEN 0 AND 100),
  bearish_percent INTEGER NOT NULL CHECK (bearish_percent BETWEEN 0 AND 100),
  sample_size INTEGER NOT NULL DEFAULT 0,
  sources JSONB DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.social_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view social predictions"
  ON public.social_predictions FOR SELECT
  USING (TRUE);

CREATE INDEX idx_social_predictions_asset ON public.social_predictions(asset);
CREATE INDEX idx_social_predictions_fetched_at ON public.social_predictions(fetched_at DESC);

-- Feature 4: Learning Content Table
CREATE TABLE public.learning_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('chart', 'video', 'infographic')),
  asset TEXT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.learning_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view learning content"
  ON public.learning_content FOR SELECT
  USING (TRUE);

CREATE INDEX idx_learning_content_type ON public.learning_content(content_type);
CREATE INDEX idx_learning_content_asset ON public.learning_content(asset);
CREATE INDEX idx_learning_content_created_at ON public.learning_content(created_at DESC);