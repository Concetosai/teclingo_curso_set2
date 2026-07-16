import { useState } from 'react';

interface UnscrambleExerciseProps {
  exercise: { words?: string[]; type?: string; question?: string; prompt?: string };
  index: number;
  userAnswer: string;
  onAnswerChange: (answer: string) => void;
  feedback?: { is_correct: boolean; score: number; feedback: string; pedagogical_reason: string };
  isLocked: boolean;
}

const UnscrambleExercise = ({ exercise, index, userAnswer, onAnswerChange, feedback, isLocked }: UnscrambleExerciseProps) => {
  const isUnscramble = exercise.type === 'unscramble' && Array.isArray(exercise.words) && exercise.words.length > 0;
  
  // Función para mezclar las palabras aleatoriamente al inicio
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const [bankWords, setBankWords] = useState<string[]>(isUnscramble ? shuffleArray(exercise.words!) : []);
  const selectedWords = userAnswer ? userAnswer.split(' ') : [];

  const moveToAnswer = (word: string, indexInBank: number) => {
    if (isLocked) return;
    const newBank = [...bankWords];
    newBank.splice(indexInBank, 1);
    setBankWords(newBank);
    onAnswerChange([...selectedWords, word].join(' '));
  };

  const moveToBank = (word: string, indexInAnswer: number) => {
    if (isLocked) return;
    const newAnswer = [...selectedWords];
    newAnswer.splice(indexInAnswer, 1);
    onAnswerChange(newAnswer.join(' '));
    setBankWords([...bankWords, word]);
  };

  const isCorrect = feedback?.is_correct;
  const borderColor = feedback 
    ? (isCorrect ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20') 
    : 'border-slate-600 bg-slate-800/50';

  const promptText = isUnscramble ? "Ordena la oración:" : (exercise.prompt || "Escribe tu respuesta:");

  // Si NO es un ejercicio de ordenar, mostrar textarea normal
  if (!isUnscramble) {
    return (
      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-4">
        <p className="text-slate-200 font-medium">{index + 1}. {promptText}</p>
        <textarea 
          value={userAnswer || ''} 
          onChange={(e) => !isLocked && onAnswerChange(e.target.value)} 
          disabled={isLocked}
          placeholder="Escribe tu respuesta aquí..." 
          className={`w-full p-3 rounded-lg border focus:outline-none transition-all ${isLocked ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed' : 'bg-slate-700 text-white border-slate-600 focus:border-purple-500'}`}
          rows={3}
        />
        {feedback && (
          <div className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
            <span className={`font-bold ${isCorrect ? 'text-green-400' : 'text-yellow-400'}`}>
              {isCorrect ? '✅ ¡Excelente!' : '💡 Necesita ajuste'} - Puntaje: {feedback.score}/100
            </span>
            <p className="text-slate-200 text-sm mt-1">{feedback.feedback}</p>
            <p className="text-slate-400 text-xs italic mt-1">📚 Fundamento: {feedback.pedagogical_reason}</p>
          </div>
        )}
      </div>
    );
  }

  // Diseño mejorado para ejercicios de ORDENAR ORACIONES
  return (
    <div className={`bg-slate-900/50 p-5 rounded-xl border space-y-5 transition-all ${isLocked ? 'opacity-80' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">Ejercicio {index + 1}</span>
        <p className="text-slate-200 font-semibold">{promptText}</p>
      </div>
      
      {/* ZONA DE RESPUESTA */}
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-2 font-semibold">Tu respuesta:</p>
        <div className={`min-h-[70px] p-4 rounded-xl border-2 border-dashed ${borderColor} flex flex-wrap gap-3 items-center transition-all`}>
          {selectedWords.length === 0 ? (
            <span className="text-slate-500 text-sm italic w-full text-center py-2">Toca las palabras del banco de abajo para formar la oración...</span>
          ) : (
            selectedWords.map((word, idx) => (
              <button
                key={`ans-${idx}`}
                onClick={() => moveToBank(word, idx)}
                disabled={isLocked}
                className={`px-5 py-2.5 rounded-lg font-bold text-lg shadow-md transition-all transform hover:scale-105 active:scale-95 ${isLocked ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white border-2 border-purple-400'}`}
              >
                {word}
              </button>
            ))
          )}
        </div>
      </div>

      {/* BANCO DE PALABRAS */}
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-2 font-semibold">Banco de palabras:</p>
        <div className="flex flex-wrap gap-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 min-h-[70px]">
          {bankWords.map((word, idx) => (
            <button
              key={`bank-${idx}`}
              onClick={() => moveToAnswer(word, idx)}
              disabled={isLocked}
              className={`px-5 py-2.5 rounded-lg font-bold text-lg border-2 transition-all transform hover:scale-105 active:scale-95 ${isLocked ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-500 hover:border-purple-500 hover:text-white shadow-sm'}`}
            >
              {word}
            </button>
          ))}
          {bankWords.length === 0 && !isLocked && (
            <span className="text-green-400 text-sm font-semibold italic w-full text-center py-2 animate-pulse">✨ ¡Oración completada! Revisa tu respuesta arriba.</span>
          )}
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`font-bold text-lg ${isCorrect ? 'text-green-400' : 'text-yellow-400'}`}>
              {isCorrect ? '✅ ¡Excelente!' : '💡 Necesita ajuste'} - Puntaje: {feedback.score}/100
            </span>
          </div>
          <p className="text-slate-200 text-sm">{feedback.feedback}</p>
          <p className="text-slate-400 text-xs italic mt-2 bg-slate-900/50 p-2 rounded">📚 Fundamento: {feedback.pedagogical_reason}</p>
          {!isCorrect && !isLocked && (
            <p className="text-yellow-400 text-sm mt-3 font-semibold animate-pulse flex items-center gap-2">
              <span>🔄</span> Tienes una oportunidad más para corregir esta respuesta.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default UnscrambleExercise;
