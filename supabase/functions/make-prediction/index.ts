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
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - no auth header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract JWT token (remove "Bearer " prefix)
    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT to get user ID (JWT structure: header.payload.signature)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    
    if (!userId) {
      console.error('No user ID in token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Authenticated user:', userId);

    // Create Supabase client with service role for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { asset, prediction } = await req.json();

    // Check if user already made a prediction today for this asset
    const today = new Date().toISOString().split('T')[0];
    const { data: existingPrediction } = await supabaseClient
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('asset', asset)
      .eq('prediction_date', today)
      .maybeSingle();

    if (existingPrediction) {
      return new Response(
        JSON.stringify({ error: 'You already made a prediction for this asset today' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert prediction
    const { data: newPrediction, error: predictionError } = await supabaseClient
      .from('predictions')
      .insert({
        user_id: userId,
        asset,
        prediction,
        prediction_date: today,
        result: 'pending',
      })
      .select()
      .single();

    if (predictionError) {
      throw predictionError;
    }

    // Update user stats - check if this continues their streak
    const { data: stats } = await supabaseClient
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    let newStreak = 1;
    if (stats?.last_prediction_date) {
      const lastDate = new Date(stats.last_prediction_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak = stats.current_streak + 1;
      }
    }

    const { error: statsError } = await supabaseClient
      .from('user_stats')
      .update({
        last_prediction_date: today,
        current_streak: newStreak,
        longest_streak: Math.max(stats?.longest_streak || 0, newStreak),
      })
      .eq('user_id', userId);

    if (statsError) {
      console.error('Error updating stats:', statsError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        prediction: newPrediction,
        newStreak 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in make-prediction:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
