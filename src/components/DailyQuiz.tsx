import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Brain, CheckCircle2, XCircle, Loader2, Trophy, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface QuizContext {
  assets: string[];
  riskProfile: string;
  difficulty: string;
  hasRealTimeData: boolean;
}

interface QuizResult {
  question: string;
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
}

export default function DailyQuiz() {
  const [status, setStatus] = useState<'not_started' | 'loading' | 'in_progress' | 'completed' | 'already_completed'>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizContext, setQuizContext] = useState<QuizContext | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [bonusPoints, setBonusPoints] = useState<number | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  useEffect(() => {
    checkQuizStatus();
  }, []);

  const checkQuizStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('daily-quiz', {
        body: { action: 'check_status' }
      });

      if (error) throw error;

      if (data.completed) {
        setStatus('already_completed');
        setFinalScore(data.score);
        setBonusPoints(data.bonusPoints);
      } else {
        setStatus('not_started');
      }
    } catch (error) {
      console.error('Error checking quiz status:', error);
      toast.error('Failed to load quiz status');
      setStatus('not_started');
    }
  };

  const startQuiz = async () => {
    setStatus('loading');
    try {
      const { data, error } = await supabase.functions.invoke('daily-quiz', {
        body: { action: 'generate_quiz' }
      });

      if (error) throw error;

      if (!data.questions || data.questions.length !== 3) {
        throw new Error('Invalid quiz data');
      }

      setQuestions(data.questions);
      setQuizContext(data.context || null);
      setUserAnswers([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setStatus('in_progress');
      
      if (data.context?.hasRealTimeData) {
        toast.success('Quiz generated with today\'s market data! 📊');
      }
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      
      if (error.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('Payment required')) {
        toast.error('AI credits depleted. Please contact support.');
      } else {
        toast.error('Failed to generate quiz. Please try again.');
      }
      
      setStatus('not_started');
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (!showFeedback) {
      setSelectedAnswer(answerIndex);
    }
  };

  const submitAnswer = () => {
    if (selectedAnswer === null) {
      toast.error('Please select an answer');
      return;
    }

    setUserAnswers([...userAnswers, selectedAnswer]);
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setStatus('loading');
    
    // Validate we have exactly 3 answers
    if (userAnswers.length !== questions.length) {
      console.error('Answer count mismatch:', { 
        userAnswers: userAnswers.length, 
        questions: questions.length 
      });
      toast.error('Please answer all questions');
      setStatus('in_progress');
      return;
    }

    const allAnswers = userAnswers;

    try {
      const { data, error } = await supabase.functions.invoke('daily-quiz', {
        body: {
          action: 'submit_answers',
          answers: {
            questions,
            userAnswers: allAnswers
          }
        }
      });

      if (error) throw error;

      setFinalScore(data.score);
      setBonusPoints(data.bonusPoints);
      setResults(data.results);
      setNewBadges(data.newBadges || []);
      setStatus('completed');

      if (data.score === 3) {
        toast.success('🎉 Perfect score! You earned ' + data.bonusPoints + ' bonus points!');
      } else {
        toast.success('Quiz complete! You earned ' + data.bonusPoints + ' points.');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz. Please try again.');
      setStatus('in_progress');
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = showFeedback && selectedAnswer === currentQuestion?.correct_index;

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (status === 'already_completed') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Quiz Complete! ✅
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg">You've already completed today's quiz.</p>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="font-semibold">Your Score: {finalScore}/3</p>
            <p className="text-sm text-muted-foreground">Bonus Points Earned: +{bonusPoints}</p>
          </div>
          <p className="text-sm text-muted-foreground">Come back tomorrow for a new quiz! 🧪</p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'not_started') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Daily Knowledge Quiz 🧪
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Test your finance knowledge with 3 questions and earn bonus points!
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <p className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" /> Answer all correctly: +30 points
            </p>
            <p className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Unlock the Quiz Master badge
            </p>
          </div>
          <Button onClick={startQuiz} size="lg" className="w-full">
            Take Today's Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === 'in_progress' && currentQuestion) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Question {currentQuestionIndex + 1} of 3
            </span>
            <div className="flex items-center gap-2">
              {quizContext?.hasRealTimeData && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Real-time
                </Badge>
              )}
              {quizContext?.difficulty && (
                <Badge variant="outline" className="text-xs capitalize">
                  {quizContext.difficulty}
                </Badge>
              )}
              <span className="text-sm font-normal text-muted-foreground">
                {currentQuestionIndex + 1}/3
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg font-medium">{currentQuestion.question}</p>
          
          <RadioGroup
            value={selectedAnswer?.toString()}
            onValueChange={(val) => handleAnswerSelect(parseInt(val))}
            disabled={showFeedback}
          >
            {currentQuestion.options.map((option, idx) => (
              <div
                key={idx}
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                  showFeedback
                    ? idx === currentQuestion.correct_index
                      ? 'border-green-500 bg-green-50 dark:bg-green-950'
                      : idx === selectedAnswer
                      ? 'border-red-500 bg-red-50 dark:bg-red-950'
                      : 'border-border'
                    : selectedAnswer === idx
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                <Label
                  htmlFor={`option-${idx}`}
                  className="flex-1 cursor-pointer flex items-center justify-between"
                >
                  <span>{option}</span>
                  {showFeedback && idx === currentQuestion.correct_index && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {showFeedback && idx === selectedAnswer && idx !== currentQuestion.correct_index && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {showFeedback && (
            <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
              <p className="font-semibold mb-2">
                {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
              </p>
              <p className="text-sm">{currentQuestion.explanation}</p>
            </div>
          )}

          {!showFeedback ? (
            <Button onClick={submitAnswer} className="w-full" disabled={selectedAnswer === null}>
              Submit Answer
            </Button>
          ) : (
            <Button onClick={nextQuestion} className="w-full">
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (status === 'completed') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Quiz Complete! {finalScore === 3 ? '🎉' : '✅'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 text-center">
            <p className="text-3xl font-bold mb-2">{finalScore}/3</p>
            <p className="text-muted-foreground">Questions Correct</p>
            <p className="text-2xl font-semibold text-primary mt-4">+{bonusPoints} Points</p>
          </div>

          {newBadges.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4">
              <p className="font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                New Badge Unlocked!
              </p>
              <p className="text-sm mt-1">Quiz Master - Get a perfect score</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="font-semibold">Review Your Answers:</p>
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border-2 ${
                  result.isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'
                }`}
              >
                <p className="font-medium text-sm">Q{idx + 1}: {result.question}</p>
                <p className="text-sm mt-1">
                  {result.isCorrect ? '✅ Correct' : `❌ Incorrect - ${result.explanation}`}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center text-muted-foreground">
            Come back tomorrow for a new quiz! 🧪
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
