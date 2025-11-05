import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Bot, Star, Trash2, Sparkles, ExternalLink, Mic, MessageSquare, Download, Copy, StarOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceInterface } from "./VoiceInterface";
import { useConversation } from "@/hooks/useConversation";
import { AudioPlayer } from "./AudioPlayer";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Local UI message type
interface UIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  asset?: string;
  source?: "ai" | "realtime";
  sources?: Array<{ title: string; url: string }>;
}

interface ChatBotProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userAssets?: string[];
}

export const ChatBot = ({ open, onOpenChange, userAssets = [] }: ChatBotProps) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [riskProfile, setRiskProfile] = useState<string>("");
  const [voiceMode, setVoiceMode] = useState(false);
  const { toast } = useToast();
  
  // Use the new conversation hook
  const {
    currentConversationId,
    messages: dbMessages,
    conversations,
    isLoading: loadingMessages,
    addMessage,
    toggleBookmark,
    createConversation,
    switchConversation,
  } = useConversation();

  // Fetch user profile for personalization
  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('risk_profile')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setRiskProfile(profile.risk_profile || 'balanced');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUserProfile();
      // Create conversation if needed
      if (!currentConversationId) {
        createConversation();
      }
    }
  }, [open, currentConversationId, createConversation]);

  // Detect asset mentions in user input
  const detectAsset = (text: string): string | undefined => {
    const upperText = text.toUpperCase();
    return userAssets.find(asset => upperText.includes(asset));
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const detectedAsset = detectAsset(input);
    const userContent = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Add user message to DB
      await addMessage(userContent, 'user', {
        asset: detectedAsset,
        messageType: 'text',
      });

      // Get AI response
      const { data, error } = await supabase.functions.invoke('chat-analyst', {
        body: { message: userContent }
      });

      if (error) throw error;

      // Add assistant response to DB
      await addMessage(data.response, 'assistant', {
        asset: detectedAsset,
        messageType: 'text',
        sources: data.sources || [],
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      
      let errorMessage = "Failed to get response. Please try again.";
      if (error.message?.includes('429')) {
        errorMessage = "Rate limit exceeded. Please wait a moment before asking again.";
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

  const handleExport = async (format: 'json' | 'csv' | 'markdown') => {
    if (!currentConversationId) return;

    try {
      const { data, error } = await supabase.functions.invoke('export-conversation', {
        body: {
          conversationId: currentConversationId,
          format,
          bookmarkedOnly: false,
        },
      });

      if (error) throw error;

      // Create download
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/markdown' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Exported!",
        description: `Conversation exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export conversation",
        variant: "destructive",
      });
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get bookmarked messages for "My Lab" tab
  const bookmarkedMessages = dbMessages.filter(m => m.is_bookmarked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[700px] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                MoneyBot - Ask Analyst
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span>Ask me about {userAssets.join(', ')} or any finance topic!</span>
                {userAssets.length > 0 && riskProfile && (
                  <Badge variant="outline" className="ml-2">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {userAssets.join(', ')} · {riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1)} Investor
                  </Badge>
                )}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('markdown')}>
                    Export as Markdown
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant={voiceMode ? "default" : "outline"}
                size="sm"
                onClick={() => setVoiceMode(!voiceMode)}
              >
                {voiceMode ? (
                  <>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Text
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-1" />
                    Voice
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="bookmarks">
              My Lab ({bookmarkedMessages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-4">
            {voiceMode ? (
              <VoiceInterface
                userAssets={userAssets}
                riskProfile={riskProfile}
                conversationId={currentConversationId || undefined}
                onError={(error) => {
                  toast({
                    title: "Voice Error",
                    description: error,
                    variant: "destructive",
                  });
                }}
              />
            ) : (
              <>
                <ScrollArea className="flex-1 pr-4 max-h-[450px]">
                  <div className="space-y-4">
                    {dbMessages.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="w-12 h-12 mx-auto mb-2 text-primary/50" />
                        <p>Start by asking a question about your assets or finance!</p>
                        <p className="text-xs mt-2">Try: "What's the sentiment for BTC?"</p>
                      </div>
                    )}
                    
                    {dbMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {msg.asset && msg.role === "user" && (
                            <Badge variant="secondary" className="mb-2">
                              {msg.asset}
                            </Badge>
                          )}
                          
                          {msg.message_type === 'voice' && (
                            <Badge variant="outline" className="mb-2">
                              <Mic className="w-3 h-3 mr-1" />
                              Voice Message
                            </Badge>
                          )}
                          
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          
                          {msg.message_type === 'voice' && msg.audio_url && (
                            <div className="mt-2">
                              <AudioPlayer 
                                audioUrl={msg.audio_url} 
                                duration={msg.audio_duration_ms}
                                compact
                              />
                            </div>
                          )}
                          
                          {msg.sources && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-semibold opacity-70">Sources:</p>
                              {msg.sources.map((source: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs hover:underline opacity-70 hover:opacity-100"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {source.title}
                                </a>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <p className="text-xs opacity-70">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleBookmark(msg.id)}
                                className="h-6 px-2 hover:bg-primary/20"
                              >
                                {msg.is_bookmarked ? (
                                  <Star className="h-3 w-3 fill-current" />
                                ) : (
                                  <StarOff className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyMessage(msg.content)}
                                className="h-6 px-2 hover:bg-primary/20"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {(isLoading || loadingMessages) && (
                      <div className="flex gap-3 justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="flex gap-2 pt-4 border-t">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your assets or investing strategies..."
                    className="min-h-[60px] max-h-[120px]"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="h-[60px] w-[60px]"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="bookmarks" className="flex-1 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {bookmarkedMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Star className="w-12 h-12 mx-auto mb-2 text-primary/50" />
                  <p>No bookmarked messages yet</p>
                  <p className="text-xs mt-2">Click the star icon on messages to bookmark them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookmarkedMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary">
                          {msg.role === 'user' ? 'You' : 'MoneyBot'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBookmark(msg.id)}
                          className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                      
                      {msg.asset && (
                        <Badge variant="outline" className="mb-2">
                          {msg.asset}
                        </Badge>
                      )}
                      
                      {msg.message_type === 'voice' && (
                        <Badge variant="outline" className="mb-2 ml-1">
                          <Mic className="w-3 h-3 mr-1" />
                          Voice
                        </Badge>
                      )}
                      
                      <p className="text-sm mb-2">{msg.content}</p>
                      
                      {msg.message_type === 'voice' && msg.audio_url && (
                        <div className="mb-2">
                          <AudioPlayer 
                            audioUrl={msg.audio_url}
                            duration={msg.audio_duration_ms}
                          />
                        </div>
                      )}
                      
                      {msg.bookmark_note && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          <strong>Note:</strong> {msg.bookmark_note}
                        </div>
                      )}
                      
                      <span className="text-xs text-muted-foreground mt-2 block">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
