import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ASSETS = [
  { id: "BTC", name: "Bitcoin", symbol: "BTC" },
  { id: "ETH", name: "Ethereum", symbol: "ETH" },
  { id: "USDT", name: "Tether", symbol: "USDT" },
  { id: "XRP", name: "Ripple", symbol: "XRP" },
  { id: "TSLA", name: "Tesla", symbol: "TSLA" },
];

const RISK_PROFILES = [
  { id: "cautious", name: "Cautious", emoji: "🌱", description: "Steady and secure" },
  { id: "balanced", name: "Balanced", emoji: "🤝", description: "Mix of stability and growth" },
  { id: "growth", name: "Growth", emoji: "🚀", description: "High potential, higher risk" },
];

const Onboarding = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<string>("");
  const [showWelcome, setShowWelcome] = useState(false);
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
      // Extract name from email (before @)
      const name = session.user.email?.split('@')[0] || "Friend";
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
      
      // Check if profile already exists with data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profile && profile.assets && profile.assets.length > 0 && profile.risk_profile) {
        // Already completed onboarding, go to dashboard
        navigate("/dashboard");
      }
      
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

  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSubmit = async () => {
    if (!displayName.trim() || displayName.length < 2 || displayName.length > 50) {
      toast({
        variant: "destructive",
        title: "Enter your name",
        description: "Display name must be between 2 and 50 characters",
      });
      return;
    }

    if (selectedAssets.length === 0) {
      toast({
        variant: "destructive",
        title: "Select at least one asset",
        description: "Choose which assets you want to follow",
      });
      return;
    }

    if (!selectedRisk) {
      toast({
        variant: "destructive",
        title: "Select a risk profile",
        description: "Choose your investment approach",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          assets: selectedAssets,
          risk_profile: selectedRisk,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Create welcome notifications
      try {
        await supabase.functions.invoke('create-welcome-notification');
      } catch (notifError) {
        console.error('Error creating welcome notifications:', notifError);
        // Don't block onboarding if notifications fail
      }

      setShowWelcome(true);
      
      // Show welcome message then redirect
      setTimeout(() => {
        navigate("/dashboard");
      }, 2500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving preferences",
        description: error.message,
      });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="max-w-md shadow-2xl border-border/50 text-center">
          <CardContent className="pt-12 pb-12 space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="h-20 w-20 text-primary animate-pulse" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Welcome to Money Labs, {userName}! 🧪
              </h2>
              <p className="text-lg text-muted-foreground">
                Ready to play and learn!
              </p>
            </div>
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="container mx-auto max-w-2xl py-12">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Let's Get Started 🧪
          </h1>
          <p className="text-muted-foreground text-lg">
            Tell us about your preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Display Name */}
          <Card className="shadow-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-2xl">What should we call you?</CardTitle>
              <CardDescription>This name will appear on leaderboards and achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {displayName.length}/50 characters
              </p>
            </CardContent>
          </Card>

          {/* Asset Selection */}
          <Card className="shadow-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-2xl">Which assets do you want to follow?</CardTitle>
              <CardDescription>Select all that interest you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {ASSETS.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      selectedAssets.includes(asset.id)
                        ? "border-primary bg-primary/10 shadow-lg scale-105"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-center space-y-2">
                      <div className="text-3xl font-bold">{asset.symbol}</div>
                      <div className="text-sm text-muted-foreground">{asset.name}</div>
                      {selectedAssets.includes(asset.id) && (
                        <CheckCircle2 className="h-5 w-5 mx-auto text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Profile Selection */}
          <Card className="shadow-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-2xl">What's your risk profile?</CardTitle>
              <CardDescription>Choose your investment approach</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {RISK_PROFILES.map((risk) => (
                  <button
                    key={risk.id}
                    onClick={() => setSelectedRisk(risk.id)}
                    className={`w-full p-6 rounded-lg border-2 transition-all text-left ${
                      selectedRisk === risk.id
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{risk.emoji}</span>
                        <div>
                          <div className="font-bold text-lg">{risk.name}</div>
                          <div className="text-sm text-muted-foreground">{risk.description}</div>
                        </div>
                      </div>
                      {selectedRisk === risk.id && (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleSubmit}
              disabled={saving || !displayName.trim() || selectedAssets.length === 0 || !selectedRisk}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all shadow-lg text-lg px-12 py-6"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Complete Setup 🚀"
              )}
            </Button>
          </div>

          {/* Selection Summary */}
          {(displayName.trim() || selectedAssets.length > 0 || selectedRisk) && (
            <Card className="shadow-xl border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Your selections:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {displayName.trim() && (
                      <Badge variant="secondary" className="text-sm">
                        👤 {displayName}
                      </Badge>
                    )}
                    {selectedAssets.map(assetId => (
                      <Badge key={assetId} variant="secondary" className="text-sm">
                        {ASSETS.find(a => a.id === assetId)?.symbol}
                      </Badge>
                    ))}
                    {selectedRisk && (
                      <Badge variant="default" className="text-sm">
                        {RISK_PROFILES.find(r => r.id === selectedRisk)?.emoji}{" "}
                        {RISK_PROFILES.find(r => r.id === selectedRisk)?.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
