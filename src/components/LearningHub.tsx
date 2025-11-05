import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Video, Image as ImageIcon, ExternalLink, RefreshCw } from "lucide-react";

interface LearningHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userAssets?: string[];
  riskProfile?: string;
}

export const LearningHub = ({ open, onOpenChange, userAssets = [], riskProfile = 'balanced' }: LearningHubProps) => {
  const [content, setContent] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');

  const fetchContent = async (contentType?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('learning-content', {
        body: { 
          asset: userAssets[0], // Focus on first asset for now
          contentType,
          riskProfile,
        },
      });

      if (error) throw error;

      setContent(data.content || []);
    } catch (error) {
      console.error('Error fetching learning content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchContent();
    }
  }, [open]);

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    if (tab !== 'all') {
      fetchContent(tab);
    } else {
      fetchContent();
    }
  };

  const filterContent = (type?: string) => {
    if (!type || type === 'all') return content;
    return content.filter(c => c.content_type === type);
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'chart': return ImageIcon;
      case 'video': return Video;
      case 'infographic': return ImageIcon;
      default: return BookOpen;
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/10 text-green-500';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-500';
      case 'advanced': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Learning Hub
              </DialogTitle>
              <DialogDescription>
                Charts, videos, and guides personalized for {riskProfile} investors
              </DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => fetchContent(selectedTab === 'all' ? undefined : selectedTab)}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="chart">Charts</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="infographic">Guides</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <TabsContent value={selectedTab} className="space-y-4 mt-0">
                {filterContent(selectedTab === 'all' ? undefined : selectedTab).length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No content available yet</p>
                    <p className="text-xs mt-1">Check back soon for new learning materials!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filterContent(selectedTab === 'all' ? undefined : selectedTab).map((item, idx) => {
                      const Icon = getContentIcon(item.content_type);
                      return (
                        <Card key={idx} className="overflow-hidden hover:shadow-lg transition-shadow">
                          {item.thumbnail_url && (
                            <div className="aspect-video bg-muted relative overflow-hidden">
                              <img 
                                src={item.thumbnail_url} 
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm line-clamp-2">{item.title}</CardTitle>
                              <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                            </div>
                            {item.asset && (
                              <Badge variant="secondary" className="w-fit">{item.asset}</Badge>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {item.description && (
                              <CardDescription className="text-xs line-clamp-2">
                                {item.description}
                              </CardDescription>
                            )}
                            <div className="flex items-center justify-between">
                              {item.difficulty && (
                                <Badge className={getDifficultyColor(item.difficulty)}>
                                  {item.difficulty}
                                </Badge>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};