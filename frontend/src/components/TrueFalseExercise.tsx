import { useState, useMemo } from 'react';

interface Exercise {
  id: string;
  type?: string;
  question?: string;
  options?: string[];
  answer?: string;
  words?: string[];
}

interface Props {
  exercises: Exercise[];
  onComplete: (score: number, answers: Record<string, string>) => void;
}

export default function TrueFalseExercise({ exercises, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  const tfExercises = useMemo(() => {
    return exercises
      .filter(ex => ex.type === 'multiple_choice' && ex.options && ex.options.length >= 2 && ex.answer)
      .map(ex => {
        const isTrueOption = ex.options!.some(o => o.toLowerCase() === ex.answer!.toLowerCase());
        return {
          ...ex,
          statement: `${ex.question?.replace('___', `(${ex.answer})`) || ex.answer}`,
          correctAnswer: isTrueOption ? 'True' : 'False',
        };
      })
      .slice(0, 10);
  }, [exercises]);

  if (tfExercises.length === 0) {
    return (
      <div className="text-center p-8 text-slate-400">
        <p className="text-3xl mb-2">📝</p>
        <p>No hay ejercicios disponibles para True/False.</p>
      </div>
    );
  }

  const current = tfExercises[currentIndex];
  const total = tfExercises.length;
  const answeredCount = Object.keys(answers).length;

  const handleAnswer = (choice: 'True' | 'False') => {
    if (answers[current.id]) return;
    const newAnswers = { ...answers, [current.id]: choice };
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIndex < total - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        const correct = tfExercises.filter(ex => answers[ex.id] === ex.correctAnswer || (ex.id === current.id && choice === current.correctAnswer)).length;
        const score = Math.round((correct / total) * 100);
        setFinished(true);
        onComplete(score, newAnswers);
      }
    }, 800);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnswers({});
    setFinished(false);
  };

  if (finished) {
    const correct = tfExercises.filter(ex => answers[ex.id] === ex.correctAnswer).length;
    return (
      <div className="text-center p-8">
        <p className="text-5xl mb-4">{correct === total ? '🏆' : correct >= total * 0.7 ? '🎉' : '💪'}</p>
        <h3 className="text-2xl font-bold text-white mb-2">¡Completado!</h3>
        <p className="text-4xl font-bold text-amber-400 mb-4">{correct}/{total}</p>
        <p className="text-slate-400 mb-6">{correct === total ? '¡Perfecto!' : `${Math.round((correct / total) * 100)}% correcto`}</p>
        <button onClick={handleRestart} className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all">
          🔄 Intentar de nuevo
        </button>
      </div>
    );
  }

  const answered = answers[current.id];
  const isCorrect = answered === current.correctAnswer;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Pregunta {currentIndex + 1} de {total}</span>
        <span className="text-slate-500">{answeredCount} respondidas</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / total) * 100}%` }}></div>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
        <p className="text-lg text-white font-medium mb-1">{current.statement}</p>
        <p className="text-slate-400 text-sm">¿Es verdadero o falso?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleAnswer('True')}
          disabled={!!answered}
          className={`p-6 rounded-xl border-2 text-lg font-bold transition-all ${
            answered === 'True'
              ? isCorrect
                ? 'bg-green-900/50 border-green-500 text-green-400'
                : 'bg-red-900/50 border-red-500 text-red-400'
              : 'bg-slate-800 border-slate-600 text-white hover:border-green-500 hover:bg-green-900/20'
          }`}
        >
          ✅ True
        </button>
        <button
          onClick={() => handleAnswer('False')}
          disabled={!!answered}
          className={`p-6 rounded-xl border-2 text-lg font-bold transition-all ${
            answered === 'False'
              ? isCorrect
                ? 'bg-green-900/50 border-green-500 text-green-400'
                : 'bg-red-900/50 border-red-500 text-red-400'
              : 'bg-slate-800 border-slate-600 text-white hover:border-red-500 hover:bg-red-900/20'
          }`}
        >
          ❌ False
        </button>
      </div>

      {answered && (
        <div className={`p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {isCorrect ? '✅ ¡Correcto!' : `❌ La respuesta correcta era: ${current.correctAnswer}`}
        </div>
      )}
    </div>
  );
}