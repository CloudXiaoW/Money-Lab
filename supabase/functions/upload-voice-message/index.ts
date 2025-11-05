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

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { audioBase64, conversationId, messageId, format = 'webm' } = await req.json();

    if (!audioBase64 || !conversationId || !messageId) {
      throw new Error('Missing required fields: audioBase64, conversationId, messageId');
    }

    // Process audio in chunks to prevent memory issues
    const processBase64Chunks = (base64String: string, chunkSize = 32768) => {
      const chunks: Uint8Array[] = [];
      let position = 0;
      
      while (position < base64String.length) {
        const chunk = base64String.slice(position, position + chunkSize);
        const binaryChunk = atob(chunk);
        const bytes = new Uint8Array(binaryChunk.length);
        
        for (let i = 0; i < binaryChunk.length; i++) {
          bytes[i] = binaryChunk.charCodeAt(i);
        }
        
        chunks.push(bytes);
        position += chunkSize;
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    };

    console.log('Processing audio data...');
    const audioData = processBase64Chunks(audioBase64);
    
    // Upload to Supabase Storage
    const filePath = `${user.id}/voice/${conversationId}/${messageId}.${format}`;
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('voice-messages')
      .upload(filePath, audioData, {
        contentType: format === 'webm' ? 'audio/webm' : 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL (24-hour signed URL)
    const { data: urlData, error: urlError } = await supabaseClient.storage
      .from('voice-messages')
      .createSignedUrl(filePath, 86400); // 24 hours

    if (urlError || !urlData) {
      console.error('URL generation error:', urlError);
      throw urlError || new Error('Failed to generate signed URL');
    }

    const signedUrl = urlData.signedUrl;

    console.log('Audio uploaded successfully:', filePath);

    return new Response(
      JSON.stringify({
        audioUrl: signedUrl,
        filePath,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in upload-voice-message:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
