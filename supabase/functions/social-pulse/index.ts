import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BULLISH_KEYWORDS = ['bullish', 'buy', 'moon', 'pump', 'hodl', 'long', 'calls', 'rally', 'breakout'];
const BEARISH_KEYWORDS = ['bearish', 'sell', 'dump', 'short', 'puts', 'crash', 'drop', 'fall'];

const analyzeSentiment = (text: string): { bullish: number; bearish: number } => {
  const lowerText = text.toLowerCase();
  let bullish = 0;
  let bearish = 0;

  BULLISH_KEYWORDS.forEach(keyword => {
    const matches = lowerText.match(new RegExp(keyword, 'g'));
    if (matches) bullish += matches.length;
  });

  BEARISH_KEYWORDS.forEach(keyword => {
    const matches = lowerText.match(new RegExp(keyword, 'g'));
    if (matches) bearish += matches.length;
  });

  return { bullish, bearish };
};

const extractPriceTargets = (text: string): number[] => {
  // Match patterns like $100, $1,000, $10K, $100K
  const priceMatches = text.match(/\$[\d,]+\.?\d*[KkMm]?/g);
  if (!priceMatches) return [];

  return priceMatches
    .map(match => {
      let num = parseFloat(match.replace(/[\$,]/g, ''));
      if (match.toLowerCase().includes('k')) num *= 1000;
      if (match.toLowerCase().includes('m')) num *= 1000000;
      return num;
    })
    .filter(num => num > 0 && num < 10000000); // Reasonable range
};

const generateMockSocialPulse = (asset: string) => {
  const bullishPercent = 45 + Math.floor(Math.random() * 10); // 45-55%
  const bearishPercent = 100 - bullishPercent;
  
  const basePrice: Record<string, number> = {
    'BTC': 95000,
    'ETH': 3500,
    'USDT': 1,
    'XRP': 2.5,
  };
  
  const price = basePrice[asset] || 100;
  const avgTarget = price * (1 + (Math.random() * 0.15 - 0.05)); // ±5-15%
  
  const platforms = ['Reddit', 'Twitter', 'Discord', 'Telegram'];
  const sentiments = [
    `${asset} looking strong for Q1 2025`,
    `Technical analysis suggests ${asset} breakout incoming`,
    `Community bullish on ${asset} fundamentals`,
    `Whales accumulating ${asset} according to on-chain data`,
    `${asset} price target: $${Math.floor(avgTarget)}`,
  ];
  
  const sources = sentiments.slice(0, 5).map((snippet, i) => ({
    platform: platforms[i % platforms.length],
    snippet,
    url: 'https://example.com/demo',
  }));
  
  return {
    asset,
    avg_target: avgTarget,
    bullish_percent: bullishPercent,
    bearish_percent: bearishPercent,
    sample_size: 10,
    sources,
    is_mock: true,
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asset } = await req.json();

    if (!asset) {
      throw new Error('Asset is required');
    }

    console.log('Fetching social pulse for:', asset);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for cached data (less than 4 hours old)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const { data: cachedData } = await supabase
      .from('social_predictions')
      .select('*')
      .eq('asset', asset)
      .gte('fetched_at', fourHoursAgo)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedData) {
      console.log('Returning cached social pulse data');
      return new Response(
        JSON.stringify({
          ...cachedData,
          cached: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch social sentiment from You.com
    const query = `${asset} price prediction target Reddit Twitter 2025`;
    
    const youComResponse = await fetch('https://api.ydc-index.io/search', {
      method: 'POST',
      headers: {
        'X-API-Key': Deno.env.get('YOU_COM_API_KEY') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        num_web_results: 10,
      }),
    });

    if (!youComResponse.ok) {
      console.error('You.com API error:', youComResponse.status);
      
      if (youComResponse.status === 403) {
        console.log('API key invalid - using mock data for', asset);
        const mockData = generateMockSocialPulse(asset);
        
        // Cache mock data for 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: cachedMockData } = await supabase
          .from('social_predictions')
          .select('*')
          .eq('asset', asset)
          .gte('fetched_at', oneHourAgo)
          .order('fetched_at', { ascending: false })
          .limit(1)
          .single();
        
        if (cachedMockData) {
          console.log('Returning cached mock data');
          return new Response(
            JSON.stringify({ ...cachedMockData, cached: true, is_mock: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Save mock data (but don't fail if it errors)
        const { data: savedMockData, error: saveMockError } = await supabase
          .from('social_predictions')
          .insert(mockData)
          .select()
          .single();
        
        if (saveMockError) {
          console.error('Error saving mock data:', saveMockError);
        }
        
        console.log('Returning new mock data');
        return new Response(
          JSON.stringify({ ...(savedMockData || mockData), is_mock: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Failed to fetch social data');
    }

    const data = await youComResponse.json();
    const results = data.hits || [];

    if (results.length === 0) {
      throw new Error('No social data found');
    }

    // Analyze sentiment and extract price targets
    let totalBullish = 0;
    let totalBearish = 0;
    const priceTargets: number[] = [];
    const sources: Array<{ platform: string; snippet: string; url: string }> = [];

    results.forEach((result: any) => {
      const text = `${result.title} ${result.snippets?.[0] || result.description || ''}`;
      const sentiment = analyzeSentiment(text);
      totalBullish += sentiment.bullish;
      totalBearish += sentiment.bearish;

      const targets = extractPriceTargets(text);
      priceTargets.push(...targets);

      const platform = result.url.includes('reddit') ? 'Reddit' :
                      result.url.includes('twitter') ? 'Twitter' : 'Web';

      sources.push({
        platform,
        snippet: result.snippets?.[0] || result.description || '',
        url: result.url,
      });
    });

    // Calculate percentages
    const totalSentiment = totalBullish + totalBearish || 1;
    const bullishPercent = Math.round((totalBullish / totalSentiment) * 100);
    const bearishPercent = 100 - bullishPercent;

    // Calculate average price target
    const validTargets = priceTargets.filter(t => t > 0);
    const avgTarget = validTargets.length > 0
      ? validTargets.reduce((a, b) => a + b, 0) / validTargets.length
      : 0;

    // Save to database (but don't fail if it errors)
    const socialPulseData = {
      asset,
      avg_target: avgTarget,
      bullish_percent: bullishPercent,
      bearish_percent: bearishPercent,
      sample_size: results.length,
      sources: sources.slice(0, 5),
    };

    const { data: savedData, error: saveError } = await supabase
      .from('social_predictions')
      .insert(socialPulseData)
      .select()
      .single();

    if (saveError) {
      console.error('Error saving social pulse data:', saveError);
    }

    console.log(`Social pulse for ${asset}: ${bullishPercent}% bullish, avg target: $${avgTarget.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        ...(savedData || socialPulseData),
        cached: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in social-pulse:', error);
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