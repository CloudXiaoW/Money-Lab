import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

interface Alert {
  id: string;
  asset: string;
  headline: string;
  snippet: string;
  url: string;
  severity: 'critical' | 'high' | 'medium';
  dismissed: boolean;
  created_at: string;
}

interface BreakingAlertsProps {
  userId: string;
  onAlertsUpdate: (count: number) => void;
}

export const BreakingAlerts = ({ userId, onAlertsUpdate }: BreakingAlertsProps) => {
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [alertQueue, setAlertQueue] = useState<Alert[]>([]);

  const checkAlerts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('breaking-alerts');

      if (error) throw error;

      const alerts = data.alerts || [];
      const unreadAlerts = alerts.filter((a: Alert) => !a.dismissed);

      onAlertsUpdate(unreadAlerts.length);

      if (unreadAlerts.length > 0 && !currentAlert) {
        setAlertQueue(unreadAlerts);
        setCurrentAlert(unreadAlerts[0]);
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  };

  useEffect(() => {
    // Check immediately on mount
    checkAlerts();

    // Then check every 30 minutes
    const interval = setInterval(checkAlerts, 1800000);

    return () => clearInterval(interval);
  }, [userId]);

  const handleDismiss = async () => {
    if (!currentAlert) return;

    try {
      await supabase
        .from('market_alerts')
        .update({ dismissed: true })
        .eq('id', currentAlert.id);

      // Show next alert in queue
      const remaining = alertQueue.slice(1);
      setAlertQueue(remaining);
      setCurrentAlert(remaining.length > 0 ? remaining[0] : null);
      onAlertsUpdate(remaining.length);
    } catch (error) {
      console.error('Error dismissing alert:', error);
      setCurrentAlert(null);
    }
  };

  const handleViewMore = () => {
    if (currentAlert) {
      window.open(currentAlert.url, '_blank', 'noopener,noreferrer');
    }
    handleDismiss();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-6 h-6" />;
      case 'high':
        return <TrendingDown className="w-6 h-6" />;
      default:
        return <TrendingUp className="w-6 h-6" />;
    }
  };

  if (!currentAlert) return null;

  return (
    <AlertDialog open={!!currentAlert} onOpenChange={() => handleDismiss()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${getSeverityColor(currentAlert.severity)} text-white`}>
              {getSeverityIcon(currentAlert.severity)}
            </div>
            <div className="flex-1">
              <Badge variant="outline" className="mb-1">
                {currentAlert.asset}
              </Badge>
              <AlertDialogTitle className="text-lg">
                🚨 {currentAlert.severity === 'critical' ? 'Critical' : 'Important'} Market Alert
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left">
            <p className="font-semibold text-foreground mb-2">{currentAlert.headline}</p>
            <p className="text-sm">{currentAlert.snippet}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(currentAlert.created_at).toLocaleTimeString()}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogAction onClick={handleDismiss} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Dismiss
          </AlertDialogAction>
          <AlertDialogAction onClick={handleViewMore}>
            Read Full Article
          </AlertDialogAction>
        </AlertDialogFooter>
        {alertQueue.length > 1 && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            {alertQueue.length - 1} more alert{alertQueue.length - 1 !== 1 ? 's' : ''} waiting
          </p>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};