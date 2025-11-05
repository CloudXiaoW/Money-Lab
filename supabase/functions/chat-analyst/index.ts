import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keywords that indicate need for real-time data (You.com)
const REALTIME_KEYWORDS = ['news', 'latest', 'recent', 'current', 'today', 'price', 'market', 'update'];
const PRICE_KEYWORDS = ['price', 'worth', 'value', 'cost', 'trading at', 'how much', 'current value', 'up or down', 'gain', 'loss', 'performance', 'volume', 'volatility', 'change'];

// Common crypto and stock tickers
const KNOWN_ASSETS = ['BTC', 'ETH', 'TSLA', 'AAPL', 'GOOGL', 'NVDA', 'MSFT', 'AMZN', 'SOL', 'ADA', 'DOT', 'LINK', 'MATIC', 'UNI'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Processing chat query:', message);

    // Get authenticated user and profile
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    let userContext = '';
    let assets: string[] = [];
    let riskProfile = '';

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('assets, risk_profile')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        assets = profile.assets || [];
        riskProfile = profile.risk_profile || 'balanced';
        userContext = `User is a ${riskProfile} investor tracking: ${assets.join(', ')}.`;
        console.log('User context:', userContext);
      }
    }

    // Determine if query needs real-time data
    const needsRealTimeData = REALTIME_KEYWORDS.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    // Determine if this is a price-specific query
    const isPriceQuery = PRICE_KEYWORDS.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    // Detect mentioned assets (user's assets or known tickers)
    const mentionedAssets = [...assets, ...KNOWN_ASSETS].filter(asset => 
      message.toLowerCase().includes(asset.toLowerCase())
    );
    const uniqueAssets = [...new Set(mentionedAssets)];

    let response = '';
    let source = 'ai';
    let sources: Array<{ title: string; url: string }> = [];
    let priceData: any = null;

    // Fetch real-time price data if this is a price query and we have assets
    if (isPriceQuery && uniqueAssets.length > 0) {
      try {
        console.log(`Fetching real-time price data for: ${uniqueAssets.join(', ')}`);
        
        const priceResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/asset-prices`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assets: uniqueAssets }),
        });

        if (priceResponse.ok) {
          priceData = await priceResponse.json();
          console.log('Successfully fetched price data:', priceData);
          source = 'realtime_price';
        } else {
          console.error('Price API error:', priceResponse.status, await priceResponse.text());
        }
      } catch (error) {
        console.error('Error fetching price data:', error);
      }
    }

    if (needsRealTimeData && !isPriceQuery && assets.length > 0) {
      console.log('Using You.com for real-time data');
      
      try {
        // Use You.com for factual, real-time data
        const youComQuery = `${message} ${assets.join(' ')} cryptocurrency`;
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

        console.log('You.com API status:', youComResponse.status);

        if (youComResponse.ok) {
          const youComData = await youComResponse.json();
          const results = youComData.hits || [];
          
          // Extract sources
          sources = results.slice(0, 3).map((hit: any) => ({
            title: hit.title || '',
            url: hit.url || '',
          }));

          // Build context from search results
          const searchContext = results
            .slice(0, 3)
            .map((hit: any) => `${hit.title}: ${hit.snippets?.[0] || ''}`)
            .join('\n\n');

          console.log('Successfully fetched You.com search results');

          // Use Lovable AI to synthesize the search results
          const synthesisPrompt = `Based on these real-time search results, answer the user's question concisely:\n\nSearch Results:\n${searchContext}\n\nUser Question: ${message}\n\nProvide a clear, accurate answer in under 200 words.`;

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
                  content: `You are MoneyBot, a financial assistant. ${userContext} Synthesize search results into clear answers.`,
                },
                {
                  role: 'user',
                  content: synthesisPrompt,
                },
              ],
              temperature: 0.7,
              max_tokens: 400,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            response = aiData.choices?.[0]?.message?.content || 'Unable to process search results.';
            source = 'realtime';
            console.log('Successfully generated response with You.com data');
          } else {
            const errorText = await aiResponse.text();
            console.error('Lovable AI synthesis error:', aiResponse.status, errorText);
          }
        } else {
          const errorText = await youComResponse.text();
          console.warn('You.com API returned non-OK status:', youComResponse.status, errorText);
        }
      } catch (youComError) {
        console.warn('You.com API call failed, falling back to AI-only response:', youComError);
      }
    }

    // Fallback to pure AI if no real-time data needed or You.com failed
    if (!response) {
      console.log('Using Lovable AI for conversational response');
      
      // Format price data for AI context
      let priceContext = '';
      if (priceData && Object.keys(priceData).length > 0) {
        priceContext = '\n\n📊 REAL-TIME MARKET DATA (Current as of ' + new Date().toLocaleTimeString() + '):\n';
        for (const [asset, data] of Object.entries(priceData)) {
          const priceInfo = data as any;
          const change = priceInfo.change24h >= 0 ? `+${priceInfo.change24h}%` : `${priceInfo.change24h}%`;
          priceContext += `\n${asset}:
  • Price: $${priceInfo.price.toLocaleString()}
  • 24h Change: ${change}
  • 24h Range: $${priceInfo.low24h.toLocaleString()} - $${priceInfo.high24h.toLocaleString()}
  • Volume: ${priceInfo.volume24h}
`;
        }
        priceContext += '\n⚡ This is live market data. Use it to provide precise, data-driven analysis.';
      }

      const systemPrompt = `You are MoneyBot, a friendly and knowledgeable financial assistant. ${userContext}${priceContext}

Provide clear, accurate, and educational insights about finance, markets, investing, and economics. 
${priceData ? 'When real-time price data is provided above, reference it specifically in your response and provide data-driven analysis.' : ''}
Keep answers concise (under 300 words) and accessible. Use a friendly tone and tailor advice to the user's risk profile.
If using live data, mention that your response is based on current market conditions.`;
      
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
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('Lovable AI API error:', errorText);
        
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
      response = aiData.choices?.[0]?.message?.content || 'Unable to generate response at this time.';
    }

    console.log('Generated chat response with source:', source);

    return new Response(
      JSON.stringify({ 
        response,
        source,
        sources,
        priceData,
        userContext: { assets, riskProfile },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in chat-analyst:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        response: 'Sorry, I encountered an error. Please try again.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
