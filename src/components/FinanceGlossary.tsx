import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, BookOpen, ExternalLink, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface GlossaryEntry {
  term: string;
  definition: string;
  sources: Array<{ title: string; url: string }>;
  timestamp: string;
}

interface FinanceGlossaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTED_TERMS = [
  "RSI", "MACD", "Bull Market", "Bear Market", "Market Cap",
  "DCA", "HODL", "Whale", "Gas Fees", "Staking"
];

export const FinanceGlossary = ({ open, onOpenChange }: FinanceGlossaryProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<GlossaryEntry | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { toast } = useToast();

  const lookupTerm = async (term: string) => {
    if (!term.trim() || isLoading) return;

    setIsLoading(true);
    setCurrentEntry(null);

    try {
      const { data, error } = await supabase.functions.invoke('finance-glossary', {
        body: { term: term.trim() }
      });

      if (error) {
        throw error;
      }

      setCurrentEntry(data);
      
      // Add to search history (avoid duplicates)
      setSearchHistory(prev => {
        const filtered = prev.filter(t => t.toLowerCase() !== term.toLowerCase());
        return [term, ...filtered].slice(0, 5);
      });

    } catch (error: any) {
      console.error('Glossary lookup error:', error);
      
      let errorMessage = "Failed to look up term. Please try again.";
      if (error.message?.includes('429')) {
        errorMessage = "Rate limit exceeded. Please wait a moment before searching again.";
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

  const handleSearch = () => {
    lookupTerm(searchTerm);
  };

  const handleSuggestedTerm = (term: string) => {
    setSearchTerm(term);
    lookupTerm(term);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Finance Glossary
          </DialogTitle>
          <DialogDescription>
            Look up any financial term with real-time definitions and examples
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for any finance term (e.g., RSI, DCA, Bull Market)..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={!searchTerm.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-4">
          {!currentEntry && !isLoading && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold mb-3 text-muted-foreground">Popular Terms</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_TERMS.map((term) => (
                    <Button
                      key={term}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestedTerm(term)}
                      className="text-xs"
                    >
                      {term}
                    </Button>
                  ))}
                </div>
              </div>

              {searchHistory.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-3 text-muted-foreground">Recent Searches</p>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((term, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => handleSuggestedTerm(term)}
                      >
                        {term}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center text-muted-foreground py-8">
                <BookOpen className="w-12 h-12 mx-auto mb-2 text-primary/50" />
                <p>Search for any financial term to get started!</p>
                <p className="text-xs mt-2">Powered by real-time data sources</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Searching authoritative sources...</p>
            </div>
          )}

          {currentEntry && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold">{currentEntry.term}</h3>
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Real-time
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated: {new Date(currentEntry.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap m-0">{currentEntry.definition}</p>
                </div>
              </div>

              {currentEntry.sources && currentEntry.sources.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Sources:</p>
                  <div className="space-y-1">
                    {currentEntry.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:underline text-primary hover:text-primary/80 transition-colors p-2 rounded-md hover:bg-muted/50"
                      >
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        <span className="line-clamp-1">{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setCurrentEntry(null);
                  setSearchTerm("");
                }}
                className="w-full"
              >
                Search Another Term
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
