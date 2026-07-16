import { useState, useEffect, useMemo } from 'react';

interface Exercise {
  id: string;
  type?: string;
  question?: string;
  options?: string[];
  answer?: string;
  prompt?: string;
}

interface Props {
  exercises: Exercise[];
  skill: string;
  timePerQuestion?: number;
  onComplete: (score: number, answers: Record<string, string>) => void;
}

export default function TimerQuizExercise({ exercises, skill, timePerQuestion = 15, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const quizExercises = useMemo(() => {
    if (skill === 'listening' || skill === 'reading') {
      return exercises.slice(0, 10);
    }
    return exercises
      .filter(ex => ex.options && ex.options.length >= 2)
      .slice(0, 10);
  }, [exercises, skill]);

  const total = quizExercises.length;
  const current = quizExercises[currentIndex];

  useEffect(() => {
    if (quizExercises.length > 0 && !finished) {
      setIsRunning(true);
      setTimeLeft(timePerQuestion);
    }
  }, [currentIndex, quizExercises.length, finished, timePerQuestion]);

  useEffect(() => {
    if (!isRunning || finished) return;
    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isRunning, finished]);

  const handleTimeout = () => {
    setIsRunning(false);
    setShowResult(true);
    const newAnswers = { ...answers, [current.id]: 'TIMEOUT' };
    setAnswers(newAnswers);
    setTimeout(() => {
      moveToNext(newAnswers);
    }, 1000);
  };

  const handleAnswer = (answer: string) => {
    if (showResult || finished) return;
    setIsRunning(false);
    setShowResult(true);
    const newAnswers = { ...answers, [current.id]: answer };
    setAnswers(newAnswers);
    setTimeout(() => {
      moveToNext(newAnswers);
    }, 800);
  };

  const moveToNext = (currentAnswers: Record<string, string>) => {
    setShowResult(false);
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const correct = quizExercises.filter(ex => {
        const userAns = currentAnswers[ex.id];
        if (!userAns || userAns === 'TIMEOUT') return false;
        if (ex.options) return userAns === ex.answer;
        return userAns.toLowerCase().trim() === (ex.answer || '').toLowerCase().trim();
      }).length;
      const score = Math.round((correct / total) * 100);
      setFinished(true);
      onComplete(score, currentAnswers);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnswers({});
    setTimeLeft(timePerQuestion);
    setIsRunning(false);
    setFinished(false);
    setShowResult(false);
  };

  if (quizExercises.length === 0) {
    return (
      <div className="text-center p-8 text-slate-400">
        <p className="text-3xl mb-2">⏱️</p>
        <p>No hay ejercicios disponibles para Timed Quiz.</p>
      </div>
    );
  }

  if (finished) {
    const correct = quizExercises.filter(ex => {
      const userAns = answers[ex.id];
      if (!userAns || userAns === 'TIMEOUT') return false;
      if (ex.options) return userAns === ex.answer;
      return userAns.toLowerCase().trim() === (ex.answer || '').toLowerCase().trim();
    }).length;
    return (
      <div className="text-center p-8">
        <p className="text-5xl mb-4">{correct === total ? '🏆' : correct >= total * 0.7 ? '🎉' : '💪'}</p>
        <h3 className="text-2xl font-bold text-white mb-2">¡Quiz Completado!</h3>
        <p className="text-4xl font-bold text-amber-400 mb-2">{correct}/{total}</p>
        <p className="text-slate-400 mb-6">
          {correct === total ? '¡Perfecto bajo presión!' : `${Math.round((correct / total) * 100)}% correcto`}
        </p>
        <button onClick={handleRestart} className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all">
          🔄 Intentar de nuevo
        </button>
      </div>
    );
  }

  const timerColor = timeLeft > 10 ? 'text-green-400' : timeLeft > 5 ? 'text-yellow-400' : 'text-red-400';
  const timerBg = timeLeft > 10 ? 'bg-green-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-6">
      {/* TIMER + COUNTER */}
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-sm">Pregunta {currentIndex + 1} de {total}</span>
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-bold ${timerColor} font-mono`}>
            {timeLeft}s
          </div>
        </div>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-3 relative">
        <div
          className={`${timerBg} h-3 rounded-full transition-all`}
          style={{ width: `${(timeLeft / timePerQuestion) * 100}%` }}
        ></div>
      </div>

      {/* QUESTION */}
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
        <p className="text-lg text-white font-medium">{current.question || current.prompt}</p>
      </div>

      {/* OPTIONS */}
      {current.options && (
        <div className="space-y-3">
          {current.options.map((opt, i) => {
            const isSelected = answers[current.id] === opt;
            const isCorrect = opt === current.answer;
            let classes = 'w-full p-4 rounded-xl border-2 text-left transition-all font-medium ';
            if (showResult) {
              if (isCorrect) {
                classes += 'border-green-500 bg-green-900/30 text-green-400';
              } else if (isSelected && !isCorrect) {
                classes += 'border-red-500 bg-red-900/30 text-red-400';
              } else {
                classes += 'border-slate-700 bg-slate-800/50 text-slate-500';
              }
            } else {
              classes += 'border-slate-600 bg-slate-800 text-white hover:border-blue-500';
            }
            return (
              <button key={i} onClick={() => handleAnswer(opt)} disabled={showResult} className={classes}>
                <span className="mr-2 text-slate-400">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* TIMEOUT MESSAGE */}
      {showResult && answers[current.id] === 'TIMEOUT' && (
        <div className="p-3 rounded-lg bg-yellow-900/30 border border-yellow-600 text-yellow-400 text-sm">
          ⏱️ ¡Tiempo agotado! La respuesta era: {current.answer}
        </div>
      )}
    </div>
  );
}