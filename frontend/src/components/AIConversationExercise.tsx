import { useState, useRef, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Message {
  role: 'ai' | 'user';
  text: string;
}

interface Props {
  lessonContext: string;
  subtopicId: string;
  world: string;
  userContext?: Record<string, any>;
  onComplete?: (score: number) => void;
}

export default function AIConversationExercise({ lessonContext, subtopicId, world, userContext, onComplete }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turns, setTurns] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MAX_TURNS = 8;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages([{
      role: 'ai',
      text: `¡Hola! Soy tu tutor de inglés. Vamos a practicar conversación sobre esta lección. ${lessonContext.substring(0, 100)}... Puedes preguntar o hablar sobre cualquier tema. ¡Empieza!`
    }]);
  }, [lessonContext]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isFinished) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setTurns(prev => prev + 1);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/course/feedback/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercises: [{
            question: `AI Conversation (${subtopicId}): User said: "${userMsg}". Respond as a friendly A1 English tutor. Keep responses SHORT (1-2 sentences max). Use simple A1 vocabulary. Correct any grammar mistakes gently. Ask a follow-up question.`,
            user_answer: userMsg,
            correct_answer: userMsg,
          }],
          user_context: { ...userContext, world, activity: 'conversation' }
        })
      });

      const data = await response.json();
      const feedback = data.feedbacks?.[0];
      const aiResponse = feedback?.feedback || "I'm sorry, I didn't understand. Can you try again?";

      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't respond. Try again!" }]);
    } finally {
      setIsLoading(false);
    }

    if (turns + 1 >= MAX_TURNS) {
      setTimeout(() => {
        const userMsgs = messages.filter(m => m.role === 'user').length;
        const finalScore = Math.min(100, Math.round((userMsgs / MAX_TURNS) * 100));
        setScore(finalScore);
        setIsFinished(true);
        onComplete?.(finalScore);
      }, 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRestart = () => {
    setMessages([{
      role: 'ai',
      text: `¡Hola de nuevo! ¿Listo para practicar conversación? ¡Pregúntame algo o cuéntame algo!`
    }]);
    setInput('');
    setTurns(0);
    setScore(null);
    setIsFinished(false);
  };

  if (isFinished && score !== null) {
    return (
      <div className="text-center p-8">
        <p className="text-5xl mb-4">{score >= 80 ? '🗣️' : score >= 50 ? '💬' : '📝'}</p>
        <h3 className="text-2xl font-bold text-white mb-2">¡Conversación Completada!</h3>
        <p className="text-4xl font-bold text-amber-400 mb-2">{score}/100</p>
        <p className="text-slate-400 mb-4">Participaste en {turns} intercambios</p>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-6 text-left max-h-48 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block px-3 py-1.5 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-900/30 text-blue-300' : 'bg-slate-700 text-slate-300'}`}>
                {msg.text}
              </span>
            </div>
          ))}
        </div>
        <button onClick={handleRestart} className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all">
          🔄 Conversar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96">
      {/* HEADER */}
      <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-t-xl border border-slate-700 border-b-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm">🤖</div>
          <span className="text-white font-semibold text-sm">AI Tutor</span>
        </div>
        <span className="text-slate-400 text-xs">{turns}/{MAX_TURNS} mensajes</span>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/30 border-x border-slate-700">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-slate-700 text-slate-200 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="flex gap-2 p-3 bg-slate-900/50 rounded-b-xl border border-slate-700 border-t-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe en inglés..."
          disabled={isLoading}
          className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-semibold text-sm transition-all"
        >
          ➤
        </button>
      </div>
    </div>
  );
}