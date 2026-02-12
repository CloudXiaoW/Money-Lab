# Money Labs 💰

**A Gamified Financial Education Platform Powered by AI**

Money Labs transforms financial learning into an engaging, interactive experience through daily predictions, AI-powered insights, and a comprehensive gamification system. Users develop real-world financial literacy while competing on leaderboards and earning achievements.

---

## 🎯 Problem Being Solved

Traditional financial education is often:
- **Boring and theoretical**: Lacks practical, hands-on learning
- **Intimidating for beginners**: Complex jargon and information overload
- **Disconnected from real markets**: No real-time feedback or engagement
- **Not personalized**: One-size-fits-all approach doesn't match individual risk profiles

Money Labs solves these problems by:
- ✅ Gamifying predictions to make learning fun and habit-forming
- ✅ Providing AI-powered personalized insights based on risk tolerance
- ✅ Offering real-time market data and breaking news alerts
- ✅ Creating a safe environment to practice financial decision-making
- ✅ Building financial intuition through daily engagement and immediate feedback

---

## Demo
https://lovable-money-labs-login.lovable.app/?utm_source=lovable-editor

create login 
or use demo account

username: test@gmail.com
Password: PAssword1

## Slides


<!-- ## **Video**
https://youtu.be/2axRgOSMuVE
--- -->


## ✨ Key Features

### 🎲 Daily Price Predictions
- Make daily up/down predictions on crypto, stocks, and commodities
- Earn points for correct predictions
- Build streaks for consecutive correct predictions
- Automated evaluation at market close with instant notifications

### 🤖 AI-Powered Financial Assistant (MoneyBot)
- Natural language Q&A about markets, assets, and finance
- Real-time data integration via You.com Search API
- Context-aware responses based on user's tracked assets and risk profile
- Voice interface powered by Google Gemini Live API
- Save important insights for later reference

### 👨‍💼 Expert Panel Consultations
- Consult three AI personas with distinct investment philosophies:
  - **Risk Manager**: Conservative, risk-mitigation focused
  - **Day Trader**: High-frequency, technical analysis expert
  - **Long-term Investor**: Value investing, fundamentals-driven
- Real-time market context integrated into expert advice
- Source citations for transparency

### 📊 Portfolio Analysis
- AI-powered portfolio diversity scoring
- Asset categorization (crypto, stocks, tech, commodities)
- Personalized strengths, weaknesses, and recommendations
- 24-hour caching for optimal performance

### 📚 Learning Hub
- Curated educational content (videos, articles, courses)
- Difficulty-based filtering (Beginner, Intermediate, Advanced)
- Asset-specific learning resources
- Finance glossary with AI-powered definitions

### 🧠 Daily Knowledge Quiz
- 5 adaptive questions testing financial literacy
- Bonus points for perfect scores
- Prevents retakes to encourage daily learning habits

### 📡 Community Pulse (Social Sentiment)
- Real-time community sentiment analysis (bullish/bearish %)
- Average price target predictions from social media
- Demo mode with intelligent mock data when API unavailable
- 4-hour caching to reduce API costs

### 🚨 Breaking Market Alerts
- AI-detected high-impact market events
- Severity classification (high, medium, low)
- Asset-specific alerts based on tracked portfolio
- One-click dismissal with persistent state

### 🏆 Gamification System
- Points for predictions, quizzes, and engagement
- Achievement badges (First Prediction, Quiz Master, etc.)
- Global leaderboard with top performers
- Streak tracking with longest streak records

---

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first CSS framework with custom design tokens
- **shadcn-ui** - Beautifully designed component library
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Recharts** - Data visualization

### Backend (Lovable Cloud / Supabase)
- **PostgreSQL** - Relational database with RLS policies
- **Edge Functions (Deno)** - Serverless compute for AI agents
- **Supabase Auth** - Email/password authentication with auto-confirm
- **Realtime** - WebSocket subscriptions for live notifications

### AI Integration
- **Lovable AI API** - Zero-config AI gateway supporting:
  - `google/gemini-2.5-pro` - Advanced reasoning and multimodal analysis
  - `google/gemini-2.5-flash` - Balanced performance (default)
  - `openai/gpt-5` - Flagship reasoning model
  - `openai/gpt-5-mini` - Cost-effective alternative
- **Google Gemini Live API** - Real-time voice conversations via WebSocket
- **You.com Search API** - Real-time market news and sentiment data

