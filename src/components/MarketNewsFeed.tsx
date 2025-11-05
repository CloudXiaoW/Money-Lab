import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Newspaper, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAssetEmoji } from "@/lib/assetEmojis";

interface NewsItem {
  asset: string;
  headline: string;
  snippet: string;
  source?: string;
  url?: string;
  timestamp?: string;
  error?: boolean;
}

interface MarketNewsFeedProps {
  assets: string[];
}

export const MarketNewsFeed = ({ assets }: MarketNewsFeedProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('market-news', {
        body: {}
      });

      if (error) throw error;

      setNews(data.news);
    } catch (error: any) {
      console.error('Error fetching market news:', error);
      toast({
        title: "Error",
        description: "Failed to fetch market news. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assets.length > 0) {
      fetchNews();
    }
  }, [assets]);


  return (
    <Card className="shadow-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-primary" />
              Market News Feed
            </CardTitle>
            <CardDescription>Latest updates for your assets</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNews}
            disabled={loading}
            className="border-primary/30"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && news.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                  item.error
                    ? 'bg-muted/30 border-muted'
                    : 'bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl mt-1">{getAssetEmoji(item.asset)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-lg leading-tight">
                        {item.headline}
                      </h3>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded whitespace-nowrap">
                        {item.asset}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{item.snippet}</p>
                    {item.source && !item.error && (
                      <div className="flex items-center justify-between">
                        {item.url ? (
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <span>
                              {item.url.includes('coindesk.com') || item.url.includes('yahoo.com')
                                ? `View ${item.asset} news`
                                : 'Read more'
                              }
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {item.source}
                          </span>
                        )}
                        {item.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
