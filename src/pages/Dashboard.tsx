import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, Settings, LogOut, Award, Flame, Trophy, Star, Target, Zap, Crown, Shield, MessageCircle, Brain, BookOpen, Library, ExternalLink, Radio, RefreshCw } from "lucide-react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { getAssetEmoji } from "@/lib/assetEmojis";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotificationBell } from "@/components/NotificationBell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatBot } from "@/components/ChatBot";
import { FinanceGlossary } from "@/components/FinanceGlossary";
import { MarketNewsFeed } from "@/components/MarketNewsFeed";
import { SocialPulseCard } from "@/components/SocialPulseCard";
import DailyQuiz from "@/components/DailyQuiz";
import { PriceWidget } from "@/components/PriceWidget";
import { ExpertPanel } from "@/components/ExpertPanel";
import { BreakingAlerts } from "@/components/BreakingAlerts";
import { PortfolioAnalysis } from "@/components/PortfolioAnalysis";
import { LearningHub } from "@/components/LearningHub";

interface MarketInsight {
  asset: string;
  news: string;
  sentiment: string;
  sentimentText: string;
  technicalTip: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar_url?: string | null;
  points: number;
  streak: number;
  badges: number;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [todaysPredictions, setTodaysPredictions] = useState<string[]>([]);
  const [marketInsights, setMarketInsights] = useState<Record<string, MarketInsight>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [explainModal, setExplainModal] = useState<{ open: boolean; content: string }>({
    open: false,
    content: "",
  });
  const [analystModal, setAnalystModal] = useState<{ 
    open: boolean; 
    asset: string; 
    explanation: string; 
    loading: boolean;
    sources: Array<{ title: string; url: string; snippet: string }>;
    hasRealTimeData: boolean;
    timestamp: string;
  }>({
    open: false,
    asset: "",
    explanation: "",
    loading: false,
    sources: [],
    hasRealTimeData: false,
    timestamp: "",
  });
  const [predictionModal, setPredictionModal] = useState<{ open: boolean; asset: string }>({
    open: false,
    asset: "",
  });
  const [chatBotOpen, setChatBotOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [submittingPrediction, setSubmittingPrediction] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizStatus, setQuizStatus] = useState<{ completed: boolean; score: number | null }>({ completed: false, score: null });
  const [priceRefreshKey, setPriceRefreshKey] = useState(0);
  const [expertPanelOpen, setExpertPanelOpen] = useState(false);
  const [portfolioAnalysisOpen, setPortfolioAnalysisOpen] = useState(false);
  const [learningHubOpen, setLearningHubOpen] = useState(false);
  const [alertsCount, setAlertsCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('all_time');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!profileData || !profileData.assets || profileData.assets.length === 0) {
        navigate("/onboarding");
        return;
      }

      setProfile(profileData);

