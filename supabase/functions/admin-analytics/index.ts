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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify admin role
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleCheck } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get total users
    const { count: totalUsers } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total predictions
    const { count: totalPredictions } = await supabaseClient
      .from('predictions')
      .select('*', { count: 'exact', head: true });

    // Get total points awarded
    const { data: pointsData } = await supabaseClient
      .from('user_stats')
      .select('points');
    
    const totalPoints = pointsData?.reduce((sum, stat) => sum + stat.points, 0) || 0;

    // Get active users (made prediction in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: activePredictions } = await supabaseClient
      .from('predictions')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString());

    const activeUsers = new Set(activePredictions?.map(p => p.user_id)).size;

    // Get badge distribution
    const { data: badgeStats } = await supabaseClient
      .from('user_stats')
      .select('badges');

    const badgeDistribution: Record<string, number> = {};
    badgeStats?.forEach(stat => {
      stat.badges?.forEach((badge: string) => {
        badgeDistribution[badge] = (badgeDistribution[badge] || 0) + 1;
      });
    });

    // Get predictions by asset
    const { data: predictionsByAsset } = await supabaseClient
      .from('predictions')
      .select('asset');

    const assetDistribution: Record<string, number> = {};
    predictionsByAsset?.forEach(pred => {
      assetDistribution[pred.asset] = (assetDistribution[pred.asset] || 0) + 1;
    });

    console.log('Admin analytics fetched successfully');

    return new Response(
      JSON.stringify({
        totalUsers: totalUsers || 0,
        totalPredictions: totalPredictions || 0,
        totalPoints,
        activeUsers,
        badgeDistribution,
        assetDistribution,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in admin-analytics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