### Real-time Data
- **You.com Search API** - Unified search interface for:
  - Market news and sentiment
  - Price data and technical indicators
  - Community predictions and social media analysis

---

## 🧩 How It Works

### 1. **Authentication & Onboarding**

<img width="1387" height="186" alt="A" src="https://github.com/user-attachments/assets/47e6aaf1-2e74-491f-8bb3-4a347d9de574" />


### 2. **Daily Prediction Cycle**

<img width="1241" height="258" alt="b" src="https://github.com/user-attachments/assets/ab45e41b-1e7f-4471-817f-6c3b5b636ee7" />


### 3. **AI Chat Interaction**

<img width="1697" height="382" alt="c" src="https://github.com/user-attachments/assets/dda52ec6-cb04-4958-b19b-fd820a15659f" />


### 4. **Voice AI Conversation**

<img width="1552" height="536" alt="d" src="https://github.com/user-attachments/assets/a4c93feb-069e-4dfc-a254-503e16d5895a" />


### 5. **Portfolio Analysis**

<img width="1687" height="668" alt="e" src="https://github.com/user-attachments/assets/bc1e3ccd-0260-4507-acdd-53d5909c7551" />


---

## 🤖 AI Agent Architecture

Money Labs uses a microservices-style architecture with specialized edge functions acting as AI agents:

### 1. **chat-analyst** (Financial Q&A Agent)
**Purpose**: Conversational financial assistant with real-time data integration

**Workflow**:
1. Authenticate user and fetch profile (assets, risk profile)
2. Detect mentioned assets in query (e.g., "BTC", "Bitcoin", "Apple")
3. Determine if real-time data is needed (market analysis vs. general education)
4. **If price query**: Call `asset-prices` function for current prices
5. **If real-time analysis**: Query You.com Search API → Send results + query to Lovable AI
6. **If general query**: Direct Lovable AI call with user context
7. Return synthesized answer with sources and context metadata

**Key Features**:
- Context-aware responses based on user's portfolio
- Source citations for transparency
- Fallback to pure AI when real-time data unavailable
- Rate limit handling (429 errors)

---

### 2. **asset-analyst** (Personalized Asset Analysis)
**Purpose**: Generate detailed asset analyses tailored to user's risk profile

**Workflow**:
1. Fetch user risk profile (conservative/moderate/aggressive)
2. Query You.com for asset-specific news, sentiment, and technical data
3. Construct risk-adjusted prompt for Lovable AI
4. Generate analysis covering:
   - Current market sentiment
   - Risk factors specific to user's profile
   - Technical indicators explanation
   - Actionable insights
5. Return structured analysis with sources

**Risk Adjustment Example**:
- **Conservative**: Focus on downside protection, volatility warnings
- **Moderate**: Balanced view with risk/reward tradeoffs
- **Aggressive**: Highlight growth potential, accept higher volatility

---

### 3. **expert-panel** (Multi-Persona Advisory System)
**Purpose**: Provide diverse perspectives through three AI personas

**Available Experts**:
- **Risk Manager**: "I focus on protecting your capital first, growth second."
- **Day Trader**: "I look for short-term opportunities using technical analysis."
- **Long-term Investor**: "I believe in buying quality assets and holding them."

**Workflow**:
1. User selects expert and submits question
2. Fetch user profile and assets
3. Query You.com for real-time market context
4. Load expert-specific system prompt
5. Send context + query to Lovable AI with persona instructions
6. Save consultation to database (question, answer, sources)
7. Return expert's response with citation links

**Conversation Memory**: Supports follow-up questions by maintaining conversation history

---

### 4. **portfolio-analyzer** (Diversity & Risk Assessor)
**Purpose**: Evaluate portfolio composition and provide actionable recommendations

**Workflow**:
1. Fetch user's tracked assets from profile
2. Check for cached analysis (<24 hours)
3. If expired:
   - **Categorize assets**: Crypto, Stocks, Tech, Commodities
   - **Calculate diversity score**: 
     ```typescript
     diversityScore = (numCategories / totalCategories) * 100
     bonusPoints = (mostAssets / totalAssets < 0.5) ? 10 : 0
     finalScore = Math.min(diversityScore + bonusPoints, 100)
     ```
   - Query You.com for market conditions across categories
   - Send to Lovable AI with prompt:
     ```
     Analyze portfolio:
     - Strengths (what's working well)
     - Weaknesses (concentration risks, gaps)
     - Recommendations (actionable next steps)
     ```
