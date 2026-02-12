import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/onboarding");
      }
    };
    checkUser();
  }, [navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Check your email 📧",
        description: "Password reset link has been sent to your email",
      });
      setIsForgotPassword(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset email",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back! 🧪",
          description: "Successfully logged in to Money Labs",
        });
        navigate("/onboarding");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
          },
        });

        if (error) throw error;

        toast({
          title: "Account created! 🎉",
          description: "Welcome to Money Labs",
        });
        navigate("/onboarding");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An error occurred during authentication",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Neon grid + glow background */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(200_100%_60%_/_0.25),_transparent_55%),radial-gradient(circle_at_bottom,_hsl(268_83%_65%_/_0.25),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,_hsl(220_20%_20%_/_0.45)_1px,_transparent_1px),linear-gradient(to_bottom,_hsl(220_20%_20%_/_0.45)_1px,_transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-[radial-gradient(circle_at_top,_hsl(200_100%_70%),_hsl(268_83%_70%))] bg-clip-text text-transparent drop-shadow-[0_0_22px_hsl(200_100%_60%_/_0.35)] mb-1">
            Money Labs
            <span className="ml-1 align-middle text-2xl">🧪</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Sign in to your GameFi lab. Keep your prediction streak and unlock more achievements.
          </p>
        </div>

        <Card className="glow-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {isForgotPassword ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-center">
              {isForgotPassword
                ? "Enter your email to receive a reset link"
                : isLogin
                ? "Login to continue your experiments"
                : "Sign up to start experimenting"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isForgotPassword ? handleForgotPassword : handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="transition-all focus:ring-2 focus:ring-primary"
                />
              </div>
              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="transition-all focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
              <Button
                type="submit"
                className="w-full glow-button rounded-full mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isForgotPassword ? (
                  "Send Reset Link 📧"
                ) : isLogin ? (
                  "Login to Money Labs 🧪"
                ) : (
                  "Sign Up for Money Labs 🧪"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            {isForgotPassword ? (
              <Button
                variant="ghost"
                onClick={() => setIsForgotPassword(false)}
                className="w-full"
              >
                Back to login
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setIsLogin(!isLogin)}
                  className="w-full text-xs md:text-sm"
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Login"}
                </Button>
                {isLogin && (
                  <Button
                    variant="link"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs md:text-sm text-muted-foreground"
                  >
                    Forgot password?
                  </Button>
                )}
              </>
            )}
          </CardFooter>
        </Card>
        <p className="mt-4 text-xs text-center text-muted-foreground/80">
          For learning and simulation only. Not investment advice.
        </p>
      </div>
    </div>
  );
};

export default Auth;
