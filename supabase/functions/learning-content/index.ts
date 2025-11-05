import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asset, contentType, riskProfile } = await req.json();

    console.log(`Fetching ${contentType} content for ${asset || riskProfile}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Check for cached content (less than 24 hours old)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    let cachedQuery = supabase
      .from('learning_content')
      .select('*')
      .gte('created_at', oneDayAgo);
    
    if (contentType) {
      cachedQuery = cachedQuery.eq('content_type', contentType);
    }
    
    if (asset) {
      cachedQuery = cachedQuery.eq('asset', asset);
    }

    const { data: cachedContent } = await cachedQuery.limit(10);

    if (cachedContent && cachedContent.length > 0) {
      console.log(`Returning ${cachedContent.length} cached content items`);
      return new Response(
        JSON.stringify({
          content: cachedContent,
          cached: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch new content based on type
    const newContent: any[] = [];

    // Fetch charts
    if (!contentType || contentType === 'chart') {
      try {
        const chartQuery = asset 
          ? `${asset} price chart 2025 technical analysis`
          : 'cryptocurrency price chart technical analysis';
        
        const chartsResponse = await fetch('https://api.ydc-index.io/search', {
          method: 'POST',
          headers: {
            'X-API-Key': Deno.env.get('YOU_COM_API_KEY') || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: chartQuery,
            num_web_results: 5,
          }),
        });

        if (chartsResponse.ok) {
          const chartsData = await chartsResponse.json();
          const chartResults = chartsData.hits || [];
          
          chartResults.slice(0, 3).forEach((result: any) => {
            newContent.push({
              content_type: 'chart',
              asset: asset || null,
              title: result.title || 'Market Chart',
              url: result.url,
              thumbnail_url: result.thumbnail_url || null,
              description: result.snippets?.[0] || result.description || '',
              difficulty: 'intermediate',
            });
          });
        }
      } catch (error) {
        console.error('Error fetching charts:', error);
      }
    }

    // Fetch videos
    if (!contentType || contentType === 'video') {
      try {
        const videoQuery = riskProfile === 'cautious'
          ? 'investing basics for beginners tutorial'
          : riskProfile === 'growth'
          ? 'advanced trading strategies tutorial'
          : 'investing tutorial explained';
        
        const videosResponse = await fetch('https://api.ydc-index.io/search', {
          method: 'POST',
          headers: {
            'X-API-Key': Deno.env.get('YOU_COM_API_KEY') || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `${videoQuery} YouTube`,
            num_web_results: 5,
          }),
        });

        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          const videoResults = videosData.hits || [];
          
          videoResults
            .filter((r: any) => r.url.includes('youtube.com') || r.url.includes('youtu.be'))
            .slice(0, 3)
            .forEach((result: any) => {
              newContent.push({
                content_type: 'video',
                asset: null,
                title: result.title || 'Educational Video',
                url: result.url,
                thumbnail_url: result.thumbnail_url || null,
                description: result.snippets?.[0] || result.description || '',
                difficulty: riskProfile === 'cautious' ? 'beginner' : 'intermediate',
              });
            });
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
      }
    }

    // Fetch infographics
    if (!contentType || contentType === 'infographic') {
      try {
        const infoQuery = riskProfile
          ? `${riskProfile} investing infographic guide`
          : 'investing infographic guide';
        
        const infosResponse = await fetch('https://api.ydc-index.io/search', {
          method: 'POST',
          headers: {
            'X-API-Key': Deno.env.get('YOU_COM_API_KEY') || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: infoQuery,
            num_web_results: 5,
          }),
        });

        if (infosResponse.ok) {
          const infosData = await infosResponse.json();
          const infoResults = infosData.hits || [];
          
          infoResults.slice(0, 2).forEach((result: any) => {
            newContent.push({
              content_type: 'infographic',
              asset: null,
              title: result.title || 'Investment Guide',
              url: result.url,
              thumbnail_url: result.thumbnail_url || null,
              description: result.snippets?.[0] || result.description || '',
              difficulty: 'beginner',
            });
          });
        }
      } catch (error) {
        console.error('Error fetching infographics:', error);
      }
    }

    // Save new content to database
    if (newContent.length > 0) {
      const { error: insertError } = await supabase
        .from('learning_content')
        .insert(newContent);

      if (insertError) {
        console.error('Error saving learning content:', insertError);
      } else {
        console.log(`Saved ${newContent.length} new content items`);
      }
    }

    return new Response(
      JSON.stringify({
        content: newContent,
        cached: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in learning-content:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        content: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});