4. Parse AI response and save to database
5. Return analysis with diversity score

**Caching Strategy**: 24-hour cache to balance freshness and cost

---

### 5. **gemini-voice** (Real-time Voice AI)
**Purpose**: Voice-based financial assistant with streaming audio responses

**Technology**: Google Gemini Live API via WebSocket

**Workflow**:
1. Client opens WebSocket connection
2. Client sends `auth` message with JWT token
3. Edge function:
   - Validates user authentication
   - Fetches user profile and Gemini API key
   - Establishes WebSocket with Gemini Live API
   - Sends system instructions with user context:
     ```
     You are a financial advisor. User tracks: [BTC, ETH, AAPL]
     Risk profile: Moderate. Voice: Charon (calm, professional)
     ```
4. Client streams audio (24kHz PCM16 base64)
5. Edge function forwards audio to Gemini
6. Gemini responds with:
   - `serverContent` with audio chunks + transcript
   - `toolCall` if external data needed
7. Edge function forwards response to client
8. Client plays audio and displays transcript

**Audio Format**: 24kHz PCM16 mono, base64-encoded chunks

---

### 6. **social-pulse** (Community Sentiment Aggregator)
**Purpose**: Analyze social media sentiment and price predictions

**Workflow**:
1. Check database for cached data (<4 hours)
2. If expired, query You.com for:
   ```
   "[ASSET] price prediction 2024 site:reddit.com OR site:twitter.com"
   ```
3. Process search results:
   - **Sentiment Analysis**: Count bullish/bearish keywords
     ```typescript
     BULLISH_KEYWORDS = ['bullish', 'moon', 'buy', 'long', 'pump']
     BEARISH_KEYWORDS = ['bearish', 'crash', 'sell', 'short', 'dump']
     ```
   - **Price Target Extraction**: Regex to find $100, $10K, etc.
     ```typescript
     /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?|\d+[KkMm])/g
     ```
4. Calculate aggregates:
   ```typescript
   bullishPercent = (bullishCount / totalSentimentCount) * 100
   avgTarget = sum(priceTargets) / priceTargets.length
   ```
5. Save to database with sources
6. **Fallback**: If You.com fails (403 Forbidden), generate mock data:
   - Random 45-55% bullish/bearish split
   - Price targets ±15% from current price
   - Cached for 1 hour (shorter than real data)
   - Display "Demo Mode" badge on UI

---

### 7. **market-insights** (Multi-source News Synthesis)
**Purpose**: Aggregate news, sentiment, and technical tips for an asset

**Workflow**:
1. Make 3 parallel calls to Lovable AI:
   - **News Summary**: "Summarize recent news for [ASSET] in 2-3 sentences"
   - **Sentiment**: "Is the overall sentiment bullish, bearish, or neutral?"
   - **Technical Tip**: "Provide one simple technical indicator insight"
2. Combine responses:
   ```json
   {
     "summary": "Bitcoin surged 5% after...",
     "sentiment": "bullish",
     "sentimentEmoji": "🚀",
     "technicalTip": "RSI at 65 suggests momentum..."
   }
   ```
3. Return structured data for PriceWidget component

---

### 8. **breaking-alerts** (Real-time Event Detection)
**Purpose**: Monitor and notify users of high-impact market events

**Workflow**:
1. Fetch user's tracked assets
2. Query You.com for breaking news: `"[ASSET] breaking news today"`
3. Filter results by keywords:
   - **High severity**: "crash", "halt", "investigation"
   - **Medium severity**: "volatility", "warning", "drops"
   - **Low severity**: "update", "announces"
4. Save alerts to database (deduplicate by headline)
5. Realtime broadcasts to connected clients
6. Display as dismissible notifications on dashboard

**Deduplication**: Check if headline already exists in last 24 hours

---

### 9. **daily-quiz** (Adaptive Knowledge Assessment)
**Purpose**: Test financial literacy with adaptive difficulty

**Workflow**:
1. Check if user already completed quiz today
2. Fetch user stats (points, streak) for adaptive difficulty
3. Send prompt to Lovable AI:
   ```
   Generate 5 multiple-choice financial literacy questions.
   Difficulty: [Beginner/Intermediate/Advanced]
   Topics: crypto, stocks, risk management, technical analysis
   Format: JSON with question, options array, correctAnswer index, explanation
   ```
