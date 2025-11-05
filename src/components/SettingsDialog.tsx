import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Key, ExternalLink, User, Sliders } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAssetEmoji } from "@/lib/assetEmojis";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssets: string[];
  currentRiskProfile: string | null;
  currentProfile?: any;
  onSave: () => void;
}

const ASSETS = [
  { id: "BTC", name: "Bitcoin" },
  { id: "ETH", name: "Ethereum" },
  { id: "USDT", name: "Tether" },
  { id: "XRP", name: "Ripple" },
  { id: "TSLA", name: "Tesla" },
  { id: "AAPL", name: "Apple" },
  { id: "GOOGL", name: "Google" },
  { id: "NVDA", name: "NVIDIA" },
];

const RISK_PROFILES = [
  { id: "cautious", name: "Cautious", emoji: "🌱", description: "Low risk, stable returns" },
  { id: "balanced", name: "Balanced", emoji: "🤝", description: "Moderate risk and reward" },
  { id: "growth", name: "Growth", emoji: "🚀", description: "High risk, high reward" },
];

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'];
const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

export function SettingsDialog({ open, onOpenChange, currentAssets, currentRiskProfile, currentProfile, onSave }: SettingsDialogProps) {
  const [selectedAssets, setSelectedAssets] = useState<string[]>(currentAssets);
  const [selectedRiskProfile, setSelectedRiskProfile] = useState<string | null>(currentRiskProfile);
  
  // Profile fields
  const [displayName, setDisplayName] = useState(currentProfile?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(currentProfile?.avatar_url || "");
  const [bio, setBio] = useState(currentProfile?.bio || "");
  const [ageRange, setAgeRange] = useState(currentProfile?.age_range || "");
  const [experienceLevel, setExperienceLevel] = useState(currentProfile?.experience_level || "beginner");
  
  // Preferences
  const [publicProfile, setPublicProfile] = useState(currentProfile?.public_profile ?? true);
  const [emailNotifications, setEmailNotifications] = useState(currentProfile?.email_notifications ?? true);
  const [currencyPreference, setCurrencyPreference] = useState(currentProfile?.currency_preference || "USD");
  
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [hasGeminiApiKey, setHasGeminiApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSelectedAssets(currentAssets);
    setSelectedRiskProfile(currentRiskProfile);
    if (currentProfile) {
      setDisplayName(currentProfile.display_name || "");
      setAvatarUrl(currentProfile.avatar_url || "");
      setBio(currentProfile.bio || "");
      setAgeRange(currentProfile.age_range || "");
      setExperienceLevel(currentProfile.experience_level || "beginner");
      setPublicProfile(currentProfile.public_profile ?? true);
      setEmailNotifications(currentProfile.email_notifications ?? true);
      setCurrencyPreference(currentProfile.currency_preference || "USD");
    }
    checkForApiKey();
    checkForGeminiApiKey();
  }, [currentAssets, currentRiskProfile, currentProfile, open]);

  const checkForApiKey = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const { data, error } = await supabase
        .from("user_api_keys")
        .select("id")
        .eq("user_id", session.session.user.id)
        .eq("service_name", "you_com")
        .single();

      setHasApiKey(!!data && !error);
    } catch (error) {
      console.error("Error checking for API key:", error);
    }
  };

  const checkForGeminiApiKey = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const { data, error } = await supabase
        .from("user_api_keys")
        .select("id")
        .eq("user_id", session.session.user.id)
        .eq("service_name", "google_gemini")
        .single();

      setHasGeminiApiKey(!!data && !error);
    } catch (error) {
      console.error("Error checking for Gemini API key:", error);
    }
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSavePortfolio = async () => {
    if (selectedAssets.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one asset",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRiskProfile) {
      toast({
        title: "Error",
        description: "Please select a risk profile",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          assets: selectedAssets,
          risk_profile: selectedRiskProfile,
        })
        .eq("user_id", session.session.user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portfolio updated successfully",
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to update portfolio",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonalInfo = async () => {
    if (!displayName.trim() || displayName.length < 2 || displayName.length > 50) {
      toast({
        title: "Error",
        description: "Display name must be between 2 and 50 characters",
        variant: "destructive",
      });
      return;
    }

    if (bio && bio.length > 200) {
      toast({
        title: "Error",
        description: "Bio must be 200 characters or less",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          avatar_url: avatarUrl.trim() || null,
          bio: bio.trim() || null,
          age_range: ageRange || null,
          experience_level: experienceLevel,
        })
        .eq("user_id", session.session.user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Personal information updated successfully",
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving personal info:", error);
      toast({
        title: "Error",
        description: "Failed to update personal information",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          public_profile: publicProfile,
          email_notifications: emailNotifications,
          currency_preference: currencyPreference,
        })
        .eq("user_id", session.session.user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Preferences updated successfully",
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      // Simple encoding for storage (in production, use proper encryption)
      const encodedKey = btoa(apiKey);

      const { error } = await supabase
        .from("user_api_keys")
        .upsert({
          user_id: session.session.user.id,
          service_name: "you_com",
          encrypted_key: encodedKey,
        }, {
          onConflict: "user_id,service_name"
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "API key saved successfully",
      });

      setApiKey("");
      setHasApiKey(true);
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_api_keys")
        .delete()
        .eq("user_id", session.session.user.id)
        .eq("service_name", "you_com");

      if (error) throw error;

      toast({
        title: "Success",
        description: "API key removed successfully",
      });

      setHasApiKey(false);
    } catch (error) {
      console.error("Error removing API key:", error);
      toast({
        title: "Error",
        description: "Failed to remove API key",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeminiApiKey = async () => {
    if (!geminiApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const encodedKey = btoa(geminiApiKey);

      const { error } = await supabase
        .from("user_api_keys")
        .upsert({
          user_id: session.session.user.id,
          service_name: "google_gemini",
          encrypted_key: encodedKey,
        }, {
          onConflict: "user_id,service_name"
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Google Gemini API key saved successfully",
      });

      setGeminiApiKey("");
      setHasGeminiApiKey(true);
    } catch (error) {
      console.error("Error saving Gemini API key:", error);
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveGeminiApiKey = async () => {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_api_keys")
        .delete()
        .eq("user_id", session.session.user.id)
        .eq("service_name", "google_gemini");

      if (error) throw error;

      toast({
        title: "Success",
        description: "Google Gemini API key removed successfully",
      });

      setHasGeminiApiKey(false);
    } catch (error) {
      console.error("Error removing Gemini API key:", error);
      toast({
        title: "Error",
        description: "Failed to remove API key",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your profile settings and API keys
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-6 mt-6">
            {/* Asset Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select Your Assets</Label>
              <p className="text-sm text-muted-foreground">Choose the assets you want to track</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ASSETS.map((asset) => (
                  <Card
                    key={asset.id}
                    className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                      selectedAssets.includes(asset.id)
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => toggleAsset(asset.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{getAssetEmoji(asset.id)}</span>
                      {selectedAssets.includes(asset.id) ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-sm font-medium">{asset.name}</div>
                    <div className="text-xs text-muted-foreground">{asset.id}</div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Risk Profile Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Risk Profile</Label>
              <p className="text-sm text-muted-foreground">Choose your investment approach</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {RISK_PROFILES.map((profile) => (
                  <Card
                    key={profile.id}
                    className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                      selectedRiskProfile === profile.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => setSelectedRiskProfile(profile.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{profile.emoji}</span>
                      {selectedRiskProfile === profile.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="text-sm font-medium mb-1">{profile.name}</div>
                    <div className="text-xs text-muted-foreground">{profile.description}</div>
                  </Card>
                ))}
              </div>
            </div>

            <Button onClick={handleSavePortfolio} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Portfolio"}
            </Button>
          </TabsContent>

          <TabsContent value="personal" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  placeholder="Your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  {displayName.length}/50 characters (shown on leaderboards)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio (optional)</Label>
                <Input
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length}/200 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ageRange">Age Range (optional)</Label>
                <select
                  id="ageRange"
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select age range</option>
                  {AGE_RANGES.map((range) => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experienceLevel">Experience Level</Label>
                <select
                  id="experienceLevel"
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button onClick={handleSavePersonalInfo} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Personal Info"}
            </Button>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Show your profile on public leaderboards
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={publicProfile}
                  onChange={(e) => setPublicProfile(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts and achievement notifications
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Preferred Currency</Label>
                <select
                  id="currency"
                  value={currencyPreference}
                  onChange={(e) => setCurrencyPreference(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button onClick={handleSavePreferences} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Key className="h-5 w-5 mt-1 text-primary" />
                <div className="flex-1">
                  <Label className="text-base font-semibold">You.com API Key</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Provide your own You.com API key for personalized access
                  </p>
                  <a
                    href="https://you.com/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Get API Key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {hasApiKey ? (
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">API Key Configured</p>
                      <p className="text-xs text-muted-foreground">Your API key is securely stored</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveApiKey}
                      disabled={saving}
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder="Enter your You.com API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <Button onClick={handleSaveApiKey} disabled={saving} className="w-full">
                    {saving ? "Saving..." : "Save API Key"}
                  </Button>
                </div>
              )}

              <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                <p className="text-xs text-muted-foreground">
                  🔒 Your API key is encrypted and stored securely. It will be used for your requests to You.com services.
                </p>
              </Card>
            </div>

            {/* Google Gemini API Key Section */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-start gap-3">
                <Key className="h-5 w-5 mt-1 text-primary" />
                <div className="flex-1">
                  <Label className="text-base font-semibold">Google Gemini API Key</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Required for voice chat feature with MoneyBot
                  </p>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Get API Key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {hasGeminiApiKey ? (
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">API Key Configured</p>
                      <p className="text-xs text-muted-foreground">Voice chat is enabled</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveGeminiApiKey}
                      disabled={saving}
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder="Enter your Google Gemini API key"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                  />
                  <Button onClick={handleSaveGeminiApiKey} disabled={saving} className="w-full">
                    {saving ? "Saving..." : "Save API Key"}
                  </Button>
                </div>
              )}

              <Card className="p-4 bg-green-500/10 border-green-500/20">
                <p className="text-xs text-muted-foreground">
                  🎤 This key enables real-time voice conversations with MoneyBot using Google's Gemini Live API.
                </p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