      // Fetch user stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      setUserStats(statsData);

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!roleData);

      // Fetch today's predictions
      const today = new Date().toISOString().split('T')[0];
      const { data: predictionsData } = await supabase
        .from('predictions')
        .select('asset')
        .eq('user_id', session.user.id)
        .eq('prediction_date', today);

      setTodaysPredictions(predictionsData?.map(p => p.asset) || []);

      // Fetch market insights for each asset
      await fetchMarketInsights(profileData.assets);

      // Fetch leaderboard
      await fetchLeaderboard();

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchMarketInsights = async (assets: string[]) => {
    setInsightsLoading(true);
    const insights: Record<string, MarketInsight> = {};
    
    for (const asset of assets) {
      try {
        const { data, error } = await supabase.functions.invoke('market-insights', {
          body: { asset },
        });

        if (error) throw error;
        insights[asset] = data;
      } catch (error: any) {
        console.error(`Error fetching insights for ${asset}:`, error);
      }
    }

    setMarketInsights(insights);
    setInsightsLoading(false);
  };

  const fetchLeaderboard = async (period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time') => {
    try {
      const { data, error } = await supabase.functions.invoke('get-leaderboard', {
        body: { period }
      });
      if (error) throw error;
      setLeaderboard(data.leaderboard);
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const checkQuizStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('daily-quiz', {
        body: { action: 'check_status' }
      });

      if (error) throw error;

      setQuizStatus({
        completed: data.completed,
        score: data.score
      });
    } catch (error) {
      console.error('Error checking quiz status:', error);
    }
  };

  const openPredictionModal = (asset: string) => {
    setPredictionModal({ open: true, asset });
  };

  const handlePrediction = async (prediction: string) => {
    setSubmittingPrediction(true);
    const asset = predictionModal.asset;

    try {
      const { data, error } = await supabase.functions.invoke('make-prediction', {
        body: { asset, prediction },
      });

      if (error) throw error;

      const predictionEmoji = 
        prediction === 'up' ? '📈' : 
        prediction === 'down' ? '📉' : 
        '➡️';

      toast({
        title: "Prediction recorded! 🎯",
        description: `You predicted ${asset} will go ${prediction} ${predictionEmoji}. Keep your streak alive!`,
      });

      // Update local state
      setTodaysPredictions([...todaysPredictions, asset]);
      if (data.newStreak) {
        setUserStats((prev: any) => ({
          ...prev,
          current_streak: data.newStreak,
        }));
      }

      setPredictionModal({ open: false, asset: "" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record prediction",
      });
    } finally {
      setSubmittingPrediction(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const openExplainModal = (content: string) => {
    setExplainModal({ open: true, content });
  };

  const openAnalystModal = async (asset: string) => {
    setAnalystModal({ 
      open: true, 
      asset, 
      explanation: "", 
      loading: true,
      sources: [],
      hasRealTimeData: false,
      timestamp: "",
    });

    try {
      const { data, error } = await supabase.functions.invoke('asset-analyst', {
        body: { asset },
      });

      if (error) throw error;

      setAnalystModal(prev => ({ 
        ...prev, 
        explanation: data.explanation,
        sources: data.sources || [],
        hasRealTimeData: data.hasRealTimeData || false,
        timestamp: data.timestamp || "",
        loading: false,
      }));

      if (data.hasRealTimeData) {
        toast({
          title: "Real-time Analysis Ready! 📊",
          description: "Analysis powered by live market data",
        });
      }
    } catch (error: any) {
      console.error('Error fetching analyst insight:', error);
      setAnalystModal(prev => ({
        ...prev,
        explanation: 'Unable to fetch market analysis at this time. Please try again later.',
        loading: false,
      }));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch analyst insight",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getRiskEmoji = (risk: string) => {
    const riskMap: Record<string, string> = {
      cautious: "🌱",
      balanced: "🤝",
      growth: "🚀",
    };
    return riskMap[risk] || "📊";
  };

  const allBadges = [
    { id: 'first_prediction', name: 'First Prediction', icon: Star, description: 'Make your first prediction' },
    { id: 'accuracy_10', name: '10 Accurate', icon: Target, description: 'Make 10 accurate predictions' },
    { id: 'streak_7', name: '7-Day Streak', icon: Flame, description: 'Maintain a 7-day prediction streak' },
    { id: 'streak_30', name: '30-Day Streak', icon: Zap, description: 'Maintain a 30-day prediction streak' },
    { id: 'top_3', name: 'Top 3', icon: Trophy, description: 'Reach top 3 on the leaderboard' },
    { id: 'legendary', name: 'Legendary', icon: Crown, description: 'Reach #1 on the leaderboard' },
    { id: 'quiz_master', name: 'Quiz Master', icon: Brain, description: 'Get a perfect score on a quiz' },
    { id: 'quiz_streak_7', name: 'Quiz Streak', icon: Zap, description: 'Complete 7 daily quizzes in a row' },
    { id: 'knowledge_seeker', name: 'Knowledge Seeker', icon: BookOpen, description: 'Complete 30 total quizzes' },
  ];

  const userBadges = userStats?.badges || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Money Labs 🧪
          </h1>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <Button variant="outline" size="sm" onClick={() => setExpertPanelOpen(true)}>
              🎓 Ask Expert
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPortfolioAnalysisOpen(true)}>
              💼 Analyze Portfolio
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLearningHubOpen(true)}>
              <BookOpen className="h-4 w-4 mr-2" />
              Learn
            </Button>
            <Button variant="outline" size="sm" onClick={() => setChatBotOpen(true)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              MoneyBot
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Message */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold">
            Welcome back, {profile?.display_name || 'Investor'}! 👋
          </h2>
          <p className="text-muted-foreground">Ready to make some smart predictions?</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="shadow-lg border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Points</p>
                  <p className="text-3xl font-bold text-primary">{userStats?.points || 0}</p>
                </div>
                <Award className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-3xl font-bold text-accent">{userStats?.current_streak || 0} days</p>
                </div>
                <Flame className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Risk Profile</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getRiskEmoji(profile?.risk_profile)}</span>
                    <span className="text-lg font-semibold capitalize">{profile?.risk_profile}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Quiz Card */}
        <Card className="shadow-lg border-border/50 mb-8 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Brain className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-lg font-semibold">Daily Knowledge Quiz 🧪</p>
                  {quizStatus.completed ? (
                    <p className="text-sm text-muted-foreground">
                      Completed today! Score: {quizStatus.score}/3 ✅
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Test your knowledge and earn bonus points</p>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => setQuizDialogOpen(true)}
                disabled={quizStatus.completed}
                className="min-w-[120px]"
              >
                {quizStatus.completed ? '✅ Complete' : 'Take Quiz'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Prices Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">📊 Live Prices</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPriceRefreshKey(prev => prev + 1)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <PriceWidget 
                key={`BTC-${priceRefreshKey}`}
                asset="BTC" 
                emoji={getAssetEmoji("BTC")}
                user={user}
                onRefresh={() => setPriceRefreshKey(prev => prev + 1)}
              />
              <PriceWidget 
                key={`ETH-${priceRefreshKey}`}
                asset="ETH" 
                emoji={getAssetEmoji("ETH")}
                user={user}
                onRefresh={() => setPriceRefreshKey(prev => prev + 1)}
              />
              <PriceWidget 
                key={`USDT-${priceRefreshKey}`}
                asset="USDT" 
                emoji={getAssetEmoji("USDT")}
                user={user}
                onRefresh={() => setPriceRefreshKey(prev => prev + 1)}
              />
              <PriceWidget 
                key={`XRP-${priceRefreshKey}`}
                asset="XRP" 
                emoji={getAssetEmoji("XRP")}
                user={user}
                onRefresh={() => setPriceRefreshKey(prev => prev + 1)}
              />
          </div>
        </div>

        {/* Community Pulse Section */}
        {profile?.assets && profile.assets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Radio className="h-6 w-6 text-primary" />
              Community Pulse
            </h2>
            <p className="text-muted-foreground mb-4">
              Real-time sentiment and price targets from social media
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.assets.map((asset: string) => (
                <SocialPulseCard key={`social-${asset}`} asset={asset} />
              ))}
            </div>
          </div>
        )}

        {/* Market News Feed */}
        <div className="mb-8">
          <MarketNewsFeed assets={profile?.assets || []} />
        </div>

        {/* Asset Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Assets</h2>
          {insightsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile?.assets?.map((asset: string) => {
                const insight = marketInsights[asset];
                const hasPredictedToday = todaysPredictions.includes(asset);

                return (
                  <Card key={asset} className="shadow-xl border-border/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl">{asset}</CardTitle>
                        <span className="text-4xl">{insight?.sentiment || "📊"}</span>
                      </div>
                      <CardDescription className="capitalize">
                        Sentiment: {insight?.sentimentText || "Loading..."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">📰 Latest News</p>
                        <p className="text-sm">{insight?.news || "Loading market news..."}</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-muted-foreground">💡 Technical Tip</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openExplainModal(insight?.technicalTip || "")}
                            className="text-xs"
                          >
                            Learn more
                          </Button>
                        </div>
                        <p className="text-sm">{insight?.technicalTip || "Loading..."}</p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAnalystModal(asset)}
                        className="w-full mb-2 border-primary/20 hover:bg-primary/10"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Why did {asset} move? 💡
                      </Button>

                      {hasPredictedToday ? (
                        <div className="bg-primary/10 p-4 rounded-lg text-center border border-primary/20">
                          <p className="text-sm font-semibold text-primary mb-1">✅ Prediction Complete</p>
                          <p className="text-xs text-muted-foreground">Come back tomorrow for more predictions!</p>
                        </div>
                      ) : (
                        <Button
                          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                          onClick={() => openPredictionModal(asset)}
                        >
                          Make Prediction 🎯
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Achievement Badges */}
        <Card className="shadow-xl border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Your Achievements
            </CardTitle>
            <CardDescription>Unlock badges by completing challenges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {allBadges.map((badge) => {
                const isUnlocked = userBadges.includes(badge.id);
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-primary/20 to-accent/20 border-primary/50 shadow-lg'
                        : 'bg-muted/30 border-border/30 opacity-50 grayscale'
                    }`}
                  >
                    <div className={`p-3 rounded-full mb-2 ${isUnlocked ? 'bg-primary/20' : 'bg-muted'}`}>
                      <Icon className={`h-6 w-6 ${isUnlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <p className={`text-xs font-semibold text-center mb-1 ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {badge.name}
                    </p>
                    <p className="text-xs text-center text-muted-foreground">{badge.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="shadow-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Leaderboard 🏆
            </CardTitle>
            <CardDescription>See how you rank against other players</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={leaderboardPeriod} 
              onValueChange={(value) => {
                setLeaderboardPeriod(value as typeof leaderboardPeriod);
                fetchLeaderboard(value as typeof leaderboardPeriod);
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="all_time">All-Time</TabsTrigger>
              </TabsList>

              {leaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Loading leaderboard...</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-16 text-center">Rank</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-center">Streak</TableHead>
                        <TableHead className="text-center">Badges</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry) => (
                    <TableRow
                      key={entry.rank}
                      className={entry.rank <= 3 ? 'bg-gradient-to-r from-primary/10 to-accent/10' : ''}
                    >
                      <TableCell className="text-center font-bold text-xl">
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={entry.avatar_url || undefined} alt={entry.name} />
                            <AvatarFallback className="text-xs">
                              {entry.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{entry.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Flame className="h-4 w-4 text-accent" />
                          <span>{entry.streak}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-semibold">
                          {entry.badges}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-bold">
                          {entry.points}
                        </Badge>
                      </TableCell>
                    </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Explanation Modal */}
      <Dialog open={explainModal.open} onOpenChange={(open) => setExplainModal({ ...explainModal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Technical Explanation</DialogTitle>
            <DialogDescription>{explainModal.content}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Analyst Insight Modal */}
      <Dialog open={analystModal.open} onOpenChange={(open) => setAnalystModal({ ...analystModal, open })}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
                Analyst Insight: {analystModal.asset}
              </DialogTitle>
              {analystModal.hasRealTimeData && !analystModal.loading && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Radio className="h-3 w-3" />
                  Real-time
                </Badge>
              )}
            </div>
            <DialogDescription>
              {analystModal.timestamp && !analystModal.loading && (
                <span className="text-xs">
                  Analysis from {new Date(analystModal.timestamp).toLocaleString()}
                </span>
              )}
              {!analystModal.timestamp && "Understanding recent market movements"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {analystModal.loading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-muted-foreground">Fetching real-time market data...</span>
                <span className="text-xs text-muted-foreground">Analyzing with AI...</span>
              </div>
            ) : (
              <>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <p className="text-sm leading-relaxed whitespace-pre-line">{analystModal.explanation}</p>
                </div>

                {analystModal.sources.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Sources
                    </h4>
                    {analystModal.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                              {source.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {source.snippet}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
              <p className="text-xs text-muted-foreground">
                💡 This analysis is provided for educational purposes. Always do your own research before making investment decisions.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prediction Modal */}
      <Dialog open={predictionModal.open} onOpenChange={(open) => setPredictionModal({ ...predictionModal, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Make Your Prediction 🎯
            </DialogTitle>
            <DialogDescription>
              What do you think {predictionModal.asset} will do in the next 24 hours?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-semibold">How predictions work:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Make one prediction per asset per day</li>
                <li>• Correct predictions earn you points</li>
                <li>• Daily predictions keep your streak alive 🔥</li>
                <li>• Climb the leaderboard and earn badges 🏆</li>
              </ul>
            </div>

            {marketInsights[predictionModal.asset] && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <p className="text-sm font-semibold mb-2">Current Sentiment:</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-2xl">{marketInsights[predictionModal.asset].sentiment}</span>
                  <span className="capitalize">{marketInsights[predictionModal.asset].sentimentText}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold">Your prediction:</p>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handlePrediction("up")}
                  disabled={submittingPrediction}
                  className="flex-col h-auto py-4 hover:bg-green-500/10 hover:border-green-500 hover:scale-105 transition-all"
                >
                  <span className="text-3xl mb-1">📈</span>
                  <span className="text-sm font-semibold">Up</span>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handlePrediction("neutral")}
                  disabled={submittingPrediction}
                  className="flex-col h-auto py-4 hover:bg-blue-500/10 hover:border-blue-500 hover:scale-105 transition-all"
                >
                  <span className="text-3xl mb-1">➡️</span>
                  <span className="text-sm font-semibold">Stable</span>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handlePrediction("down")}
                  disabled={submittingPrediction}
                  className="flex-col h-auto py-4 hover:bg-red-500/10 hover:border-red-500 hover:scale-105 transition-all"
                >
                  <span className="text-3xl mb-1">📉</span>
                  <span className="text-sm font-semibold">Down</span>
                </Button>
              </div>
            </div>

            {submittingPrediction && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording your prediction...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Quiz Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={(open) => {
        setQuizDialogOpen(open);
        if (!open) {
          // Refresh quiz status and user stats when dialog closes
          checkQuizStatus();
          // Refetch user stats to reflect any points earned
          supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data) setUserStats(data);
            });
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DailyQuiz />
        </DialogContent>
      </Dialog>

      {/* ChatBot */}
      <ChatBot
        open={chatBotOpen} 
        onOpenChange={setChatBotOpen}
        userAssets={profile?.assets || []}
      />

      {/* Finance Glossary */}
      <FinanceGlossary 
        open={glossaryOpen}
        onOpenChange={setGlossaryOpen}
      />

      {/* New Features */}
      <BreakingAlerts userId={user.id} onAlertsUpdate={setAlertsCount} />
      <ExpertPanel open={expertPanelOpen} onOpenChange={setExpertPanelOpen} />
      <PortfolioAnalysis open={portfolioAnalysisOpen} onOpenChange={setPortfolioAnalysisOpen} />
      <LearningHub 
        open={learningHubOpen} 
        onOpenChange={setLearningHubOpen}
        userAssets={profile?.assets || []}
        riskProfile={profile?.risk_profile}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentAssets={profile?.assets || []}
        currentRiskProfile={profile?.risk_profile || null}
        currentProfile={profile}
        onSave={async () => {
          // Refetch profile and market insights
          const { data: session } = await supabase.auth.getSession();
          if (session.session?.user) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("user_id", session.session.user.id)
              .single();
            
            if (profileData) {
              setProfile(profileData);
              if (profileData.assets && profileData.assets.length > 0) {
                fetchMarketInsights(profileData.assets);
              }
            }
          }
        }}
      />
    </div>
  );
};

export default Dashboard;
