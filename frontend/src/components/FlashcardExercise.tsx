import { useState, useMemo } from 'react';

interface Exercise {
  id: string;
  question?: string;
  answer?: string;
}

interface Props {
  exercises: Exercise[];
  onComplete: (score: number, answers: Record<string, string>) => void;
}

export default function FlashcardExercise({ exercises, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const cards = useMemo(() => {
    return exercises
      .filter(ex => ex.question && ex.answer)
      .slice(0, 10);
  }, [exercises]);

  if (cards.length === 0) {
    return (
      <div className="text-center p-8 text-slate-400">
        <p className="text-3xl mb-2">🃏</p>
        <p>No hay tarjetas disponibles.</p>
      </div>
    );
  }

  const current = cards[currentIndex];
  const total = cards.length;
  const knownCount = Object.values(known).filter(Boolean).length;

  const handleKnow = (know: boolean) => {
    const newKnown = { ...known, [current.id]: know };
    setKnown(newKnown);
    setIsFlipped(false);

    setTimeout(() => {
      if (currentIndex < total - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        const score = Math.round((knownCount / total) * 100);
        setFinished(true);
        const answers: Record<string, string> = {};
        cards.forEach(c => { answers[c.id] = known[c.id] ? 'known' : 'unknown'; });
        onComplete(score, answers);
      }
    }, 400);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnown({});
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="text-center p-8">
        <p className="text-5xl mb-4">{knownCount === total ? '🌟' : knownCount >= total * 0.7 ? '👍' : '📚'}</p>
        <h3 className="text-2xl font-bold text-white mb-2">¡Flashcards Completadas!</h3>
        <p className="text-4xl font-bold text-amber-400 mb-2">{knownCount}/{total}</p>
        <p className="text-slate-400 mb-6">
          {knownCount === total ? '¡Dominas todo el vocabulario!' : `Sabes ${Math.round((knownCount / total) * 100)}% de las palabras`}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={handleRestart} className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all">
            🔄 Repetir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Tarjeta {currentIndex + 1} de {total}</span>
        <span className="text-green-400 font-semibold">✅ {knownCount} sabidas</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / total) * 100}%` }}></div>
      </div>

      {/* FLASHCARD */}
      <div
        className="relative h-56 cursor-pointer perspective-1000"
        onClick={() => !isFlipped && setIsFlipped(true)}
        style={{ perspective: '1000px' }}
      >
        <div
          className={`absolute inset-0 transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* FRONT */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-purple-600 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 p-8 ${isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-purple-400 text-sm font-semibold mb-4 uppercase tracking-wide">Pregunta</p>
            <p className="text-2xl text-white font-bold text-center">{current.question}</p>
            <p className="text-slate-500 text-sm mt-6">👆 Toca para voltear</p>
          </div>

          {/* BACK */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-green-600 bg-gradient-to-br from-green-900/50 to-emerald-900/50 p-8 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-green-400 text-sm font-semibold mb-4 uppercase tracking-wide">Respuesta</p>
            <p className="text-3xl text-white font-bold text-center">{current.answer}</p>
          </div>
        </div>
      </div>

      {/* BOTONES */}
      {isFlipped && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleKnow(false)}
            className="p-4 rounded-xl border-2 border-red-600 bg-red-900/30 text-red-400 font-bold text-lg hover:bg-red-900/50 transition-all"
          >
            ❌ No lo sé
          </button>
          <button
            onClick={() => handleKnow(true)}
            className="p-4 rounded-xl border-2 border-green-600 bg-green-900/30 text-green-400 font-bold text-lg hover:bg-green-900/50 transition-all"
          >
            ✅ ¡Lo sé!
          </button>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-2">
        {cards.map((card, i) => (
          <div
            key={card.id}
            className={`w-3 h-3 rounded-full transition-all ${
              i === currentIndex ? 'bg-purple-500 scale-125' :
              known[card.id] === true ? 'bg-green-500' :
              known[card.id] === false ? 'bg-red-500' :
              'bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}