import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const categorizeAssets = (assets: string[]): Record<string, string[]> => {
  const categories: Record<string, string[]> = {
    crypto: [],
    stocks: [],
    tech: [],
    other: [],
  };

  const cryptoAssets = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'MATIC', 'UNI'];
  const techStocks = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN'];

  assets.forEach(asset => {
    if (cryptoAssets.includes(asset)) {
      categories.crypto.push(asset);
    } else if (techStocks.includes(asset)) {
      categories.tech.push(asset);
      categories.stocks.push(asset);
    } else {
      categories.stocks.push(asset);
    }
  });

  return categories;
};

const calculateDiversityScore = (categories: Record<string, string[]>, totalAssets: number): number => {
  const numCategories = Object.values(categories).filter(cat => cat.length > 0).length;
  const largestCategory = Math.max(...Object.values(categories).map(cat => cat.length));
  const concentration = largestCategory / totalAssets;
  
  // Score from 1-10 (higher is more diverse)
  if (concentration > 0.8) return Math.max(1, Math.floor(3 * numCategories));
  if (concentration > 0.6) return Math.max(3, Math.floor(5 * numCategories));
  return Math.min(10, Math.floor(7 + numCategories));
};

serve(async (req) => {
  console.log('🚀 Portfolio analyzer invoked!', {
    method: req.method,
    hasAuthHeader: !!req.headers.get('Authorization'),
    timestamp: new Date().toISOString(),
  });

  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    console.log('🔑 Auth header present:', !!authHeader);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 Auth result:', { 
      userId: user?.id, 
      hasUser: !!user,
      authError: authError?.message 
    });
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    console.log('Analyzing portfolio for user:', user.id);

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('assets, risk_profile')
      .eq('user_id', user.id)
      .single();

    if (!profile?.assets || profile.assets.length === 0) {
      throw new Error('No assets found in portfolio');
    }

    const assets = profile.assets as string[];
    const riskProfile = profile.risk_profile || 'balanced';

    // Check for cached analysis (less than 24 hours old)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: cachedAnalysis } = await supabase
      .from('portfolio_analyses')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedAnalysis) {
      console.log('Returning cached portfolio analysis');
      return new Response(
        JSON.stringify({
          ...cachedAnalysis,
          cached: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Categorize assets
    const categories = categorizeAssets(assets);
    const diversityScore = calculateDiversityScore(categories, assets.length);

    // Fetch market context using You.com
    let marketContext = '';
    try {
      const query = `portfolio analysis ${assets.join(' ')} diversification correlation risk`;
      const youComResponse = await fetch('https://api.ydc-index.io/search', {
        method: 'POST',
        headers: {
          'X-API-Key': Deno.env.get('YOU_COM_API_KEY') || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          num_web_results: 5,
        }),
      });

      if (youComResponse.ok) {
        const data = await youComResponse.json();
        const results = data.hits || [];
        marketContext = results
          .slice(0, 3)
          .map((hit: any) => `${hit.title}: ${hit.snippets?.[0] || ''}`)
          .join('\n\n');
        console.log('Fetched market context from You.com');
      }
    } catch (error) {
      console.warn('Failed to fetch market context:', error);
    }

    // Use Lovable AI to analyze portfolio
    const analysisPrompt = `Analyze this investment portfolio:

Assets: ${assets.join(', ')}
Risk Profile: ${riskProfile}
Asset Categories:
- Crypto: ${categories.crypto.join(', ') || 'None'}
- Tech Stocks: ${categories.tech.join(', ') || 'None'}
- Other Stocks: ${categories.stocks.filter(s => !categories.tech.includes(s)).join(', ') || 'None'}

${marketContext ? `Current Market Context:\n${marketContext}\n` : ''}

Provide a concise analysis with:
1. STRENGTHS: 2-3 key strengths (e.g., "Good tech sector exposure", "Balanced crypto/stocks mix")
2. WEAKNESSES: 2-3 concerns (e.g., "Over-concentrated in crypto (60%)", "Missing defensive stocks")
3. RECOMMENDATIONS: 3-4 actionable tips based on ${riskProfile} risk profile

Keep each section under 150 words. Be specific and actionable.`;

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
            content: 'You are a professional portfolio analyst. Provide clear, structured analysis.',
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        max_completion_tokens: 800,
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
    const fullAnalysis = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response into structured format
    const strengthsMatch = fullAnalysis.match(/STRENGTHS:(.*?)(?=WEAKNESSES:|$)/is);
    const weaknessesMatch = fullAnalysis.match(/WEAKNESSES:(.*?)(?=RECOMMENDATIONS:|$)/is);
    const recommendationsMatch = fullAnalysis.match(/RECOMMENDATIONS:(.*?)$/is);

    const strengths = strengthsMatch?.[1]?.trim() || 'Analysis pending';
    const weaknesses = weaknessesMatch?.[1]?.trim() || 'Analysis pending';
    const recommendations = recommendationsMatch?.[1]?.trim() || 'Analysis pending';

    // Save analysis to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('portfolio_analyses')
      .insert({
        user_id: user.id,
        assets,
        strengths,
        weaknesses,
        recommendations,
        diversity_score: diversityScore,
        risk_level: riskProfile,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving portfolio analysis:', saveError);
    }

    console.log('Portfolio analysis completed successfully');

    return new Response(
      JSON.stringify({
        ...(savedAnalysis || {
          assets,
          strengths,
          weaknesses,
          recommendations,
          diversity_score: diversityScore,
          risk_level: riskProfile,
        }),
        categories,
        cached: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in portfolio-analyzer:', error);
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