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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get time period from request body (default to 'all_time')
    const { period = 'all_time' } = await req.json().catch(() => ({}));
    
    console.log(`Fetching leaderboard for period: ${period}`);

    // Calculate date thresholds
    const now = new Date();
    let dateThreshold: string | null = null;
    
    if (period === 'daily') {
      // Start of today
      dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (period === 'weekly') {
      // Start of this week (Monday)
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - daysToMonday);
      monday.setHours(0, 0, 0, 0);
      dateThreshold = monday.toISOString();
    } else if (period === 'monthly') {
      // Start of this month
      dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    let leaderboard: any[] = [];

    if (period === 'all_time') {
      // For all-time, use total points from user_stats
      const { data, error } = await supabaseClient
        .from('user_stats')
        .select(`
          user_id,
          points,
          current_streak,
          longest_streak,
          badges
        `)
        .order('points', { ascending: false })
        .limit(10);

      if (error) throw error;
      leaderboard = data || [];
    } else {
      // For time-based periods, calculate points from predictions
      const { data: predictions, error: predError } = await supabaseClient
        .from('predictions')
        .select('user_id, points_earned, created_at')
        .gte('created_at', dateThreshold!)
        .not('points_earned', 'is', null);

      if (predError) throw predError;

      // Aggregate points by user
      const userPointsMap = new Map<string, number>();
      predictions?.forEach(p => {
        const current = userPointsMap.get(p.user_id) || 0;
        userPointsMap.set(p.user_id, current + (p.points_earned || 0));
      });

      // Get quiz completions for the period
      const { data: quizzes, error: quizError } = await supabaseClient
        .from('daily_quiz_completions')
        .select('user_id, score, bonus_points_awarded, completed_at')
        .gte('completed_at', dateThreshold!);

      if (quizError) throw quizError;

      // Add quiz points
      quizzes?.forEach(q => {
        const current = userPointsMap.get(q.user_id) || 0;
        const quizPoints = (q.score * 10) + (q.bonus_points_awarded || 0);
        userPointsMap.set(q.user_id, current + quizPoints);
      });

      // Get user stats for additional info
      const userIds = Array.from(userPointsMap.keys());
      const { data: userStats, error: statsError } = await supabaseClient
        .from('user_stats')
        .select('user_id, current_streak, longest_streak, badges')
        .in('user_id', userIds);

      if (statsError) throw statsError;

      // Combine data
      leaderboard = Array.from(userPointsMap.entries())
        .map(([user_id, points]) => {
          const stats = userStats?.find(s => s.user_id === user_id);
          return {
            user_id,
            points: Math.round(points),
            current_streak: stats?.current_streak || 0,
            longest_streak: stats?.longest_streak || 0,
            badges: stats?.badges || []
          };
        })
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);
    }

    // Award leaderboard badges to top 3 users (only for all-time)
    if (period === 'all_time' && leaderboard && leaderboard.length > 0) {
      for (let i = 0; i < Math.min(3, leaderboard.length); i++) {
        const entry = leaderboard[i];
        const badges = entry.badges || [];
        const newBadges: string[] = [];

        // Award Top 3 badge
        if (i < 3 && !badges.includes('top_3')) {
          badges.push('top_3');
          newBadges.push('top_3');
        }

        // Award Legendary badge to #1 with 1000+ points
        if (i === 0 && entry.points >= 1000 && !badges.includes('legendary')) {
          badges.push('legendary');
          newBadges.push('legendary');
        }

        // Update badges if new ones were earned
        if (newBadges.length > 0) {
          await supabaseClient
            .from('user_stats')
            .update({ badges })
            .eq('user_id', entry.user_id);

          // Send notification for new badges
          await supabaseClient.from('notifications').insert({
            user_id: entry.user_id,
            title: 'New Badge Earned! 🏆',
            message: `Congratulations! You earned the ${newBadges.join(', ')} badge${newBadges.length > 1 ? 's' : ''}!`,
            type: 'badge_earned',
          });

          console.log(`Awarded ${newBadges.join(', ')} badge(s) to user ${entry.user_id}`);
        }
      }
    }

    // Get display names from profiles
    const userIds = leaderboard.map(entry => entry.user_id);
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);
    
    const leaderboardWithNames = leaderboard.map((entry, index) => {
      const profile = profiles?.find(p => p.user_id === entry.user_id);
      const displayName = profile?.display_name || 'Anonymous Player';
      
      return {
        rank: index + 1,
        name: displayName,
        avatar_url: profile?.avatar_url || null,
        points: entry.points,
        streak: entry.current_streak,
        badges: entry.badges?.length || 0,
      };
    });

    return new Response(
      JSON.stringify({ leaderboard: leaderboardWithNames }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-leaderboard:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
