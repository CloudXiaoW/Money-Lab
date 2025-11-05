import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('🚀 Gemini voice function invoked!', {
    method: req.method,
    upgrade: req.headers.get('upgrade'),
    timestamp: new Date().toISOString(),
  });

  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const upgrade = req.headers.get('upgrade') || '';
    
    if (upgrade.toLowerCase() !== 'websocket') {
      console.log('❌ Not a WebSocket request');
      return new Response('Expected WebSocket', { status: 426 });
    }

    console.log('✅ WebSocket upgrade request received');

    const { socket, response } = Deno.upgradeWebSocket(req);
    
    let geminiWs: WebSocket | null = null;
    let userId: string | null = null;
    let userAssets: string[] = [];
    let riskProfile: string = 'balanced';

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle authentication
        if (message.type === 'auth') {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          const { data: { user }, error: authError } = await supabase.auth.getUser(message.token);
          
          if (authError || !user) {
            socket.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
            socket.close();
            return;
          }

          userId = user.id;

          // Fetch user's Google Gemini API key
          const { data: apiKeyData, error: keyError } = await supabase
            .from('user_api_keys')
            .select('encrypted_key')
            .eq('user_id', userId)
            .eq('service_name', 'google_gemini')
            .single();

          if (keyError || !apiKeyData) {
            socket.send(JSON.stringify({ 
              type: 'error', 
              message: 'No Google Gemini API key found. Please add one in Settings.' 
            }));
            socket.close();
            return;
          }

          const apiKey = atob(apiKeyData.encrypted_key);
          console.log('✅ API key retrieved successfully');

          // Fetch user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('assets, risk_profile')
            .eq('user_id', userId)
            .single();

          if (profileData) {
            userAssets = profileData.assets || [];
            riskProfile = profileData.risk_profile || 'balanced';
            console.log(`User profile: ${riskProfile} investor, tracking ${userAssets.length} assets`);
          }

          // Connect to Gemini Live API
          const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
          console.log('Connecting to Gemini Live API...');
          geminiWs = new WebSocket(geminiUrl);

          geminiWs.onopen = () => {
            console.log('✅ Connected to Gemini Live API');
            
            // Send setup message
            const systemInstructions = `You are MoneyBot, a friendly financial assistant helping a ${riskProfile} investor who tracks: ${userAssets.join(', ')}.

Provide clear, concise insights about finance, markets, and investing. Tailor advice to their risk profile. Keep responses under 150 words for natural conversation flow.

When they ask about their assets (${userAssets.join(', ')}), provide personalized analysis. Be encouraging and educational.`;

            console.log('Sending setup configuration to Gemini...');
            geminiWs!.send(JSON.stringify({
              setup: {
                model: 'models/gemini-2.0-flash-exp',
                generationConfig: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: {
                        voiceName: 'Aoede'
                      }
                    }
                  }
                },
                systemInstruction: {
                  parts: [{ text: systemInstructions }]
                },
                tools: [],
                clientControl: {
                  enableInterruption: true
                }
              }
            }));
            console.log('Setup message sent with client control enabled');
          };

          geminiWs.onmessage = async (geminiEvent) => {
            try {
              // Check if message is binary (Blob or ArrayBuffer)
              if (geminiEvent.data instanceof Blob) {
                console.log('🔊 Received binary audio Blob from Gemini');
                const arrayBuffer = await geminiEvent.data.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // Convert to base64
                let binary = '';
                const chunkSize = 0x8000;
                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                  const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
                  binary += String.fromCharCode.apply(null, Array.from(chunk));
                }
                const base64Audio = btoa(binary);
                
                socket.send(JSON.stringify({
                  type: 'serverContent',
                  audio: base64Audio
                }));
                return;
              } else if (geminiEvent.data instanceof ArrayBuffer) {
                console.log('🔊 Received binary audio ArrayBuffer from Gemini');
                const uint8Array = new Uint8Array(geminiEvent.data);
                
                // Convert to base64
                let binary = '';
                const chunkSize = 0x8000;
                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                  const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
                  binary += String.fromCharCode.apply(null, Array.from(chunk));
                }
                const base64Audio = btoa(binary);
                
                socket.send(JSON.stringify({
                  type: 'serverContent',
                  audio: base64Audio
                }));
                return;
              }

              // Handle JSON messages
              if (typeof geminiEvent.data === 'string') {
                const geminiMessage = JSON.parse(geminiEvent.data);
                console.log('📨 Message from Gemini:', geminiMessage.setupComplete ? 'setupComplete' : geminiMessage.serverContent ? 'serverContent' : 'other');
                
                if (geminiMessage.setupComplete) {
                  console.log('✅ Gemini setup complete');
                  socket.send(JSON.stringify({ type: 'setupComplete' }));
                } else if (geminiMessage.error) {
                  console.error('❌ Gemini API error:', geminiMessage.error);
                  socket.send(JSON.stringify({ 
                    type: 'error', 
                    message: `Gemini API error: ${geminiMessage.error.message || 'Unknown error'}` 
                  }));
                } else if (geminiMessage.serverContent) {
                  console.log('🔊 Forwarding audio content to client');
                  // Extract audio and text from response
                  const parts = geminiMessage.serverContent.modelTurn?.parts || [];
                  
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      socket.send(JSON.stringify({
                        type: 'serverContent',
                        audio: part.inlineData.data,
                        transcript: part.text || ''
                      }));
                    } else if (part.text) {
                      socket.send(JSON.stringify({
                        type: 'serverContent',
                        transcript: part.text
                      }));
                    }
                  }
                } else if (geminiMessage.toolCall) {
                  // Future: Handle function calling
                  socket.send(JSON.stringify({ type: 'toolCall', data: geminiMessage.toolCall }));
                } else if (geminiMessage.serverContent?.turnComplete) {
                  socket.send(JSON.stringify({ type: 'turnComplete' }));
                }
              } else {
                console.warn('⚠️ Received unknown message type:', typeof geminiEvent.data);
              }
            } catch (error) {
              console.error('❌ Error processing Gemini message:', error, 'Data type:', typeof geminiEvent.data);
              socket.send(JSON.stringify({ 
                type: 'error', 
                message: 'Error processing AI response' 
              }));
            }
          };

          geminiWs.onerror = (error) => {
            console.error('❌ Gemini WebSocket error:', error);
            socket.send(JSON.stringify({ 
              type: 'error', 
              message: 'Connection to AI service failed. Please check your API key.' 
            }));
          };

          geminiWs.onclose = (event) => {
            console.log('Gemini WebSocket closed:', event.code, event.reason);
            if (event.code === 1008) {
              socket.send(JSON.stringify({ 
                type: 'error', 
                message: 'Invalid API key. Please update your Google Gemini API key in Settings.' 
              }));
            }
            socket.close();
          };
        } else if (message.type === 'clientContent' && geminiWs) {
          // Client finished speaking, send turn completion signal
          console.log('📨 Received turn complete signal from client');
          geminiWs.send(JSON.stringify({
            clientContent: {
              turns: [{ role: 'user' }],
              turnComplete: true
            }
          }));
          console.log('✅ Turn complete signal sent to Gemini');
        } else if (message.realtimeInput && geminiWs) {
          // Forward audio to Gemini
          geminiWs.send(JSON.stringify(message));
        }
      } catch (error) {
        console.error('Message handling error:', error);
        socket.send(JSON.stringify({ type: 'error', message: 'Message processing error' }));
      }
    };

    socket.onclose = () => {
      console.log('Client WebSocket closed');
      if (geminiWs) {
        geminiWs.close();
      }
    };

    socket.onerror = (error) => {
      console.error('Client WebSocket error:', error);
      if (geminiWs) {
        geminiWs.close();
      }
    };

    return response;
  } catch (error) {
    console.error('WebSocket upgrade error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
