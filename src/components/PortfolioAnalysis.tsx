import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Lightbulb, TrendingUp, PieChart } from "lucide-react";

interface PortfolioAnalysisProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PortfolioAnalysis = ({ open, onOpenChange }: PortfolioAnalysisProps) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchAnalysis = async () => {
    setIsLoading(true);
    console.log('🔍 Invoking portfolio-analyzer function...');
    
    try {
      const { data, error } = await supabase.functions.invoke('portfolio-analyzer');
      console.log('📊 Portfolio analyzer response:', { 
        hasData: !!data, 
        hasError: !!error,
        error: error?.message,
        dataKeys: data ? Object.keys(data) : []
      });

      if (error) throw error;

      setAnalysis(data);

      if (data.cached) {
        toast({
          title: "Portfolio Analysis Ready! 📊",
          description: "Showing recent analysis (updates every 24 hours)",
        });
      } else {
        toast({
          title: "Fresh Analysis Complete! 🎯",
          description: "Your portfolio has been analyzed",
        });
      }
    } catch (error: any) {
      console.error('Portfolio analysis error:', error);
      
      let errorMessage = "Failed to analyze portfolio. Please try again.";
      if (error.message?.includes('429')) {
        errorMessage = "Rate limit exceeded. Please wait a moment.";
      } else if (error.message?.includes('402')) {
        errorMessage = "Credits depleted. Please add credits to continue.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && !analysis) {
      fetchAnalysis();
    }
    onOpenChange(isOpen);
  };

  const getDiversityColor = (score: number) => {
    if (score >= 7) return "text-green-500";
    if (score >= 4) return "text-yellow-500";
    return "text-red-500";
  };

  const getRiskEmoji = (risk: string) => {
    const map: Record<string, string> = {
      cautious: "🌱",
      balanced: "🤝",
      aggressive: "🚀",
    };
    return map[risk] || "📊";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Portfolio Health Check
          </DialogTitle>
          <DialogDescription>
            AI-powered analysis of your portfolio's strengths, weaknesses, and opportunities
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing your portfolio...</p>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Diversity Score */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Portfolio Diversity Score</span>
                  <Badge className={getDiversityColor(analysis.diversity_score)}>
                    {analysis.diversity_score}/10
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={analysis.diversity_score * 10} className="h-3" />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Risk Level:</span>
                  <Badge variant="outline">
                    {getRiskEmoji(analysis.risk_level)} {analysis.risk_level}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Asset Breakdown */}
            {analysis.categories && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Asset Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(analysis.categories).map(([category, assets]: [string, any]) => (
                    assets.length > 0 && (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm capitalize font-medium">{category}</span>
                        <div className="flex gap-1">
                          {assets.map((asset: string) => (
                            <Badge key={asset} variant="secondary">{asset}</Badge>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Strengths */}
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{analysis.strengths}</p>
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{analysis.weaknesses}</p>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-500" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{analysis.recommendations}</p>
              </CardContent>
            </Card>

            {analysis.cached && (
              <p className="text-xs text-center text-muted-foreground">
                Analysis cached. Updates every 24 hours.
              </p>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setAnalysis(null);
                  fetchAnalysis();
                }}
                variant="outline"
                className="flex-1"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Refresh Analysis
              </Button>
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};