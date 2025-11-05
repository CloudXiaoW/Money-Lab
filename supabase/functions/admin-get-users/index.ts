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

    // Get all user stats with profile data
    const { data: userStats, error: statsError } = await supabaseClient
      .from('user_stats')
      .select(`
        user_id,
        points,
        current_streak,
        longest_streak,
        badges,
        last_prediction_date
      `)
      .order('points', { ascending: false });

    if (statsError) throw statsError;

    // Get all auth users for emails
    const { data: { users: authUsers } } = await supabaseClient.auth.admin.listUsers();

    // Combine data
    const usersData = userStats?.map(stat => {
      const authUser = authUsers?.find(u => u.id === stat.user_id);
      const email = authUser?.email || 'Unknown';
      
      return {
        id: stat.user_id,
        email,
        displayName: email.split('@')[0],
        points: stat.points,
        currentStreak: stat.current_streak,
        longestStreak: stat.longest_streak,
        badges: stat.badges || [],
        lastPrediction: stat.last_prediction_date,
        createdAt: authUser?.created_at,
      };
    }) || [];

    console.log('Fetched', usersData.length, 'users for admin');

    return new Response(
      JSON.stringify({ users: usersData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in admin-get-users:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
