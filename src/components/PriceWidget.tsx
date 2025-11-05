import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PriceData {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  lastUpdate: string;
}

interface PriceWidgetProps {
  asset: string;
  emoji?: string;
  user?: any;
  onRefresh?: () => void;
}

export const PriceWidget = ({ asset, emoji = "📈", user, onRefresh }: PriceWidgetProps) => {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = async () => {
    // Don't fetch if user not authenticated yet
    if (!user) {
      console.log('Waiting for authentication before fetching prices...');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Explicitly ensure we have a session before calling the function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No valid session available');
        setError('Authentication required');
        setLoading(false);
        return;
      }

      console.log('Calling asset-prices with authenticated session for', asset);

      const { data, error: functionError } = await supabase.functions.invoke('asset-prices', {
        body: { assets: [asset] }
      });

      if (functionError) throw functionError;

      if (data && data[asset]) {
        setPriceData(data[asset]);
      } else {
        throw new Error('No price data received');
      }
    } catch (err) {
      console.error(`Error fetching price for ${asset}:`, err);
      setError('Failed to load price');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch prices when user is authenticated
    if (user) {
      fetchPrice();
      
      // Auto-refresh every 30 minutes
      const interval = setInterval(fetchPrice, 1800000);
      
      return () => clearInterval(interval);
    }
  }, [asset, user]);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(price);
  };

  const formatCompactPrice = (price: number) => {
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}K`;
    }
    return `$${price.toFixed(0)}`;
  };

  if (loading) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
      </Card>
    );
  }

  if (error || !priceData) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold">{emoji} {asset}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{error || 'No data available'}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPrice}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }

  const isPositive = priceData.change24h >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const changeBgColor = isPositive ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950';

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-semibold">{emoji} {asset}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            fetchPrice();
            onRefresh?.();
          }}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-3xl font-bold">
          {formatPrice(priceData.price)}
        </div>

        <div className={`flex items-center gap-2 ${changeBgColor} ${changeColor} px-2 py-1 rounded-md w-fit`}>
          {isPositive ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
          <span className="font-semibold">
            {isPositive ? '+' : ''}{priceData.change24h.toFixed(2)}%
          </span>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>24h Range:</span>
            <span className="font-medium">
              {formatCompactPrice(priceData.low24h)} - {formatCompactPrice(priceData.high24h)}
            </span>
          </div>
          {priceData.volume24h !== 'N/A' && (
            <div className="flex justify-between">
              <span>Volume:</span>
              <span className="font-medium">${priceData.volume24h}</span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Last updated: {new Date(priceData.lastUpdate).toLocaleTimeString()}
        </div>
      </div>
    </Card>
  );
};
