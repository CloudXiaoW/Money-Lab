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
    console.log('Starting prediction evaluation...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`Evaluating predictions from ${yesterdayStr}`);

    // Fetch all pending predictions from yesterday
    const { data: predictions, error: fetchError } = await supabaseClient
      .from('predictions')
      .select('*')
      .eq('result', 'pending')
      .eq('prediction_date', yesterdayStr);

    if (fetchError) {
      throw fetchError;
    }

    if (!predictions || predictions.length === 0) {
      console.log('No pending predictions to evaluate');
      return new Response(
        JSON.stringify({ message: 'No pending predictions', evaluated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${predictions.length} predictions to evaluate`);

    let evaluatedCount = 0;
    const userUpdates = new Map<string, { correct: number; incorrect: number }>();

    // Group predictions by asset to batch AI calls
    const assetGroups = predictions.reduce((acc, pred) => {
      if (!acc[pred.asset]) acc[pred.asset] = [];
      acc[pred.asset].push(pred);
      return acc;
    }, {} as Record<string, Array<typeof predictions[0]>>);

    // Evaluate each asset group
    for (const [asset, assetPreds] of Object.entries(assetGroups)) {
      const assetPredictions = assetPreds as Array<typeof predictions[0]>;
      try {
        console.log(`Evaluating ${assetPredictions.length} predictions for ${asset}`);

        // Get price movement from AI
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                content: 'You analyze market price movements. Respond with ONLY one word: up, down, or neutral.'
              },
              {
                role: 'user',
                content: `Did ${asset} price move up, down, or stay neutral (less than 1% change) from yesterday ${yesterdayStr} to today? Based on recent market data, respond with ONLY: up, down, or neutral.`
              }
            ],
          }),
        });

        if (!response.ok) {
          console.error(`AI API error for ${asset}:`, response.status);
          continue;
        }

        const data = await response.json();
        const actualMovement = data.choices[0].message.content.toLowerCase().trim();
        console.log(`${asset} actual movement: ${actualMovement}`);

        // Evaluate each prediction for this asset
        for (const prediction of assetPredictions) {
          const isCorrect = prediction.prediction === actualMovement;
          const pointsEarned = isCorrect ? 10 : 0;

          // Update prediction record
          await supabaseClient
            .from('predictions')
            .update({
              result: isCorrect ? 'correct' : 'incorrect',
              points_earned: pointsEarned,
            })
            .eq('id', prediction.id);

          // Track user stats
          const userId = prediction.user_id;
          if (!userUpdates.has(userId)) {
            userUpdates.set(userId, { correct: 0, incorrect: 0 });
          }
          const stats = userUpdates.get(userId)!;
          if (isCorrect) {
            stats.correct++;
          } else {
            stats.incorrect++;
          }

          evaluatedCount++;
        }
      } catch (error) {
        console.error(`Error evaluating ${asset}:`, error);
      }
    }

    // Update user stats and send notifications
    for (const [userId, stats] of userUpdates.entries()) {
      try {
        // Get current user stats
        const { data: currentStats } = await supabaseClient
          .from('user_stats')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!currentStats) continue;

        const newPoints = currentStats.points + (stats.correct * 10);
        const totalCorrect = stats.correct;
        const badges = [...(currentStats.badges || [])];

        // Award badges
        const newBadges: string[] = [];
        if (!badges.includes('first_prediction') && totalCorrect >= 1) {
          badges.push('first_prediction');
          newBadges.push('First Correct Prediction 🎯');
        }
        if (!badges.includes('accuracy_10') && totalCorrect >= 10) {
          badges.push('accuracy_10');
          newBadges.push('10 Correct Predictions 🏆');
        }
        if (!badges.includes('streak_7') && currentStats.current_streak >= 7) {
          badges.push('streak_7');
          newBadges.push('7 Day Streak 🔥');
        }
        if (!badges.includes('streak_30') && currentStats.current_streak >= 30) {
          badges.push('streak_30');
          newBadges.push('30 Day Streak 🔥🔥');
        }

        // Update user stats
        await supabaseClient
          .from('user_stats')
          .update({
            points: newPoints,
            badges: badges,
          })
          .eq('user_id', userId);

        // Create result notification
        const resultMessage = stats.correct > 0
          ? `🎉 ${stats.correct} correct predictions! You earned ${stats.correct * 10} points.`
          : `${stats.incorrect} predictions were incorrect. Keep experimenting!`;

        await supabaseClient
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'Prediction Results',
            message: resultMessage,
            type: 'prediction_result',
          });

        // Create badge notifications
        for (const badge of newBadges) {
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: userId,
              title: 'New Badge Earned!',
              message: `Congratulations! You earned: ${badge}`,
              type: 'badge_earned',
            });
        }

        console.log(`Updated stats for user ${userId}: +${stats.correct * 10} points, ${newBadges.length} new badges`);
      } catch (error) {
        console.error(`Error updating user ${userId}:`, error);
      }
    }

    console.log(`Evaluation complete. Processed ${evaluatedCount} predictions for ${userUpdates.size} users`);

    return new Response(
      JSON.stringify({
        success: true,
        evaluated: evaluatedCount,
        users: userUpdates.size,
        message: 'Predictions evaluated successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in evaluate-predictions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
