import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

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
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, answers } = await req.json();
    console.log(`Daily quiz action: ${action} for user ${user.id}`);

    // Check if user completed today's quiz
    if (action === 'check_status') {
      const today = new Date().toISOString().split('T')[0];
      const { data: completion, error } = await supabase
        .from('daily_quiz_completions')
        .select('score, bonus_points_awarded, completed_at')
        .eq('user_id', user.id)
        .eq('quiz_date', today)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          completed: !!completion,
          score: completion?.score || null,
          bonusPoints: completion?.bonus_points_awarded || null,
          completedAt: completion?.completed_at || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate quiz questions using You.com + Lovable AI
    if (action === 'generate_quiz') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      const YOU_COM_API_KEY = Deno.env.get('YOU_COM_API_KEY');
      
      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

      // Fetch user profile for personalized questions
      const { data: profile } = await supabase
        .from('profiles')
        .select('assets, risk_profile')
        .eq('user_id', user.id)
        .single();

      const assets = profile?.assets || ['BTC', 'ETH'];
      const riskProfile = profile?.risk_profile || 'balanced';

      // Fetch user stats for difficulty adjustment
      const { data: stats } = await supabase
        .from('user_stats')
        .select('current_streak')
        .eq('user_id', user.id)
        .single();

      const streak = stats?.current_streak || 0;
      const difficulty = streak > 5 ? 'advanced' : streak > 2 ? 'intermediate' : 'beginner';

      console.log(`Generating quiz for ${user.id}: assets=${assets.join(',')}, difficulty=${difficulty}`);

      // Fetch real-time market data from You.com
      let marketContext = '';
      if (YOU_COM_API_KEY && assets.length > 0) {
        try {
          const youComQuery = `latest news and market movements for ${assets.join(' ')} cryptocurrency today`;
          const youComResponse = await fetch('https://api.ydc-index.io/search', {
            method: 'POST',
            headers: {
              'X-API-Key': YOU_COM_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: youComQuery,
              num_web_results: 5,
            }),
          });

          if (youComResponse.ok) {
            const youComData = await youComResponse.json();
            const hits = youComData.hits || [];
            
            // Extract market context from search results
            marketContext = hits
              .slice(0, 3)
              .map((hit: any) => `${hit.title}: ${hit.snippets?.[0] || ''}`)
              .join('\n\n');
            
            console.log('Fetched real-time market context from You.com');
          }
        } catch (youComError) {
          console.error('Error fetching You.com data:', youComError);
          // Continue without real-time data
        }
      }

      const systemPrompt = `You are a finance education quiz generator for Money Labs. 
Create exactly 3 multiple-choice questions about finance, markets, or investing.

User Context:
- Tracked Assets: ${assets.join(', ')}
- Risk Profile: ${riskProfile}
- Difficulty Level: ${difficulty}
- Current Streak: ${streak} days

${marketContext ? `Recent Market Events:\n${marketContext}\n` : ''}

Questions should be:
- Educational and appropriate for ${difficulty} level traders
- At least 1-2 questions should reference the user's tracked assets (${assets.join(', ')})
${marketContext ? '- Include 1 question based on today\'s real market events from the context above' : ''}
- Mix of concepts (technical indicators, market sentiment, risk management, current events)
- Include 1 correct answer and 3 plausible distractors
- Provide clear, educational explanations for correct answers

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "questions": [
    {
      "question": "Based on today's market movement, what does a Bitcoin price increase of 5% typically indicate?",
      "options": ["Bullish sentiment", "Bearish sentiment", "Neutral sentiment", "Market manipulation"],
      "correct_index": 0,
      "explanation": "A 5% price increase typically indicates bullish sentiment as more buyers are entering the market, driving demand and price up."
    }
  ]
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate 3 ${difficulty} level finance quiz questions personalized for a ${riskProfile} investor tracking ${assets.join(', ')}.` }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Gateway error:', response.status, errorText);
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error('Failed to generate quiz questions');
      }

      const aiData = await response.json();
      let content = aiData.choices[0].message.content;
      
      // Strip markdown code blocks if present
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Parse JSON from AI response
      let quizData;
      try {
        quizData = JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse AI response:', content);
        throw new Error('Invalid quiz data format');
      }

      return new Response(
        JSON.stringify({ 
          ...quizData, 
          context: { assets, riskProfile, difficulty, hasRealTimeData: !!marketContext }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Submit quiz answers and calculate score
    if (action === 'submit_answers') {
      const { questions, userAnswers } = answers;

      if (!questions || !Array.isArray(userAnswers) || userAnswers.length !== 3) {
        throw new Error('Invalid answers format');
      }

      // Calculate score
      let score = 0;
      const results = questions.map((q: any, idx: number) => {
        const isCorrect = userAnswers[idx] === q.correct_index;
        if (isCorrect) score++;
        return {
          question: q.question,
          userAnswer: userAnswers[idx],
          correctAnswer: q.correct_index,
          isCorrect,
          explanation: q.explanation,
        };
      });

      // Award bonus points based on score
      const pointsMap: { [key: number]: number } = { 0: 5, 1: 10, 2: 20, 3: 30 };
      const bonusPoints = pointsMap[score] || 5;

      // Check for new badges
      const newBadges: string[] = [];
      
      // Quiz Master badge (perfect score)
      if (score === 3) {
        const { data: stats } = await supabase
          .from('user_stats')
          .select('badges')
          .eq('user_id', user.id)
          .single();

        if (stats && !stats.badges?.includes('quiz_master')) {
          newBadges.push('quiz_master');
        }
      }

      // Save quiz completion
      const quizDate = new Date().toISOString().split('T')[0];
      const { error: insertError } = await supabase
        .from('daily_quiz_completions')
        .insert({
          user_id: user.id,
          quiz_date: quizDate,
          score,
          questions_data: { questions, userAnswers, results },
          bonus_points_awarded: bonusPoints,
        });

      if (insertError) {
        console.error('Error saving quiz completion:', insertError);
        throw insertError;
      }

      // Calculate quiz streak
      const { data: currentStats, error: statsError } = await supabase
        .from('user_stats')
        .select('points, badges, quiz_streak, last_quiz_date')
        .eq('user_id', user.id)
        .single();

      if (statsError) throw statsError;

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newQuizStreak = 1;
      if (currentStats?.last_quiz_date === yesterdayStr) {
        // Consecutive day - increment streak
        newQuizStreak = (currentStats.quiz_streak || 0) + 1;
      } else if (currentStats?.last_quiz_date === today) {
        // Already completed today (shouldn't happen due to check)
        newQuizStreak = currentStats.quiz_streak || 1;
      }
      // Otherwise streak resets to 1

      // Check for quiz streak badges
      if (newQuizStreak >= 7 && !currentStats.badges?.includes('quiz_streak_7')) {
        newBadges.push('quiz_streak_7');
      }
      if (newQuizStreak >= 30 && !currentStats.badges?.includes('knowledge_seeker')) {
        newBadges.push('knowledge_seeker');
      }

      const updatedBadges = [...(currentStats.badges || []), ...newBadges];
      const { error: updateError } = await supabase
        .from('user_stats')
        .update({
          points: (currentStats.points || 0) + bonusPoints,
          badges: updatedBadges,
          quiz_streak: newQuizStreak,
          last_quiz_date: today,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Send notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: score === 3 ? 'Perfect Quiz Score! 🎉' : 'Quiz Complete! ✅',
        message: `You scored ${score}/3 and earned ${bonusPoints} bonus points!`,
        type: 'achievement',
      });

      return new Response(
        JSON.stringify({
          score,
          bonusPoints,
          results,
          newBadges,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Daily quiz error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
