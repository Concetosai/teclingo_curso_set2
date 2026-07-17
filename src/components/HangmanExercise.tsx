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

const MAX_WRONG = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function HangmanExercise({ exercises, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, 'won' | 'lost'>>({});
  const [finished, setFinished] = useState(false);

  const words = useMemo(() => {
    return exercises
      .filter(ex => ex.answer && ex.answer.length > 1)
      .map(ex => ({
        id: ex.id,
        word: ex.answer!.toUpperCase().replace(/[^A-Z\s]/g, ''),
        hint: ex.question || '',
      }))
      .slice(0, 8);
  }, [exercises]);

  const current = words[currentIndex];
  const total = words.length;
  const wrongGuesses = useMemo(() => {
    return [...guessedLetters].filter(l => !current?.word.includes(l)).length;
  }, [guessedLetters, current]);
  const won = current?.word.split('').every(l => l === ' ' || guessedLetters.has(l));
  const lost = wrongGuesses >= MAX_WRONG;

  const handleGuess = useCallback((letter: string) => {
    if (guessedLetters.has(letter) || won || lost || finished) return;
    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);
  }, [guessedLetters, won, lost, finished]);

  const goToNext = useCallback(() => {
    const newResults = { ...results, [current.id]: won ? 'won' : 'lost' };
    setResults(newResults);
    setGuessedLetters(new Set());
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const wins = Object.values(newResults).filter(r => r === 'won').length;
      const score = Math.round((wins / total) * 100);
      setFinished(true);
      const answers: Record<string, string> = {};
      Object.entries(newResults).forEach(([id, result]) => { answers[id] = result; });
      onComplete(score, answers);
    }
  }, [current, currentIndex, total, won, results, onComplete]);

  if (words.length === 0) {
    return (
      <div className="text-center p-8 text-slate-400">
        <p className="text-3xl mb-2">🎯</p>
        <p>No hay palabras disponibles para Hangman.</p>
      </div>
    );
  }

  if (finished) {
    const wins = Object.values(results).filter(r => r === 'won').length;
    return (
      <div className="text-center p-8">
        <p className="text-5xl mb-4">{wins === total ? '🏆' : wins >= total * 0.7 ? '🎉' : '💪'}</p>
        <h3 className="text-2xl font-bold text-white mb-2">¡Hangman Completado!</h3>
        <p className="text-4xl font-bold text-amber-400 mb-2">{wins}/{total}</p>
        <p className="text-slate-400 mb-6">
          {wins === total ? '¡Perfecto! Adivinaste todas las palabras' : `Adivinaste ${Math.round((wins / total) * 100)}% de las palabras`}
        </p>
        <button onClick={() => { setCurrentIndex(0); setGuessedLetters(new Set()); setResults({}); setFinished(false); }}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all">
          🔄 Jugar de nuevo
        </button>
      </div>
    );
  }

  const wordDisplay = current.word.split('').map((letter, i) => {
    if (letter === ' ') return <span key={i} className="w-3 mx-1"></span>;
    const revealed = guessedLetters.has(letter) || won || lost;
    return (
      <span key={i} className={`inline-block w-8 h-10 border-b-2 mx-0.5 text-center text-xl font-bold transition-all ${revealed ? (won ? 'text-green-400 border-green-400' : 'text-white border-white') : 'text-transparent border-slate-500'}`}>
        {revealed ? letter : '_'}
      </span>
    );
  });

  const bodyParts = [
    <circle key="head" cx="50" cy="20" r="8" stroke="currentColor" strokeWidth="2" fill="none" />,
    <line key="body" x1="50" y1="28" x2="50" y2="55" stroke="currentColor" strokeWidth="2" />,
    <line key="leftArm" x1="50" y1="35" x2="35" y2="45" stroke="currentColor" strokeWidth="2" />,
    <line key="rightArm" x1="50" y1="35" x2="65" y2="45" stroke="currentColor" strokeWidth="2" />,
    <line key="leftLeg" x1="50" y1="55" x2="38" y2="72" stroke="currentColor" strokeWidth="2" />,
    <line key="rightLeg" x1="50" y1="55" x2="62" y2="72" stroke="currentColor" strokeWidth="2" />,
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Palabra {currentIndex + 1} de {total}</span>
        <span className="text-red-400">❌ {wrongGuesses}/{MAX_WRONG} errores</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div className="bg-orange-600 h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / total) * 100}%` }}></div>
      </div>

      {/* HANGMAN SVG */}
      <div className="flex justify-center">
        <svg width="100" height="85" className="text-slate-400">
          <line x1="10" y1="80" x2="70" y2="80" stroke="currentColor" strokeWidth="3" />
          <line x1="30" y1="80" x2="30" y2="5" stroke="currentColor" strokeWidth="3" />
          <line x1="30" y1="5" x2="50" y2="5" stroke="currentColor" strokeWidth="3" />
          <line x1="50" y1="5" x2="50" y2="12" stroke="currentColor" strokeWidth="2" />
          {bodyParts.slice(0, wrongGuesses)}
        </svg>
      </div>

      {/* HINT */}
      {current.hint && (
        <div className="text-center text-sm text-slate-400 italic">
          Pista: {current.hint}
        </div>
      )}

      {/* WORD */}
      <div className="flex justify-center py-4">{wordDisplay}</div>

      {/* KEYBOARD */}
      <div className="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto">
        {ALPHABET.map(letter => {
          const guessed = guessedLetters.has(letter);
          const inWord = current.word.includes(letter);
          return (
            <button
              key={letter}
              onClick={() => handleGuess(letter)}
              disabled={guessed || won || lost}
              className={`w-8 h-9 rounded-lg text-xs font-bold transition-all ${
                guessed
                  ? inWord
                    ? 'bg-green-900/50 border border-green-600 text-green-400'
                    : 'bg-red-900/50 border border-red-600 text-red-400'
                  : 'bg-slate-700 border border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500'
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* STATUS */}
      {(won || lost) && (
        <div className="text-center">
          <div className={`p-4 rounded-xl mb-4 ${won ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`}>
            {won ? (
              <p className="text-green-400 font-bold">🎉 ¡Adivinaste! La palabra es: <span className="text-xl">{current.word}</span></p>
            ) : (
              <p className="text-red-400 font-bold">💀 La palabra era: <span className="text-xl">{current.word}</span></p>
            )}
          </div>
          <button onClick={goToNext} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all">
            {currentIndex < total - 1 ? '➡️ Siguiente Palabra' : '🏁 Ver Resultados'}
          </button>
        </div>
      )}
    </div>
  );
}