4. Parse AI response into structured format
5. Return questions to client
6. On submission:
   - Calculate score (20 points per correct answer)
   - Award 20 bonus points for perfect score
   - Save completion to database
   - Update user stats

**Adaptive Logic**: Higher user points → Higher difficulty questions

---

### 10. **evaluate-predictions** (Automated Prediction Scorer)
**Purpose**: Daily cron job to evaluate predictions and award points

**Workflow**:
1. **Triggered**: Midnight UTC (or manual admin trigger)
2. Fetch all predictions from yesterday with `result IS NULL`
3. For each asset, fetch closing price:
   - Query You.com for "[ASSET] closing price [DATE]"
   - Parse price from search results
   - Fall back to mock data if unavailable
4. Compare prediction vs. actual:
   ```typescript
   if (prediction === 'up' && closingPrice > openingPrice) result = 'correct'
   else if (prediction === 'down' && closingPrice < openingPrice) result = 'correct'
   else result = 'incorrect'
   ```
5. Update predictions table with result and closing price
6. Award points:
   - **Correct**: +10 points
   - **Incorrect**: 0 points
7. Update user_stats:
   - Increment points
   - Update streak logic:
     ```typescript
     if (correctToday && predictedYesterday) currentStreak++
     else currentStreak = correctToday ? 1 : 0
     longestStreak = Math.max(currentStreak, longestStreak)
     ```
8. Create notifications for each user with results

---

### 11. **make-prediction** (Prediction Submission Handler)
**Purpose**: Validate and record user predictions

**Workflow**:
1. Authenticate user
2. Check if user already predicted this asset today
3. If allowed:
   - Insert prediction into database
   - Update `last_prediction_date` in user_stats
   - Maintain streak if consecutive days
4. Return success with updated streak data

**Business Rules**:
- One prediction per asset per day
- Predictions lock after submission (no edits)

---

### 12. **finance-glossary** (AI-powered Definitions)
**Purpose**: Provide clear, beginner-friendly financial term explanations

**Workflow**:
1. User searches for term (e.g., "RSI")
2. Query Lovable AI:
   ```
   Explain "[TERM]" in simple terms for a beginner.
   Provide: definition, real-world example, 2-3 sentences max.
   ```
3. Return formatted explanation
4. Cache common terms for performance

---

### 13. **learning-content** (Curated Education)
**Purpose**: Return filtered educational resources

**Workflow**:
1. Fetch from `learning_content` table
2. Filter by:
   - Asset (if specified)
   - Difficulty (Beginner/Intermediate/Advanced)
   - Content type (video/article/course)
3. Return sorted by relevance
4. Public access (no auth required)

---

### 14. **Admin Functions**
- **admin-analytics**: Fetch platform-wide usage stats
- **admin-get-users**: List all users with stats
- **admin-manage-user**: Ban/unban, adjust points, assign roles

---

## 🌐 Why You.com API?

### Problem with Traditional Market Data APIs
- **Fragmented ecosystem**: Different APIs for crypto (CoinGecko), stocks (Alpha Vantage), news (NewsAPI)
- **API key overhead**: Managing multiple keys and rate limits
- **Cost**: Most financial data APIs require paid subscriptions
- **Inconsistent formats**: Each API has different response structures

### You.com Advantages
✅ **Unified interface**: Single API for all asset classes (crypto, stocks, commodities)  
✅ **Real-time search**: Up-to-date news, sentiment, and price data  
✅ **No asset-specific keys**: One API key for all queries  
✅ **Natural language queries**: Search like "BTC sentiment today" vs. complex API endpoints  
✅ **Free tier**: Generous rate limits for prototyping  
✅ **Source diversity**: Aggregates from Reddit, Twitter, news sites, and forums  

### Use Cases in Money Labs
- Chat analyst real-time context
- Social sentiment aggregation
- Breaking news alerts
- Portfolio market analysis
- Price data fetching

---

## 🚀 Why Lovable AI?

### Problem with Direct LLM APIs
- **API key management**: Users must provide and secure their own OpenAI/Anthropic keys
- **Cost unpredictability**: Direct usage can spike unexpectedly
- **Model selection complexity**: Choosing between GPT-4, Claude, Gemini requires expertise
- **No fallbacks**: If one provider is down, app breaks

