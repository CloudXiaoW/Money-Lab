import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Cyber grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(200_100%_60%_/_0.18),_transparent_60%),radial-gradient(circle_at_bottom,_hsl(268_83%_65%_/_0.18),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,_hsl(220_20%_20%_/_0.45)_1px,_transparent_1px),linear-gradient(to_bottom,_hsl(220_20%_20%_/_0.45)_1px,_transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative text-center space-y-10 max-w-3xl mx-auto">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-black/40 px-4 py-1 text-xs tracking-[0.2em] uppercase text-primary/80 backdrop-blur-md">
            GameFi · DeFi · Education
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight bg-[radial-gradient(circle_at_top,_hsl(200_100%_70%),_hsl(268_83%_70%))] bg-clip-text text-transparent drop-shadow-[0_0_25px_hsl(200_100%_60%_/_0.35)]">
            Money Labs
            <span className="ml-2 align-middle text-3xl md:text-4xl">🧪</span>
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Turn your market intuition into an ever-leveling game. Predict, earn XP, and simulate real finance—no real money at risk.
          </p>
        </div>

        {/* Key highlights */}
        <div className="mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-xs md:text-sm text-muted-foreground">
          <div className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 backdrop-blur-md border border-primary/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live market sentiment & AI analysis
          </div>
          <div className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 backdrop-blur-md border border-accent/30">
            🎮 Prediction points · Leaderboard · Achievements
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="glow-button text-lg px-10 py-6 rounded-full"
          >
            Start Playing · Climb the Leaderboard 🚀
          </Button>
          <Button
            onClick={() => navigate("/auth")}
            variant="outline"
            size="lg"
            className="border-2 border-primary/40 hover:bg-primary/10/80 text-lg px-8 py-6 rounded-full backdrop-blur-md bg-black/40"
          >
            I have an account — Log in
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs md:text-sm text-muted-foreground/80">
          Practice real decisions with virtual points · No real money at risk · Education & gameplay only.
        </p>
      </div>
    </div>
  );
};

export default Index;
