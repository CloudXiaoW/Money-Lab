import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, RefreshCw, Users } from "lucide-react";

interface SocialPulseCardProps {
  asset: string;
}

export const SocialPulseCard = ({ asset }: SocialPulseCardProps) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSocialPulse = async () => {
    setIsLoading(true);
    try {
      const { data: pulseData, error } = await supabase.functions.invoke('social-pulse', {
        body: { asset },
      });

      if (error) throw error;

      setData(pulseData);
    } catch (error) {
      console.error('Error fetching social pulse:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialPulse();
  }, [asset]);

  if (isLoading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const isMockData = data.is_mock || false;
  const isBullish = data.bullish_percent >= 50;
  const sentiment = isBullish ? 'Bullish' : 'Bearish';
  const sentimentIcon = isBullish ? TrendingUp : TrendingDown;
  const sentimentColor = isBullish ? 'text-green-500' : 'text-red-500';
  const SentimentIcon = sentimentIcon;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Community Pulse</CardTitle>
            {isMockData && (
              <Badge variant="secondary" className="text-xs">
                Demo Mode
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={fetchSocialPulse}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          {isMockData 
            ? `Simulated community data for ${asset}`
            : `What the crowd thinks about ${asset}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sentiment Gauge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={sentimentColor}>
              <SentimentIcon className="w-3 h-3 mr-1" />
              {sentiment} {data.bullish_percent}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              {data.sample_size} sources
            </span>
          </div>
          <Progress 
            value={data.bullish_percent} 
            className="h-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Bearish {data.bearish_percent}%</span>
            <span>Bullish {data.bullish_percent}%</span>
          </div>
        </div>

        {/* Price Target */}
        {data.avg_target > 0 && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground mb-1">Community Price Target</p>
            <p className="text-2xl font-bold">
              ${data.avg_target.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isBullish ? '🚀' : '📉'} Community thinks {asset} will {isBullish ? 'rise' : 'fall'}
            </p>
          </div>
        )}

        {/* Sources Preview */}
        {data.sources && data.sources.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold">Recent Mentions:</p>
            {data.sources.slice(0, 2).map((source: any, idx: number) => (
              <div key={idx} className="text-xs">
                <Badge variant="secondary" className="mr-1">{source.platform}</Badge>
                <span className="text-muted-foreground">{source.snippet.substring(0, 80)}...</span>
              </div>
            ))}
          </div>
        )}

        {data.cached && (
          <p className="text-xs text-center text-muted-foreground">
            Updated every 4 hours
          </p>
        )}
      </CardContent>
    </Card>
  );
};