### Lovable AI Advantages
✅ **Zero-config**: No API key required from users (auto-provisioned)  
✅ **Multi-model support**: Access GPT-5, Gemini 2.5 Pro/Flash via single API  
✅ **Cost-effective**: Shared rate limits and optimized routing  
✅ **Built-in fallbacks**: Automatic failover between models  
✅ **Lovable Cloud integration**: Seamless with edge functions  
✅ **Model flexibility**: Switch models via `model` parameter without code changes  

### Model Selection Strategy
```typescript
// Default: Fast and cost-effective
model: "google/gemini-2.5-flash"

// Complex reasoning: Expert panel consultations
model: "google/gemini-2.5-pro"

// Maximum performance: Portfolio analysis
model: "openai/gpt-5"

// High volume: Daily quiz generation
model: "google/gemini-2.5-flash-lite"
```

### Cost Optimization
- **Caching**: Portfolio analyses cached 24hrs, social pulse 4hrs
- **Streaming**: Chat responses stream tokens (better UX, same cost)
- **Fallbacks**: Use mock data when API unavailable (social pulse)
- **Smart routing**: Use lighter models for simple tasks

---

## 📐 System Architecture

<img width="1285" height="617" alt="f" src="https://github.com/user-attachments/assets/bd655ccf-3af0-4cf6-aac6-14f871b015e5" />


---

## 🔄 User Prediction Flow

<img width="1250" height="642" alt="g" src="https://github.com/user-attachments/assets/57eabc54-3099-4b66-a8fc-074984b31010" />


---

## 💬 AI Chat Analyst Flow

<img width="1127" height="701" alt="h" src="https://github.com/user-attachments/assets/ae976cb7-830b-49d2-a065-bb186e8925b2" />


---

## 🎙️ Voice AI Flow

<img width="897" height="653" alt="i" src="https://github.com/user-attachments/assets/ee3114b8-dbb6-4622-85df-2f087fa66ad8" />


---

## 🗄️ Database Schema (ERD)

<img width="1316" height="513" alt="j" src="https://github.com/user-attachments/assets/aaeeee92-b7f7-4424-9ebe-3ab66a53b04e" />


---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ or **Bun** 1.0+
- **npm** or **bun** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd money-labs
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Environment Setup**
   The `.env` file is auto-generated by Lovable Cloud and includes:
   ```env
   VITE_SUPABASE_URL=https://qcitzsvwnvbeztspkepf.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
   VITE_SUPABASE_PROJECT_ID=qcitzsvwnvbeztspkepf
   ```
   **Note**: Never edit `.env` manually - it's managed by Supabase integration.

