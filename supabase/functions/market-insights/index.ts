import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asset } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Fetching market insights for ${asset}`);

    // Get news summary
    const newsResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a financial news analyst. Provide brief, factual summaries of recent market news.'
          },
          {
            role: 'user',
            content: `Summarize today's most important news about ${asset} in 2-3 sentences. Focus on price movements, major announcements, or market trends.`
          }
        ],
      }),
    });

    if (!newsResponse.ok) {
      const errorText = await newsResponse.text();
      console.error('News API error:', newsResponse.status, errorText);
      throw new Error(`News API failed: ${newsResponse.status}`);
    }

    const newsData = await newsResponse.json();
    const newsSnippet = newsData.choices[0].message.content;

    // Get sentiment analysis
    const sentimentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analyst. Respond with ONLY one word: bullish, bearish, or neutral.'
          },
          {
            role: 'user',
            content: `Based on current market sentiment and social media discussions, what is the overall sentiment for ${asset}? Respond with ONLY: bullish, bearish, or neutral.`
          }
        ],
      }),
    });

    const sentimentData = await sentimentResponse.json();
    const sentiment = sentimentData.choices[0].message.content.toLowerCase().trim();

    // Get technical tip
    const technicalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a technical analysis educator. Explain concepts simply for beginners.'
          },
          {
            role: 'user',
            content: `Explain one relevant technical indicator for ${asset} in one simple sentence that a beginner can understand.`
          }
        ],
      }),
    });

    const technicalData = await technicalResponse.json();
    const technicalTip = technicalData.choices[0].message.content;

    // Map sentiment to emoji
    const sentimentEmoji = 
      sentiment.includes('bullish') ? '🚀' : 
      sentiment.includes('bearish') ? '📉' : 
      '🤝';

    return new Response(
      JSON.stringify({
        asset,
        news: newsSnippet,
        sentiment: sentimentEmoji,
        sentimentText: sentiment,
        technicalTip,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in market-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
