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
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    console.log('Creating welcome notifications for user:', user.id);

    // Create welcome notifications
    const notifications = [
      {
        user_id: user.id,
        title: 'Welcome to Money Labs! 🧪',
        message: 'Start making daily predictions to earn points and climb the leaderboard!',
        type: 'welcome',
      },
      {
        user_id: user.id,
        title: 'Daily Quiz Available 🧠',
        message: 'Test your financial knowledge and earn bonus points with today\'s quiz!',
        type: 'quiz_available',
      },
      {
        user_id: user.id,
        title: 'Track Your Portfolio 📊',
        message: 'Use the Portfolio Analyzer to get AI-powered insights on your assets.',
        type: 'feature_tip',
      },
    ];

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;

    console.log('Welcome notifications created successfully');

    return new Response(
      JSON.stringify({ success: true, created: notifications.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating welcome notifications:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