4. **Run development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```
   Open [http://localhost:5173](http://localhost:5173)

5. **Edge Function Deployment**
   Edge functions deploy automatically when you push to the connected Git repository. No manual deployment needed!

---

## 📖 Usage Guide

### 1. **Create an Account**
- Navigate to `/auth`
- Enter email and password
- Click "Sign Up"
- Email confirmation is auto-enabled (no verification link needed)

### 2. **Complete Onboarding**
- Select 3-5 assets you want to track (BTC, ETH, AAPL, TSLA, etc.)
- Choose your risk profile:
  - **Conservative**: Low risk, capital preservation
  - **Moderate**: Balanced risk/reward
  - **Aggressive**: High risk, growth-focused
- Click "Complete Setup"

### 3. **Make Daily Predictions**
- On the dashboard, find the "Price Predictions" card
- Select an asset (e.g., Bitcoin)
- Click "Up" or "Down" based on your prediction for tomorrow's closing price
- Build streaks by making consecutive correct predictions
- Check results the next day via notifications

### 4. **Chat with MoneyBot**
- Click the chat icon in the bottom-right corner
- Ask questions like:
  - "What's the sentiment for Ethereum?"
  - "Should I buy Tesla stock?"
  - "Explain RSI indicator"
- View real-time data sources below the answer
- Save important responses by clicking the ⭐ star icon
- Use voice mode by holding the microphone button

### 5. **Consult Expert Panel**
- Click "Expert Panel" in the navigation
- Choose an expert:
  - **Risk Manager**: For conservative, risk-aware advice
  - **Day Trader**: For short-term, technical trading insights
  - **Long-term Investor**: For value investing perspectives
- Ask your question (e.g., "Is now a good time to buy Bitcoin?")
- View expert's response with cited sources

### 6. **Analyze Your Portfolio**
- Navigate to "Portfolio Analysis"
- Click "Analyze Portfolio"
- View:
  - **Diversity Score**: 0-100 based on asset spread
  - **Strengths**: What's working well in your portfolio
  - **Weaknesses**: Concentration risks or gaps
  - **Recommendations**: Actionable next steps
- Analysis is cached for 24 hours

### 7. **Take Daily Quiz**
- Click "Daily Quiz" on the dashboard
- Answer 5 multiple-choice questions on financial literacy
- Earn 20 points per correct answer
- Get 20 bonus points for a perfect score
- Quiz resets daily

### 8. **Check Leaderboard**
- Navigate to "Leaderboard" to see top users
- View global rankings by total points
- See badges and streaks of top performers

### 9. **Explore Learning Hub**
- Click "Learning Hub" in navigation
- Filter by:
  - **Asset**: BTC, ETH, AAPL, or general content
  - **Difficulty**: Beginner, Intermediate, Advanced
  - **Type**: Videos, Articles, Courses
- Click cards to access external resources

### 10. **Manage Settings**
- Click your profile icon → Settings
- Update tracked assets
- Change risk profile
- Configure notifications
- Add custom API keys (optional for advanced users)

---

## 📁 Project Structure

```
money-labs/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ChatBot.tsx      # AI chatbot with voice interface
│   │   ├── ExpertPanel.tsx  # Multi-persona advisory system
│   │   ├── PriceWidget.tsx  # Asset price display with predictions
│   │   ├── SocialPulseCard.tsx  # Community sentiment visualizer
│   │   ├── PortfolioAnalysis.tsx
│   │   ├── DailyQuiz.tsx
│   │   ├── MarketNewsFeed.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── BreakingAlerts.tsx
│   │   ├── LearningHub.tsx
│   │   └── ui/              # shadcn-ui components
│   ├── pages/               # Route pages
│   │   ├── Index.tsx        # Landing page
│   │   ├── Auth.tsx         # Login/signup
│   │   ├── Onboarding.tsx   # Asset selection & risk profiling
│   │   ├── Dashboard.tsx    # Main app interface
│   │   ├── Admin.tsx        # Admin panel
│   │   └── NotFound.tsx
│   ├── integrations/supabase/
│   │   ├── client.ts        # Supabase client (auto-generated)
│   │   └── types.ts         # Database types (auto-generated)
│   ├── lib/
│   │   ├── utils.ts         # Utility functions
│   │   └── assetEmojis.ts   # Asset emoji mapping
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── utils/
│   │   └── audioUtils.ts    # Voice AI audio processing
│   ├── index.css            # Tailwind + design tokens
│   ├── main.tsx             # App entry point
│   └── App.tsx              # Root component with routing
├── supabase/
│   ├── functions/           # Edge functions (AI agents)
│   │   ├── chat-analyst/
│   │   ├── asset-analyst/
│   │   ├── expert-panel/
│   │   ├── portfolio-analyzer/
│   │   ├── gemini-voice/
│   │   ├── social-pulse/
│   │   ├── market-insights/
│   │   ├── breaking-alerts/
│   │   ├── daily-quiz/
│   │   ├── evaluate-predictions/
│   │   ├── make-prediction/
│   │   ├── finance-glossary/
│   │   ├── learning-content/
│   │   ├── asset-prices/
│   │   ├── market-news/
│   │   ├── admin-analytics/
│   │   ├── admin-get-users/
│   │   ├── admin-manage-user/
│   │   └── create-welcome-notification/
│   ├── migrations/          # Database migrations (auto-generated)
│   └── config.toml          # Edge function configuration
├── public/
│   └── robots.txt
├── .env                     # Environment variables (auto-generated)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

---

## 🔌 API & Edge Functions Reference

### Public Endpoints (No Auth Required)
| Function | Method | Description |
|----------|--------|-------------|
| `finance-glossary` | POST | Get AI-powered term definitions |
| `learning-content` | GET | Fetch curated educational content |
| `asset-prices` | POST | Get current asset prices |
| `social-pulse` | POST | Community sentiment & price targets |
| `make-prediction` | POST | Submit daily prediction |
| `get-leaderboard` | GET | Fetch top users by points |

