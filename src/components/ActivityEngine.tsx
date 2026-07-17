import { useState, useMemo } from 'react';

interface Props {
  onNavigateToGames?: (gameType?: string) => void;
}

// 1. Definimos un tipo para el estado de actividades que acepta cualquier string como clave
type ActivityState = Record<string, boolean>;

// 2. Definimos interfaces para las categorías y sus items
interface ActivityItem {
  id: string;
  name: string;
  desc: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ai: boolean;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  items: ActivityItem[];
}

const ActivityEngine = ({ onNavigateToGames }: Props) => {
  // 3. Aplicamos el tipo ActivityState al useState
  const [activities, setActivities] = useState<ActivityState>({
    multiple_choice: true,
    true_false: true,
    drag_drop: true,
    unscramble_sentence: true,
    short_answer: false,
    ai_writing_eval: true,
    listen_and_choose: true,
    pronunciation_practice: true,
    ai_conversation: true,
    reading_comp: true,
    flashcards: true,
    hangman: false,
    timed_quiz: true,
  });

  // 4. Tipamos el array de categorías
  const categories: Category[] = [
    {
      id: 'choice',
      title: 'Multiple Choice',
      icon: '☑️',
      items: [
        { id: 'multiple_choice', name: 'Multiple Choice', desc: 'Select the correct option from a list.', difficulty: 'Easy', ai: true },
        { id: 'true_false', name: 'True / False', desc: 'Determine if a statement is correct.', difficulty: 'Easy', ai: false },
      ]
    },
    {
      id: 'drag',
      title: 'Drag & Drop',
      icon: '✋',
      items: [
        { id: 'drag_drop', name: 'Drag and Drop', desc: 'Match items by dragging them.', difficulty: 'Medium', ai: false },
        { id: 'unscramble_sentence', name: 'Build a Sentence', desc: 'Arrange words in the correct order.', difficulty: 'Medium', ai: true },
      ]
    },
    {
      id: 'writing',
      title: 'Writing',
      icon: '✍️',
      items: [
        { id: 'short_answer', name: 'Short Answer', desc: 'Type a brief response.', difficulty: 'Medium', ai: false },
        { id: 'ai_writing_eval', name: 'AI Writing Evaluation', desc: 'Get instant AI feedback on grammar.', difficulty: 'Hard', ai: true },
      ]
    },
    {
      id: 'listening',
      title: 'Listening',
      icon: '🎧',
      items: [
        { id: 'listen_and_choose', name: 'Listen and Choose', desc: 'Select the correct audio response.', difficulty: 'Easy', ai: false },
      ]
    },
    {
      id: 'speaking',
      title: 'Speaking',
      icon: '🎤',
      items: [
        { id: 'pronunciation_practice', name: 'Pronunciation Practice', desc: 'Repeat phrases with AI phonetic scoring.', difficulty: 'Medium', ai: true },
      ]
    },
    {
      id: 'reading',
      title: 'Reading',
      icon: '📖',
      items: [
        { id: 'reading_comp', name: 'Reading Comprehension', desc: 'Answer questions based on a text.', difficulty: 'Medium', ai: true },
      ]
    },
    {
      id: 'vocab',
      title: 'Vocabulary',
      icon: '🔤',
      items: [
        { id: 'flashcards', name: 'Flashcards', desc: 'Interactive word and image cards.', difficulty: 'Easy', ai: false },
      ]
    },
    {
      id: 'games',
      title: 'Games',
      icon: '🎮',
      items: [
        { id: 'hangman', name: 'Hangman', desc: 'Guess the word letter by letter.', difficulty: 'Medium', ai: false },
      ]
    },
    {
      id: 'ai',
      title: 'Advanced AI',
      icon: '🧠',
      items: [
        { id: 'ai_conversation', name: 'AI Conversation', desc: 'Free-flowing chat with the AI tutor.', difficulty: 'Hard', ai: true },
      ]
    },
    {
      id: 'assessment',
      title: 'Assessment',
      icon: '🏆',
      items: [
        { id: 'timed_quiz', name: 'Timed Quiz', desc: 'Test knowledge under time pressure.', difficulty: 'Hard', ai: true },
      ]
    }
  ];

  const toggleActivity = (id: string) => {
    setActivities(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const stats = useMemo(() => {
    const keys = Object.keys(activities);
    return {
      total: keys.length,
      enabled: keys.filter(k => activities[k]).length,
      disabled: keys.filter(k => !activities[k]).length,
      aiCompatible: categories.flatMap(c => c.items).filter(i => i.ai && activities[i.id]).length
    };
  }, [activities, categories]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Stats Panel (Glassmorphism) */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Learning Activity Engine</h2>
            <p className="text-slate-400 mt-1">Configure and enable specific interaction types for AI lesson generation.</p>
          </div>
          <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
            <span>💾</span> Save Configuration
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Types', value: stats.total, color: 'text-white', bg: 'bg-slate-700/50' },
            { label: 'Enabled', value: stats.enabled, color: 'text-green-400', bg: 'bg-green-900/20' },
            { label: 'Disabled', value: stats.disabled, color: 'text-slate-400', bg: 'bg-slate-700/50' },
            { label: 'AI Compatible', value: stats.aiCompatible, color: 'text-purple-400', bg: 'bg-purple-900/20' },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} border border-white/5 rounded-2xl p-4 text-center backdrop-blur-sm`}>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((category) => (
          <div key={category.id} className="bg-slate-800/30 backdrop-blur-md border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/5">
              <span className="text-2xl">{category.icon}</span>
              <h3 className="text-xl font-bold text-white">{category.title}</h3>
            </div>
            
            <div className="space-y-3">
              {category.items.map((item) => (
                <div key={item.id} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/60 hover:border-white/10 transition-all duration-200">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold text-sm">{item.name}</h4>
                      {item.ai && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-purple-500/30">
                          AI
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                        item.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        item.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {item.difficulty}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onNavigateToGames?.(item.id)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-all"
                    >
                      Preview
                    </button>
                    {/* iOS Style Toggle */}
                    <button 
                      onClick={() => toggleActivity(item.id)}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none ${activities[item.id] ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${activities[item.id] ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityEngine;