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
    const { term } = await req.json();

    if (!term) {
      throw new Error('Term is required');
    }

    console.log('Looking up term:', term);

    const YOU_COM_API_KEY = Deno.env.get('YOU_COM_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!YOU_COM_API_KEY || !LOVABLE_API_KEY) {
      throw new Error('API keys not configured');
    }

    // Try to fetch from You.com, but don't fail if it errors
    let searchContext = '';
    let sources: Array<{ title: string; url: string }> = [];

    try {
      const youComQuery = `${term} finance definition example investing cryptocurrency`;
      const youComResponse = await fetch('https://api.ydc-index.io/search', {
        method: 'POST',
        headers: {
          'X-API-Key': YOU_COM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: youComQuery,
          num_web_results: 5,
        }),
      });

      console.log('You.com API status:', youComResponse.status);

      if (youComResponse.ok) {
        const youComData = await youComResponse.json();
        const hits = youComData.hits || [];

        // Extract context from search results
        searchContext = hits
          .slice(0, 4)
          .map((hit: any) => `Source: ${hit.title}\n${hit.snippets?.[0] || ''}`)
          .join('\n\n');

        // Extract sources for attribution
        sources = hits.slice(0, 3).map((hit: any) => ({
          title: hit.title || '',
          url: hit.url || '',
        }));

        console.log('Successfully fetched search results from You.com');
      } else {
        const errorText = await youComResponse.text();
        console.warn('You.com API returned non-OK status:', youComResponse.status, errorText);
      }
    } catch (youComError) {
      console.warn('You.com API call failed, proceeding with AI-only definition:', youComError);
    }

    // Use Lovable AI to synthesize a clear, educational definition
    // Adjust prompt based on whether we have search context
    const synthesisPrompt = searchContext 
      ? `Based on these authoritative financial sources, provide a clear, concise definition of "${term}" for investors.

Search Results:
${searchContext}

Provide:
1. A clear 2-3 sentence definition
2. A practical example relevant to cryptocurrency or stock investing
3. Why it matters to traders/investors

Keep the response under 200 words and make it educational yet accessible.`
      : `Provide a clear, educational definition of the financial term "${term}" for investors.

Include:
1. A clear 2-3 sentence definition
2. A practical example relevant to cryptocurrency or stock investing
3. Why it matters to traders/investors

Keep the response under 200 words and make it educational yet accessible.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a finance education assistant. Provide clear, accurate definitions with practical examples for investors.',
          },
          {
            role: 'user',
            content: synthesisPrompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 400,
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
    const definition = aiData.choices?.[0]?.message?.content || 'Unable to generate definition.';

    console.log('Generated definition for:', term);

    return new Response(
      JSON.stringify({ 
        term,
        definition,
        sources,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in finance-glossary:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        definition: 'Sorry, I encountered an error looking up that term. Please try again.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
