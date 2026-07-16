import { useState, useMemo, useCallback } from 'react';

interface Exercise {
  id: string;
  question?: string;
  answer?: string;
}

interface Props {
  exercises: Exercise[];
  onComplete: (score: number, answers: Record<string, string>) => void;
}

export default function DragDropExercise({ exercises, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  const items = useMemo(() => {
    return exercises
      .filter(ex => ex.question && ex.answer)
      .map(ex => ({
        id: ex.id,
        word: ex.answer!,
        translation: ex.question!,
      }))
      .slice(0, 6);
  }, [exercises]);

  const current = items[currentIndex];
  const total = items.length;
  const isCurrentPlaced = !!placed[current?.id];

  const handleSelectWord = useCallback((word: string) => {
    if (isCurrentPlaced || finished) return;
    setSelected(word);
  }, [isCurrentPlaced, finished]);

  const handlePlace = useCallback(() => {
    if (!selected || !current || isCurrentPlaced || finished) return;
    const isCorrect = selected.toLowerCase() === current.word.toLowerCase();
    setPlaced({ ...placed, [current.id]: selected });
    setSelected(null);

    setTimeout(() => {
      if (currentIndex < total - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        const correct = items.filter(ex => placed[ex.id]?.toLowerCase() === ex.word.toLowerCase() || (ex.id === current.id && isCorrect)).length;
        const finalCorrect = isCorrect ? correct + 1 : correct;
        const score = Math.round((finalCorrect / total) * 100);
        setFinished(true);
        const answers: Record<string, string> = {};
        items.forEach(ex => { answers[ex.id] = placed[ex.id] || (ex.id === current.id ? selected : ''); });
        onComplete(score, answers);
      }
    }, 600);
  }, [selected, current, placed, currentIndex, total, items, finished, onComplete]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelected(null);
    setPlaced({});
    setFinished(false);
  };

  if (items.length === 0) {
    return (
      <div className="text-center p-8 text-slate-400">
        <p className="text-3xl mb-2">🎯</p>
        <p>No hay ejercicios disponibles para Drag & Drop.</p>
      </div>
    );
  }

  if (finished) {
    const correct = items.filter(ex => placed[ex.id]?.toLowerCase() === ex.word.toLowerCase()).length;
    return (
      <div className="text-center p-8">
        <p className="text-5xl mb-4">{correct === total ? '🏆' : correct >= total * 0.7 ? '🎉' : '💪'}</p>
        <h3 className="text-2xl font-bold text-white mb-2">¡Completado!</h3>
        <p className="text-4xl font-bold text-amber-400 mb-2">{correct}/{total}</p>
        <p className="text-slate-400 mb-6">
          {correct === total ? '¡Emparejaste todas correctamente!' : `${Math.round((correct / total) * 100)}% correcto`}
        </p>
        <button onClick={handleRestart} className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all">
          🔄 Intentar de nuevo
        </button>
      </div>
    );
  }

  const usedWords = new Set(Object.values(placed));
  const shuffledWords = useMemo(() => {
    const words = items.map(i => i.word);
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    return words;
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Pregunta {currentIndex + 1} de {total}</span>
        <span className="text-blue-400">{Object.keys(placed).length} emparejadas</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div className="bg-cyan-600 h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / total) * 100}%` }}></div>
      </div>

      {/* CURRENT QUESTION */}
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 text-center">
        <p className="text-slate-400 text-sm mb-2">Selecciona la palabra correcta para:</p>
        <p className="text-xl text-white font-bold">{current.translation}</p>
        {isCurrentPlaced && (
          <div className={`mt-3 p-2 rounded-lg text-sm ${placed[current.id]?.toLowerCase() === current.word.toLowerCase() ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {placed[current.id]?.toLowerCase() === current.word.toLowerCase() ? '✅ ¡Correcto!' : `❌ Era: ${current.word}`}
          </div>
        )}
      </div>

      {/* WORD BANK */}
      <div className="grid grid-cols-3 gap-2">
        {shuffledWords.map((word, i) => {
          const isUsed = usedWords.has(word) && !(word === selected && !isCurrentPlaced);
          const isSelected = word === selected;
          return (
            <button
              key={`${word}-${i}`}
              onClick={() => handleSelectWord(word)}
              disabled={isUsed || isCurrentPlaced}
              className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-900/30 text-cyan-400 scale-105'
                  : isUsed
                    ? 'border-slate-700 bg-slate-800/30 text-slate-600 cursor-not-allowed'
                    : 'border-slate-600 bg-slate-800 text-white hover:border-slate-500'
              }`}
            >
              {word}
            </button>
          );
        })}
      </div>

      {/* CONFIRM BUTTON */}
      {selected && !isCurrentPlaced && (
        <button
          onClick={handlePlace}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold transition-all"
        >
          ✓ Confirmar selección
        </button>
      )}

      {/* PLACED ITEMS SUMMARY */}
      {Object.keys(placed).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Emparejamientos:</p>
          {items.filter(ex => placed[ex.id]).map(ex => {
            const isCorrect = placed[ex.id]?.toLowerCase() === ex.word.toLowerCase();
            return (
              <div key={ex.id} className={`flex items-center justify-between p-2 rounded-lg text-sm ${isCorrect ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                <span className="text-slate-300">{ex.translation}</span>
                <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                  {isCorrect ? '✓' : '✗'} {placed[ex.id]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}