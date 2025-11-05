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

    const { action, userId, badge, points } = await req.json();

    if (!action || !userId) {
      throw new Error('Action and userId are required');
    }

    console.log('Admin action:', action, 'for user:', userId);

    switch (action) {
      case 'reset_streak': {
        const { error } = await supabaseClient
          .from('user_stats')
          .update({ current_streak: 0 })
          .eq('user_id', userId);

        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, message: 'Streak reset successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'award_badge': {
        if (!badge) throw new Error('Badge is required');

        // Get current badges
        const { data: stats } = await supabaseClient
          .from('user_stats')
          .select('badges')
          .eq('user_id', userId)
          .maybeSingle();

        const currentBadges = stats?.badges || [];
        if (currentBadges.includes(badge)) {
          return new Response(
            JSON.stringify({ success: false, message: 'User already has this badge' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const newBadges = [...currentBadges, badge];
        const { error } = await supabaseClient
          .from('user_stats')
          .update({ badges: newBadges })
          .eq('user_id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: 'Badge awarded successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'adjust_points': {
        if (points === undefined) throw new Error('Points value is required');

        const { data: stats } = await supabaseClient
          .from('user_stats')
          .select('points')
          .eq('user_id', userId)
          .maybeSingle();

        const currentPoints = stats?.points || 0;
        const newPoints = Math.max(0, currentPoints + points);

        const { error } = await supabaseClient
          .from('user_stats')
          .update({ points: newPoints })
          .eq('user_id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: 'Points adjusted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in admin-manage-user:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
