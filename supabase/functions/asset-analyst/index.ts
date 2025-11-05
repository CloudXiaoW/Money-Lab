import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asset, question } = await req.json();

    if (!asset) {
      throw new Error('Asset is required');
    }

    // Initialize Supabase client
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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    let riskProfile = 'balanced'; // default
    if (user && !authError) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('risk_profile')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profile?.risk_profile) {
        riskProfile = profile.risk_profile;
      }
    }

    console.log('Fetching real-time data for', asset, 'with risk profile:', riskProfile);

    // Fetch real-time market data from You.com
    const youComApiKey = Deno.env.get('YOU_COM_API_KEY');
    let marketContext = '';
    let sources: Array<{ title: string; url: string; snippet: string; timestamp: string }> = [];
    let hasRealTimeData = false;

    if (youComApiKey) {
      try {
        const searchQuery = `${asset} price movement market news today`;
        const youComResponse = await fetch(`https://api.ydc-index.io/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'X-API-Key': youComApiKey,
          },
        });

        if (youComResponse.ok) {
          const youComData = await youComResponse.json();
          
          if (youComData.hits && youComData.hits.length > 0) {
            hasRealTimeData = true;
            
            // Extract top 3 relevant sources
            sources = youComData.hits.slice(0, 3).map((hit: any) => ({
              title: hit.title || 'Market Update',
              url: hit.url || '',
              snippet: hit.snippets?.[0] || hit.description || '',
              timestamp: new Date().toISOString(),
            }));

            // Build context for AI
            marketContext = `\n\nREAL-TIME MARKET DATA:\n${sources.map((s, i) => 
              `[${i + 1}] ${s.title}\n${s.snippet}`
            ).join('\n\n')}`;
            
            console.log('Successfully fetched real-time data from You.com');
          }
        }
      } catch (youComError) {
        console.error('You.com API error:', youComError);
        // Continue without real-time data
      }
    }

    const query = question || `Why did ${asset} move in the market recently?`;
    
    const systemPrompt = `You are a knowledgeable financial analyst who explains market movements in clear, accessible language. 

USER CONTEXT:
- Risk Profile: ${riskProfile}
- Tailor your explanation to be ${riskProfile === 'cautious' ? 'conservative and risk-aware' : riskProfile === 'growth' ? 'growth-oriented and opportunity-focused' : 'balanced'}.

${hasRealTimeData ? 'Use the real-time market data provided to give a factual, current analysis.' : 'Provide educational insights based on typical market behavior patterns.'}

Keep your explanation under 200 words and make it accessible to someone learning about investing.`;

    // Call Lovable AI for analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: query + marketContext,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const explanation = aiData.choices?.[0]?.message?.content || 'Unable to generate analysis at this time.';

    console.log('Generated enhanced analysis for', asset);

    return new Response(
      JSON.stringify({ 
        asset,
        explanation,
        sources,
        hasRealTimeData,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in asset-analyst:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        explanation: 'Unable to fetch market analysis at this time. Please try again later.',
        sources: [],
        hasRealTimeData: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
