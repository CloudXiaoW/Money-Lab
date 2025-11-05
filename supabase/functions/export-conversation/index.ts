import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { conversationId, format = 'json', bookmarkedOnly = false } = await req.json();

    if (!conversationId) {
      throw new Error('conversationId is required');
    }

    // Fetch conversation
    const { data: conversation, error: convError } = await supabaseClient
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    // Fetch messages
    let query = supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('timestamp', { ascending: true });

    if (bookmarkedOnly) {
      query = query.eq('is_bookmarked', true);
    }

    const { data: messages, error: msgError } = await query;

    if (msgError) {
      throw new Error('Failed to fetch messages');
    }

    let responseData: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        // CSV format
        const csvHeader = 'Timestamp,Role,Content,Type,Bookmarked,Asset,Note\n';
        const csvRows = messages.map(m => {
          const content = m.content.replace(/"/g, '""');
          return `"${m.timestamp}","${m.role}","${content}","${m.message_type}","${m.is_bookmarked}","${m.asset || ''}","${m.bookmark_note || ''}"`;
        }).join('\n');
        responseData = csvHeader + csvRows;
        contentType = 'text/csv';
        filename = `conversation_${conversationId}.csv`;
        break;

      case 'markdown':
        // Markdown format
        let markdown = `# ${conversation.title}\n\n`;
        markdown += `**Date**: ${new Date(conversation.created_at).toLocaleDateString()}\n\n`;
        markdown += `---\n\n`;
        
        for (const msg of messages) {
          const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const roleName = msg.role === 'user' ? 'You' : 'MoneyBot';
          const bookmark = msg.is_bookmarked ? ' ⭐' : '';
          const voiceIcon = msg.message_type === 'voice' ? ' 🎤' : '';
          
          markdown += `## ${roleName} (${time})${bookmark}${voiceIcon}\n\n`;
          markdown += `${msg.content}\n\n`;
          
          if (msg.bookmark_note) {
            markdown += `> **Note**: ${msg.bookmark_note}\n\n`;
          }
          
          if (msg.asset) {
            markdown += `*Asset: ${msg.asset}*\n\n`;
          }
          
          markdown += `---\n\n`;
        }
        
        responseData = markdown;
        contentType = 'text/markdown';
        filename = `conversation_${conversationId}.md`;
        break;

      case 'json':
      default:
        // JSON format
        responseData = JSON.stringify({
          conversation,
          messages,
          exported_at: new Date().toISOString(),
          message_count: messages.length,
          bookmarked_count: messages.filter(m => m.is_bookmarked).length,
        }, null, 2);
        contentType = 'application/json';
        filename = `conversation_${conversationId}.json`;
        break;
    }

    return new Response(responseData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error in export-conversation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
