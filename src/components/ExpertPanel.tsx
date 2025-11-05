import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, TrendingUp, Target, ExternalLink, Sparkles } from "lucide-react";

interface ExpertPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXPERTS = [
  {
    id: 'risk_manager',
    name: 'Risk Manager',
    icon: Shield,
    description: 'Conservative advice focused on capital preservation',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'day_trader',
    name: 'Day Trader',
    icon: TrendingUp,
    description: 'Technical analysis and short-term momentum strategies',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'long_term_investor',
    name: 'Long-term Investor',
    icon: Target,
    description: 'Fundamentals-based buy-and-hold strategies',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

export const ExpertPanel = ({ open, onOpenChange }: ExpertPanelProps) => {
  const [selectedExpert, setSelectedExpert] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAskExpert = async () => {
    if (!selectedExpert || !question.trim()) {
      toast({
        title: "Missing information",
        description: "Please select an expert and enter your question.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setAnswer('');
    setSources([]);

    try {
      const { data, error } = await supabase.functions.invoke('expert-panel', {
        body: { 
          expertRole: selectedExpert,
          query: question,
        },
      });

      if (error) throw error;

      setAnswer(data.answer);
      setSources(data.sources || []);

      toast({
        title: `${data.expertName} responded! 🎓`,
        description: "Expert advice ready below",
      });
    } catch (error: any) {
      console.error('Expert panel error:', error);
      
      let errorMessage = "Failed to get expert advice. Please try again.";
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

  const resetPanel = () => {
    setSelectedExpert(null);
    setQuestion('');
    setAnswer('');
    setSources([]);
  };

  const expert = EXPERTS.find(e => e.id === selectedExpert);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Ask an Expert
          </SheetTitle>
          <SheetDescription>
            Get specialized advice from risk managers, traders, and investors
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
          {!selectedExpert ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Choose Your Expert</h3>
              {EXPERTS.map((exp) => (
                <Card 
                  key={exp.id}
                  className={`cursor-pointer transition-all hover:shadow-lg border-2 ${exp.bgColor}`}
                  onClick={() => setSelectedExpert(exp.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <exp.icon className={`w-6 h-6 ${exp.color}`} />
                      {exp.name}
                    </CardTitle>
                    <CardDescription>{exp.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected Expert Header */}
              <Card className={expert?.bgColor}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expert && <expert.icon className={`w-6 h-6 ${expert.color}`} />}
                      <div>
                        <CardTitle>{expert?.name}</CardTitle>
                        <CardDescription>{expert?.description}</CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetPanel}>
                      Change
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Question Input */}
              {!answer && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      Your Question
                    </label>
                    <Textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g., Should I sell BTC after this drop? What's the risk of holding TSLA?"
                      className="min-h-[120px]"
                      disabled={isLoading}
                    />
                  </div>

                  <Button 
                    onClick={handleAskExpert}
                    disabled={!question.trim() || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Consulting expert...
                      </>
                    ) : (
                      <>Ask {expert?.name}</>
                    )}
                  </Button>
                </div>
              )}

              {/* Answer Display */}
              {answer && (
                <div className="space-y-4">
                  <Card className="border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg">Expert Response</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{answer}</p>
                    </CardContent>
                  </Card>

                  {sources.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Sources Used</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {sources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 text-xs hover:text-primary transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold">{source.title}</p>
                              <p className="text-muted-foreground">{source.snippet}</p>
                            </div>
                          </a>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={resetPanel}
                      variant="outline"
                      className="flex-1"
                    >
                      Ask Another Question
                    </Button>
                    <Button 
                      onClick={() => {
                        setQuestion('');
                        setAnswer('');
                        setSources([]);
                      }}
                      className="flex-1"
                    >
                      Follow-up Question
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};