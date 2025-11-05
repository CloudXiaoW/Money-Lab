import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPERT_PERSONAS = {
  risk_manager: {
    name: 'Risk Manager',
    systemPrompt: `You are a professional Risk Manager specializing in downside protection and capital preservation.
Your expertise includes:
- Position sizing and portfolio allocation
- Stop-loss strategies and risk management
- Volatility analysis and hedging techniques
- Portfolio stress testing
- Capital preservation during market downturns

Provide conservative, risk-aware advice focused on protecting capital. Always mention potential risks and suggest protective measures.
Keep responses under 250 words. Be cautious but not fearful.`,
  },
  day_trader: {
    name: 'Day Trader',
    systemPrompt: `You are an experienced Day Trader specializing in short-term technical analysis and momentum trading.
Your expertise includes:
- Technical indicators (RSI, MACD, Bollinger Bands)
- Chart patterns and price action
- Volume analysis and market momentum
- Entry/exit timing strategies
- Intraday volatility management

Provide actionable, timing-focused advice for short-term trades. Focus on technical setups and market momentum.
Keep responses under 250 words. Be precise about timing and levels.`,
  },
  long_term_investor: {
    name: 'Long-term Investor',
    systemPrompt: `You are a seasoned Long-term Investor following value investing and fundamentals-based strategies.
Your expertise includes:
- Fundamental analysis and company valuation
- Economic trends and sector analysis
- Buy-and-hold strategies
- Dividend investing and compounding
- Portfolio diversification for long-term growth

Provide patient, fundamentals-based advice focused on long-term wealth building. Emphasize quality over timing.
Keep responses under 250 words. Be thoughtful and strategic.`,
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { expertRole, query, conversationHistory = [] } = await req.json();

    if (!expertRole || !query) {
      throw new Error('Expert role and query are required');
    }

    if (!EXPERT_PERSONAS[expertRole as keyof typeof EXPERT_PERSONAS]) {
      throw new Error('Invalid expert role');
    }

    console.log(`Expert Panel - ${expertRole} query:`, query);

    // Get authenticated user (optional - works for guests too)
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch user context if authenticated
    let userContext = '';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('assets, risk_profile')
        .eq('user_id', user.id)
        .single();

      userContext = profile 
        ? `User portfolio: ${profile.assets?.join(', ')}. Risk profile: ${profile.risk_profile}.`
        : '';
    }

    // Fetch real-time context using You.com
    let searchContext = '';
    const sources: Array<{ title: string; url: string; snippet: string }> = [];

    try {
      const assets = user ? (await supabase
        .from('profiles')
        .select('assets')
        .eq('user_id', user.id)
        .single())?.data?.assets || [] : [];
      
      const youComQuery = `${query} ${assets.join(' ')} financial advice`;
      const youComResponse = await fetch('https://api.ydc-index.io/search', {
        method: 'POST',
        headers: {
          'X-API-Key': Deno.env.get('YOU_COM_API_KEY') || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: youComQuery,
          num_web_results: 3,
        }),
      });

      if (youComResponse.ok) {
        const youComData = await youComResponse.json();
        const results = youComData.hits || [];
        
        results.slice(0, 3).forEach((hit: any) => {
          sources.push({
            title: hit.title || '',
            url: hit.url || '',
            snippet: hit.snippets?.[0] || '',
          });
        });

        searchContext = results
          .slice(0, 3)
          .map((hit: any) => `${hit.title}: ${hit.snippets?.[0] || ''}`)
          .join('\n\n');

        console.log('Fetched real-time context from You.com');
      }
    } catch (error) {
      console.warn('You.com API failed, proceeding without real-time context:', error);
    }

    // Build conversation messages
    const expert = EXPERT_PERSONAS[expertRole as keyof typeof EXPERT_PERSONAS];
    
    const contextPrompt = searchContext
      ? `\n\nREAL-TIME MARKET CONTEXT:\n${searchContext}\n\nUse this current information to provide accurate, timely advice.`
      : '';

    const messages = [
      {
        role: 'system',
        content: `${expert.systemPrompt}\n\n${userContext}${contextPrompt}`,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: query,
      },
    ];

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_completion_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || 'Unable to generate advice at this time.';

    // Save consultation to database (only if authenticated)
    if (user) {
      await supabase
        .from('expert_consultations')
        .insert({
          user_id: user.id,
          expert_role: expertRole,
          question: query,
          answer,
          sources,
        });
    }

    console.log(`Successfully generated ${expertRole} response`);

    return new Response(
      JSON.stringify({ 
        answer,
        expertRole,
        expertName: expert.name,
        sources,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in expert-panel:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});