import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Database row type (what comes from Supabase)
interface DbMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  content: string;
  message_type: string;
  audio_url: string | null;
  audio_duration_ms: number | null;
  is_bookmarked: boolean;
  bookmark_note: string | null;
  bookmark_tags: string[] | null;
  asset: string | null;
  sources: any | null;
  timestamp: string;
  deleted_at: string | null;
}

// Application message type
export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: 'text' | 'voice';
  audio_url?: string;
  audio_duration_ms?: number;
  is_bookmarked: boolean;
  bookmark_note?: string;
  bookmark_tags?: string[];
  asset?: string;
  sources?: any;
  timestamp: string;
  deleted_at?: string;
}

// Helper to convert DB row to Message
const toMessage = (dbMessage: DbMessage): Message => ({
  ...dbMessage,
  role: dbMessage.role as 'user' | 'assistant' | 'system',
  message_type: dbMessage.message_type as 'text' | 'voice',
  audio_url: dbMessage.audio_url || undefined,
  audio_duration_ms: dbMessage.audio_duration_ms || undefined,
  bookmark_note: dbMessage.bookmark_note || undefined,
  bookmark_tags: dbMessage.bookmark_tags || undefined,
  asset: dbMessage.asset || undefined,
  deleted_at: dbMessage.deleted_at || undefined,
});

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export const useConversation = () => {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Load all conversations
  const loadConversations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(toMessage));
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error loading messages",
        description: "Failed to load conversation history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Create new conversation
  const createConversation = useCallback(async (title?: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: title || 'New Conversation',
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentConversationId(data.id);
      await loadConversations();
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive"
      });
      return null;
    }
  }, [loadConversations, toast]);

  // Add message (text or voice)
  const addMessage = useCallback(async (
    content: string,
    role: 'user' | 'assistant',
    options?: {
      messageType?: 'text' | 'voice';
      audioUrl?: string;
      audioDuration?: number;
      asset?: string;
      sources?: any;
    }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create conversation if none exists
      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation();
        if (!convId) return;
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: convId,
          user_id: user.id,
          role,
          content,
          message_type: options?.messageType || 'text',
          audio_url: options?.audioUrl,
          audio_duration_ms: options?.audioDuration,
          asset: options?.asset,
          sources: options?.sources,
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistic update
      setMessages(prev => [...prev, toMessage(data as DbMessage)]);

      // Auto-generate title from first message
      if (role === 'user' && messages.length === 0) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await supabase
          .from('conversations')
          .update({ title })
          .eq('id', convId);
        await loadConversations();
      }

      return data;
    } catch (error) {
      console.error('Error adding message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  }, [currentConversationId, createConversation, loadConversations, messages.length, toast]);

  // Toggle bookmark
  const toggleBookmark = useCallback(async (messageId: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const { error } = await supabase
        .from('chat_messages')
        .update({ is_bookmarked: !message.is_bookmarked })
        .eq('id', messageId);

      if (error) throw error;

      // Optimistic update
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, is_bookmarked: !m.is_bookmarked } : m
        )
      );

      toast({
        title: message.is_bookmarked ? "Removed from bookmarks" : "Bookmarked",
        description: message.is_bookmarked ? "Message removed from My Lab" : "Message saved to My Lab"
      });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive"
      });
    }
  }, [messages, toast]);

  // Update bookmark note
  const updateBookmarkNote = useCallback(async (messageId: string, note: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ bookmark_note: note })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, bookmark_note: note } : m
        )
      );
    } catch (error) {
      console.error('Error updating bookmark note:', error);
    }
  }, []);

  // Switch conversation
  const switchConversation = useCallback(async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    await loadMessages(conversationId);
  }, [loadMessages]);

  // Set up realtime subscription
  useEffect(() => {
    if (!currentConversationId) return;

    const channel = supabase
      .channel(`conversation:${currentConversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${currentConversationId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = toMessage(payload.new as DbMessage);
            setMessages(prev => {
              // Avoid duplicates
              if (prev.find(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = toMessage(payload.new as DbMessage);
            setMessages(prev =>
              prev.map(m =>
                m.id === updatedMessage.id ? updatedMessage : m
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversationId]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    currentConversationId,
    messages,
    conversations,
    isLoading,
    isSyncing,
    loadMessages,
    createConversation,
    addMessage,
    toggleBookmark,
    updateBookmarkNote,
    switchConversation,
    loadConversations,
  };
};