### Authenticated Endpoints (JWT Required)
| Function | Method | Description |
|----------|--------|-------------|
| `chat-analyst` | POST | Natural language financial Q&A |
| `asset-analyst` | POST | Personalized asset analysis |
| `expert-panel` | POST | Multi-persona advisory |
| `portfolio-analyzer` | POST | Portfolio diversity & recommendations |
| `gemini-voice` | WebSocket | Real-time voice AI conversations |
| `daily-quiz` | POST | Generate daily quiz questions |
| `market-news` | POST | Fetch personalized market news |
| `breaking-alerts` | POST | Real-time market event detection |
| `create-welcome-notification` | POST | Generate onboarding notifications |

### Admin Endpoints (Admin Role Required)
| Function | Method | Description |
|----------|--------|-------------|
| `admin-analytics` | GET | Platform-wide usage stats |
| `admin-get-users` | GET | List all users with details |
| `admin-manage-user` | POST | Ban/unban users, adjust points |
| `evaluate-predictions` | POST | Manual trigger for prediction evaluation |

### Cron Jobs (Automated)
| Function | Schedule | Description |
|----------|----------|-------------|
| `evaluate-predictions` | Daily at 00:00 UTC | Evaluate yesterday's predictions, award points, send notifications |

---

## 🔮 Future Enhancements

### Social Features
- **Follow System**: Follow top traders and see their predictions
- **Social Feed**: Share predictions and insights with followers
- **Discussion Threads**: Comment on predictions and market events
- **Collaboration Rooms**: Real-time chat with other traders

### Advanced Analytics
- **Performance Metrics**: Win rate, average points per prediction, best/worst assets
- **Historical Charts**: Visualize prediction accuracy over time
- **Backtesting**: Test strategies against historical data
- **Technical Indicators**: Integrate RSI, MACD, Bollinger Bands into analysis

### Trading Simulation
- **Paper Trading**: Simulate real trades with virtual $10,000 starting balance
- **Order Types**: Market, limit, stop-loss orders
- **Trade History**: Track P&L, open positions, closed trades
- **Portfolio Rebalancing**: AI-suggested rebalancing strategies

### Mobile Experience
- **React Native App**: Native iOS/Android apps
- **Push Notifications**: Real-time alerts for predictions, market events
- **Offline Mode**: Cache data for offline access
- **Biometric Auth**: Face ID / Touch ID support

### AI Enhancements
- **Custom AI Personas**: Train custom experts based on your preferences
- **Multi-turn Conversations**: Deeper context across chat sessions
- **Image Analysis**: Upload charts for AI to analyze
- **Sentiment Tracking**: Track AI sentiment over time per asset

### Gamification Expansion
- **More Badges**: Introduce 20+ achievement types (Streak Master, Risk Taker, etc.)
- **Tournaments**: Monthly competitions with prizes
- **Guild System**: Team-based challenges and leaderboards
- **NFT Rewards**: Mint achievements as collectible NFTs

### Data Integrations
- **Brokerage Sync**: Connect Robinhood, Coinbase for real portfolio tracking
- **Calendar Events**: Integrate earnings reports, Fed meetings, etc.
- **Crypto On-chain Data**: Whale wallet tracking, exchange flows
- **Options Data**: Implied volatility, unusual options activity

### Community Tools
- **User-Generated Content**: Share educational posts and tutorials
- **Voting System**: Upvote/downvote predictions and insights
- **Mentorship Program**: Pair beginners with experienced traders
- **Weekly Recap**: Email digest of your performance and market highlights

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode conventions
- Use Tailwind semantic tokens (no hardcoded colors)
- Write descriptive commit messages
- Test edge functions locally before pushing
- Update README for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Lovable** - For the incredible AI-powered development platform
- **Supabase** - For the robust backend infrastructure
- **shadcn-ui** - For the beautiful component library
- **You.com** - For real-time market data API
- **Google Gemini** - For cutting-edge voice AI capabilities
- **OpenAI** - For powerful language models

---

## 📞 Support

- **Documentation**: [https://docs.lovable.dev](https://docs.lovable.dev)
- **Discord Community**: [Lovable Discord](https://discord.com/channels/1119885301872070706)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)

---

**Built with ❤️ using Lovable, Supabase, and cutting-edge AI**

---

## 🎓 Learning Resources

- [Lovable Quickstart Guide](https://docs.lovable.dev/user-guides/quickstart)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Google Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
- [You.com API Documentation](https://documentation.you.com)
- [React 18 Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Last Updated**: 2025-10-28  
**Version**: 1.0.0  
**Project URL**: https://lovable.dev/projects/65789d42-6f10-416f-bbfb-cc507ba9c18a
