import { useState, useEffect, useRef } from 'react'
import './index.css'

const API_BASE = import.meta.env.VITE_API_URL || '';
import UnscrambleExercise from './components/UnscrambleExercise'
import WritingRulesPanel from './components/WritingRulesPanel'
import LibraryPanel from './components/LibraryPanel'
import ActivityEngine from './components/ActivityEngine'
import ExamPage from './components/ExamPage'
import TrueFalseExercise from './components/TrueFalseExercise'
import FlashcardExercise from './components/FlashcardExercise'
import HangmanExercise from './components/HangmanExercise'
import DragDropExercise from './components/DragDropExercise'
import TimerQuizExercise from './components/TimerQuizExercise'
import AIConversationExercise from './components/AIConversationExercise'
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import { loginConGoogle, logout, obtenerUsuarioActual } from './services/authService'
import { saveProgress, saveActivity, logEntrada, logSalida } from './services/sheetsService'

interface SubtopicData {
  title: string;
  mcer_descriptor?: string;
  mcer_goal?: string;
  theory?: string;
  vocabulary?: string[];
  exercises?: {
    grammar?: { id: string; type?: string; question: string; options?: string[]; words?: string[]; answer: string }[];
    vocabulary?: { id: string; question: string; answer: string }[];
    reading?: { text: string; questions: { id: string; question: string; options: string[]; answer: string }[] };
    listening?: { script: string; questions: { id: string; question: string; options: string[]; answer: string }[] };
    speaking?: { id: string; prompt: string }[];
    writing?: { id: string; type: string; question?: string; prompt?: string; words?: string[]; answer?: string }[];
    pronunciation?: { id: string; phrase: string; focus: string }[];
  };
}

interface SubtopicMenu { subtopic_id: string; title: string; sequence_order: number; }
interface BatchResult { is_correct: boolean; score: number; feedback: string; pedagogical_reason: string; rule_hint?: string; }
interface BatchFeedback { summary: string; results: BatchResult[]; }
type SkillTab = 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'writing' | 'pronunciation';
type MainTab = 'lesson' | 'settings' | 'progress' | 'library' | 'exam' | 'games';
type GameType = 'true_false' | 'flashcards' | 'hangman' | 'drag_drop' | 'timer_quiz' | 'ai_conversation' | null;

function loadExerciseState(userEmail: string, subtopicId: string) {
  try {
    const key = `teclingo_exercise_${userEmail}_${subtopicId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveExerciseState(userEmail: string, subtopicId: string, state: any) {
  try {
    const key = `teclingo_exercise_${userEmail}_${subtopicId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch {}
}

function extractSpokenPhrase(prompt: string): string {
  if (!prompt) return '';
  const firstQuote = prompt.search(/['"]/);
  if (firstQuote >= 0) {
    const lastQuote = prompt.lastIndexOf(prompt[firstQuote]);
    if (lastQuote > firstQuote) {
      return prompt.substring(firstQuote + 1, lastQuote).trim();
    }
  }
  const cleaned = prompt
    .replace(/^(say|dime|graba|habla|repeat|repite|introduce yourself|introduce a friend|introduce tu|introduce a|read aloud|lee en voz alta|lee|decir|responde)[\s:]+/i, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
  return cleaned || prompt;
}

function App() {
  const [user, setUser] = useState<any>(() => obtenerUsuarioActual());
  const [loggingIn, setLoggingIn] = useState(false);
  const [subtopicsList, setSubtopicsList] = useState<SubtopicMenu[]>([]);
  const [currentSubtopicId, setCurrentSubtopicId] = useState<string>('A1-M01-ST01');
  const [data, setData] = useState<SubtopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: string}>(() => {
    if (!user) return {};
    const saved = loadExerciseState(user.email, 'A1-M01-ST01');
    return saved?.selectedAnswers || {};
  });
  const [batchFeedbacks, setBatchFeedbacks] = useState<{[skill: string]: BatchFeedback}>(() => {
    if (!user) return {};
    const saved = loadExerciseState(user.email, 'A1-M01-ST01');
    return saved?.batchFeedbacks || {};
  });
  const [attempts, setAttempts] = useState<{[skill: string]: number}>(() => {
    if (!user) return {};
    const saved = loadExerciseState(user.email, 'A1-M01-ST01');
    return saved?.attempts || {};
  });
  const [completedSkills, setCompletedSkills] = useState<{[skill: string]: boolean}>(() => {
    if (!user) return {};
    const saved = loadExerciseState(user.email, 'A1-M01-ST01');
    return saved?.completedSkills || {};
  });
  const [evaluatingSkill, setEvaluatingSkill] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('lesson');
  const [skillTab, setSkillTab] = useState<SkillTab>('grammar');
  const [audioState, setAudioState] = useState<{ isPlaying: boolean; text: string }>({ isPlaying: false, text: '' });
  const [userContext, setUserContext] = useState({ country: 'México', city: 'Ciudad de México', institutional_world: 'tecnm' });
  const [realProgress, setRealProgress] = useState<any>(null);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [gameType, setGameType] = useState<GameType>(null);
  const [gameSkill, setGameSkill] = useState<string>('grammar');
  const [gameResults, setGameResults] = useState<{[key: string]: number}>({});
  const [navOpen, setNavOpen] = useState(false);
  const [showOnboardingManual, setShowOnboardingManual] = useState(false);
  const [_alternateExercises, setAlternateExercises] = useState<{[skill: string]: any}>({});
  const [openExercises, setOpenExercises] = useState<{[key: string]: boolean}>({});
  const [showScrollHint, setShowScrollHint] = useState(() => {
    return localStorage.getItem('teclingo_hide_scroll_hint') !== 'true';
  });
  const [showGuestAlert, setShowGuestAlert] = useState(false);
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);
  const [showHelpHint, setShowHelpHint] = useState(() => {
    return localStorage.getItem('teclingo_hide_help_hint') !== 'true';
  });
  const isGuest = user?.email?.includes('teclingo.local') || false;
  const recRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const [loadingAlternate, setLoadingAlternate] = useState<string | null>(null);
  const [isAlternateMode, setIsAlternateMode] = useState<{[skill: string]: boolean}>({});
  
  // Estados para el Modal de Ayuda
  const [showHelp, setShowHelp] = useState(false);
  const [currentHelpType, setCurrentHelpType] = useState<string>('grammar');

  const openHelp = (type: string) => {
    setCurrentHelpType(type);
    setShowHelp(true);
  };

  const userId = user?.email || 'anonymous';

  // ==========================================
  // DICCIONARIO DE INSTRUCCIONES POR HABILIDAD/JUEGO
  // ==========================================
  const helpInstructions: Record<string, { title: string; instructions: string[] }> = {
    grammar: {
      title: "Cómo funciona: Grammar",
      instructions: [
        "Lee la oración o pregunta cuidadosamente.",
        "Selecciona la opción correcta o toca las palabras del banco para ordenar la oración.",
        "Al terminar, presiona el botón morado 'Evaluar todo el bloque con IA'.",
        "La IA te dirá si está bien o te dará una pista. ¡Tienes 2 intentos!",
        "Si te equivocas, revisa la 'Regla gramatical' que te sugiere la IA."
      ]
    },
    vocabulary: {
      title: "Cómo funciona: Vocabulary",
      instructions: [
        "Primero, lee el texto y escucha el audio de referencia (si está disponible).",
        "Responde las preguntas escribiendo o seleccionando la palabra en inglés.",
        "Presta mucha atención a la ortografía (spelling).",
        "Presiona 'Evaluar' para que la IA revise tus respuestas."
      ]
    },
    reading: {
      title: "Cómo funciona: Reading",
      instructions: [
        "Lee el texto completo con calma. Puedes usar el botón '🔊 Escuchar texto'.",
        "Las preguntas aparecen abajo. Selecciona la opción que mejor responda según el texto.",
        "No necesitas saber todas las palabras, busca las ideas principales."
      ]
    },
    listening: {
      title: "Cómo funciona: Listening",
      instructions: [
        "Presiona '▶️ Play' para escuchar el diálogo o texto. Puedes pausarlo y repetirlo.",
        "Las preguntas están abajo. Elige la opción correcta basada en lo que escuchaste.",
        "Consejo: Anota mentalmente nombres, lugares o números mientras escuchas."
      ]
    },
    writing: {
      title: "Cómo funciona: Writing",
      instructions: [
        "Ordena las palabras para formar una oración correcta o escribe tu propia respuesta.",
        "Recuerda: Inicia con mayúscula y termina con punto (.)",
        "La IA evaluará tu gramática y te dará retroalimentación detallada.",
        "¡No copies la respuesta del ejercicio, intenta escribirlo tú!"
      ]
    },
    pronunciation: {
      title: "Cómo funciona: Speaking / Pronunciation",
      instructions: [
        "Presiona '🔊 Escuchar' para saber cómo debe sonar la frase.",
        "Presiona '🎤 Grabar' y lee la frase en voz alta y con claridad.",
        "El navegador te pedirá permiso para usar el micrófono la primera vez. Acepta.",
        "La IA comparará tu audio con la frase original y te dará un puntaje."
      ]
    },
    games: {
      title: "Cómo funcionan los Mini-Juegos",
      instructions: [
        "Elige una habilidad (Grammar, Vocabulary, etc.) en la parte superior.",
        "Selecciona el tipo de juego que prefieras (Flashcards, Hangman, Quiz, etc.).",
        "Los juegos son prácticos y sin límite de intentos. ¡Diviértete aprendiendo!",
        "Tu puntaje se guardará en tu historial de resultados."
      ]
    }
  };

  // Variables locales seguras (evitan errores "possibly undefined")
  const grammarExercises = data?.exercises?.grammar ?? [];
  const vocabularyExercises = data?.exercises?.vocabulary ?? [];
  const readingExercises = data?.exercises?.reading;
  const listeningExercises = data?.exercises?.listening;
  const writingExercises = data?.exercises?.writing ?? [];
  const speakingExercises = data?.exercises?.speaking ?? [];
  const pronunciationExercises = data?.exercises?.pronunciation ?? [];

  const loadAlternateExercises = async (skill: SkillTab) => {
    if (!data) return;
    setLoadingAlternate(skill);
    try {
      const response = await fetch(`${API_BASE}/api/course/generate-alternate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill,
          subtopic_id: currentSubtopicId,
          theory: data.theory || '',
          title: data.title || '',
          user_context: userContext
        })
      });
      const result = await response.json();
      if (result.exercises && result.exercises[skill]) {
        setAlternateExercises(prev => ({ ...prev, [skill]: result.exercises[skill] }));
        setIsAlternateMode(prev => ({ ...prev, [skill]: true }));
        setData(prev => prev ? { ...prev, exercises: { ...prev.exercises, [skill]: result.exercises[skill] } } : prev);
        setSelectedAnswers({});
        setBatchFeedbacks(prev => { const n = {...prev}; delete n[skill]; return n; });
        setAttempts(prev => ({ ...prev, [skill]: 0 }));
      }
    } catch (err) {
      console.error('Error loading alternate exercises:', err);
    } finally {
      setLoadingAlternate(null);
    }
  };

  const exitAlternateMode = (skill: SkillTab) => {
    setIsAlternateMode(prev => ({ ...prev, [skill]: false }));
    setSelectedAnswers({});
    setBatchFeedbacks(prev => { const n = {...prev}; delete n[skill]; return n; });
    setAttempts(prev => ({ ...prev, [skill]: 0 }));
    const worldParam = userContext.institutional_world;
    fetch(`${API_BASE}/api/course/subtopic/${currentSubtopicId}?world=${worldParam}`)
      .then(res => res.json())
      .then(original => setData(original))
      .catch(() => {});
  };

  const handleLogin = async () => {
    setLoggingIn(true);
    const result = await loginConGoogle();
    if (result.success) {
      setUser(result.usuario);
      logEntrada();
    }
    setLoggingIn(false);
  };

  const handleLogout = () => { logSalida('cerrar_sesion'); logout(); setUser(null); };
  
  const openOnboarding = () => {
    setShowOnboardingManual(true);
  };

  const isSkillPerfect = (skill: string): boolean => {
    const fb = batchFeedbacks[skill];
    if (!fb?.results || fb.results.length === 0) return false;
    return fb.results.every((r: any) => r.score === 100);
  };

  const allSkillsCompleted = (): boolean => {
    const skills: SkillTab[] = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'pronunciation'];
    return skills.every(s => completedSkills[s]);
  };

  const toggleExercise = (key: string) => {
    setOpenExercises(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getExerciseIcon = (fb: BatchResult | undefined, isLocked: boolean): string => {
    if (!fb) return '○';
    if (fb.is_correct) return '✅';
    if (isLocked) return '❌';
    return '📝';
  };

  const isExerciseOpen = (key: string): boolean => {
    return openExercises[key] === true;
  };

  const goToNextSkill = () => {
    const skills: SkillTab[] = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'pronunciation'];
    const currentIdx = skills.indexOf(skillTab);
    if (currentIdx >= 0 && currentIdx < skills.length - 1) {
      setSkillTab(skills[currentIdx + 1]);
      setOpenExercises({});
    } else {
      const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId);
      if (subIdx >= 0 && subIdx < subtopicsList.length - 1) {
        setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id);
      } else {
        setActiveTab('lesson');
      }
    }
  };

  const getNextSkillLabel = (): string => {
    const labels: Record<string, string> = { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', writing: 'Writing', pronunciation: 'Speaking' };
    const skills: SkillTab[] = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'pronunciation'];
    const idx = skills.indexOf(skillTab);
    if (idx >= 0 && idx < skills.length - 1) return labels[skills[idx + 1]] || 'Siguiente';
    return 'Siguiente lección';
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) logSalida('cierre_navegador');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  const adaptText = (text: string | null | undefined): string => {
    if (!text) return '';
    let adapted = text;
    if (userContext.institutional_world === 'tecnm') {
      adapted = adapted.replace(/the Campus/gi, 'el TecNM').replace(/Campus/gi, 'TecNM');
    } else if (userContext.institutional_world === 'empresa') {
      adapted = adapted.replace(/the Campus/gi, 'la Empresa').replace(/Campus/gi, 'Oficina');
    } else if (userContext.institutional_world === 'viajes') {
      adapted = adapted.replace(/the Campus/gi, 'el destino').replace(/Campus/gi, 'ciudad');
    } else if (userContext.institutional_world === 'vida_diaria') {
      adapted = adapted.replace(/the Campus/gi, 'mi comunidad').replace(/Campus/gi, 'barrio');
    } else if (userContext.institutional_world === 'usa_university') {
      adapted = adapted.replace(/the Campus/gi, 'the University').replace(/Campus/gi, 'University');
    }
    return adapted;
  };

  useEffect(() => {
    if (!user) return;
    const worldParam = userContext.institutional_world;
    fetch(`${API_BASE}/api/course/module/A1-M01/subtopics?world=${worldParam}`)
      .then(res => res.json())
      .then(data => setSubtopicsList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, [user, userContext.institutional_world]);

  useEffect(() => {
    if (!user) return;
    const saved = loadExerciseState(user.email, currentSubtopicId);
    setSelectedAnswers(saved?.selectedAnswers || {});
    setBatchFeedbacks(saved?.batchFeedbacks || {});
    setAttempts(saved?.attempts || {});
    setSkillTab('grammar');
    setLoading(true);
    const worldParam = userContext.institutional_world;
    Promise.all([
      fetch(`${API_BASE}/api/course/subtopic/${currentSubtopicId}?world=${worldParam}`)
        .then(async (res) => {
          const text = await res.text();
          if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
            console.error('[API] ⚠️ Backend devolvió HTML en /subtopic');
            return null;
          }
          return JSON.parse(text);
        }),
      fetch(`${API_BASE}/api/course/progress/${userId}/subtopic/${currentSubtopicId}`)
        .then(async (res) => {
          const text = await res.text();
          if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
            console.error('[API] ⚠️ Backend devolvió HTML en /progress/subtopic');
            return null;
          }
          return JSON.parse(text);
        })
    ]).then(([topicData, progressData]) => {
      if (topicData) setData(topicData);
      const dbCompleted: {[key: string]: boolean} = {};
      const dbAttempts: {[key: string]: number} = {};
      if (progressData && typeof progressData === 'object') {
        Object.entries(progressData).forEach(([skill, info]: [string, any]) => {
          dbAttempts[skill] = info.attempts || 0;
          if (info.score >= 100) dbCompleted[skill] = true;
        });
      }
      const mergedCompleted = { ...dbCompleted };
      Object.keys(mergedCompleted).forEach(k => { if (!mergedCompleted[k]) delete mergedCompleted[k]; });
      const mergedAttempts: {[key: string]: number} = {};
      (['grammar','vocabulary','reading','listening','writing','pronunciation'] as SkillTab[]).forEach(s => {
        mergedAttempts[s] = Math.max(saved?.attempts?.[s] || 0, dbAttempts[s] || 0);
      });
      setCompletedSkills(mergedCompleted);
      setAttempts(mergedAttempts);
      setLoading(false);
    }).catch(err => { console.error(err); setData(null); setLoading(false); });
  }, [currentSubtopicId, userContext.institutional_world, user, userId]);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/api/course/progress/${userId}?world=${userContext.institutional_world}`)
      .then(async (res) => {
        const text = await res.text();
        if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
          console.error('[API] ⚠️ Backend devolvió HTML en /progress:', text.substring(0, 200));
          return null;
        }
        try { return JSON.parse(text); }
        catch { console.error('[API] ⚠️ Respuesta no es JSON válido:', text.substring(0, 200)); return null; }
      })
      .then(data => { if (data) setRealProgress(data); })
      .catch((err) => { console.error('[API] ❌ Error en /progress:', err); });
  }, [user, userContext.institutional_world, activeTab, evaluatingSkill, userId]);

  useEffect(() => {
    if (!user) return;
    Object.entries(attempts).forEach(([skill, count]) => {
      if ((count >= 2 || isSkillPerfect(skill)) && !completedSkills[skill]) {
        setCompletedSkills(prev => ({ ...prev, [skill]: true }));
      }
    });
  }, [attempts, completedSkills, user]);

  useEffect(() => {
    if (!user || !currentSubtopicId) return;
    saveExerciseState(user.email, currentSubtopicId, { selectedAnswers, batchFeedbacks, attempts, completedSkills });
  }, [selectedAnswers, batchFeedbacks, attempts, completedSkills, user, currentSubtopicId]);

  useEffect(() => {
    if (!data || !showScrollHint) return;
  }, [data, currentSubtopicId, showScrollHint]);

  const dismissScrollHint = () => {
    setShowScrollHint(false);
    localStorage.setItem('teclingo_hide_scroll_hint', 'true');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 bg-slate-800/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-slate-700/50 max-w-lg w-full text-center space-y-8">
          {/* Logo y título */}
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-2">
              <span className="text-4xl">🧠</span>
            </div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              TECLINGO AI
            </h1>
            <p className="text-slate-400 text-sm">Plataforma de inmersión lingüística con IA</p>
          </div>

          {/* Botón principal de Google — GRANDE Y FLOTANTE */}
          <button
            onClick={handleLogin}
            disabled={loggingIn}
            className="group relative w-full py-5 bg-white text-slate-800 rounded-2xl font-extrabold text-xl hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-4 transition-all duration-300 shadow-xl shadow-white/10 hover:shadow-2xl hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Efecto brillo */}
            <span className="absolute inset-0 rounded-2xl overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            </span>
            {loggingIn ? (
              <><span className="animate-spin text-2xl">⏳</span> Conectando...</>
            ) : (
              <>
                <svg className="w-7 h-7" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Iniciar con Google</span>
                <span className="text-2xl">→</span>
              </>
            )}
          </button>

          {/* Separador */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-600/50"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-800/80 px-4 text-slate-500 font-semibold tracking-wider">o para desarrollo</span>
            </div>
          </div>

          {/* Botón secundario — Modo prueba */}
          <button
            onClick={() => {
              const mockUser = { email: 'estudiante@teclingo.local', nombre: 'Estudiante de Prueba' };
              setUser(mockUser);
              localStorage.setItem('teclingo_mock_user', JSON.stringify(mockUser));
            }}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:from-blue-500 hover:to-indigo-500 flex items-center justify-center gap-3 transition-all duration-300 shadow-lg shadow-blue-900/40 hover:shadow-blue-800/60 hover:scale-[1.01] active:scale-[0.99]"
          >
            🚀 Entrar en Modo de Prueba
          </button>

          {/* Nota inferior */}
          <p className="text-slate-500 text-xs leading-relaxed">
            El botón de Google requiere un archivo <code className="bg-slate-700/80 px-1.5 py-0.5 rounded text-slate-300">.env</code> con <code className="bg-slate-700/80 px-1.5 py-0.5 rounded text-slate-300">VITE_GOOGLE_CLIENT_ID</code>.
          </p>
        </div>
      </div>
    );
  }

  const handleAnswerSelect = (key: string, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [key]: answer }));
    const skill = key.split('-')[0];
    setBatchFeedbacks(prev => { const n = {...prev}; delete n[skill]; return n; });
  };

  const evaluateBatch = async (skill: SkillTab, exercises: any[]) => {
    const currentAttempts = attempts[skill] || 0;
    if (currentAttempts >= 2 || !exercises || exercises.length === 0) return;
    if (currentAttempts === 0 && !exercises.some((ex: any, idx: number) => { const key = `${skill.charAt(0)}-${ex.id || idx}`; return selectedAnswers[key]; })) { alert("Por favor responde al menos un ejercicio antes de evaluar."); return; }
    setEvaluatingSkill(skill);

    const buildPayload = (exs: any[], offset: number) => exs.map((ex: any, i: number) => {
      const key = `${skill.charAt(0)}-${ex.id || (offset + i)}`;
      const isSpeaking = !!ex.prompt && !ex.answer && !ex.question;
      let correctAnswer = isSpeaking ? extractSpokenPhrase(ex.prompt) : (ex.answer || ex.prompt || '');
      if (!isSpeaking && ex.question && ex.answer) {
        const fullCorrect = ex.question.replace(/_{2,}|\(\)/, ex.answer).replace(/\s+/g, ' ').trim();
        correctAnswer = `${correctAnswer} (Full correct sentence: "${fullCorrect}")`;
      }
      return { question: ex.question || ex.prompt || `Ejercicio ${offset+i+1}`, user_answer: selectedAnswers[key] || '', correct_answer: correctAnswer };
    });

    try {
      let combinedResult: any = { summary: '', results: [] };
      if (skill === 'pronunciation' && exercises.length > 6) {
        const batch1 = buildPayload(exercises.slice(0, 6), 0);
        const batch2 = buildPayload(exercises.slice(6), 6);
        const [res1, res2] = await Promise.all([
          fetch(`${API_BASE}/api/course/feedback/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exercises: batch1, user_context: userContext }) }).then(r => r.json()),
          fetch(`${API_BASE}/api/course/feedback/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exercises: batch2, user_context: userContext }) }).then(r => r.json())
        ]);
        combinedResult = {
          summary: `${res1.summary || ''} ${res2.summary || ''}`.trim(),
          results: [...(res1.results || []), ...(res2.results || [])]
        };
      } else {
        const payload = buildPayload(exercises, 0);
        const response = await fetch(`${API_BASE}/api/course/feedback/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exercises: payload, user_context: userContext }) });
        combinedResult = await response.json();
      }

      setBatchFeedbacks(prev => ({ ...prev, [skill]: combinedResult }));
      const newAttempts = currentAttempts + 1;
      setAttempts(prev => ({ ...prev, [skill]: newAttempts }));
      if (combinedResult.results && combinedResult.results.length > 0) {
        const scores = combinedResult.results.map((r: any) => r.score || 0);
        const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        fetch(`${API_BASE}/api/course/progress/save`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, subtopic_id: currentSubtopicId, skill, score: Math.round(avgScore), attempts: newAttempts, world: userContext.institutional_world })
        }).catch(() => {});
        saveProgress({ subtopicId: currentSubtopicId, skill, score: Math.round(avgScore), attempts: newAttempts, world: userContext.institutional_world }).catch(() => {});
        saveActivity('evaluacion', `${skill} - ${currentSubtopicId} - score:${Math.round(avgScore)}`).catch(() => {});
      }
    } catch (err) { console.error("Error:", err); alert("Error al conectar con la IA."); } finally { setEvaluatingSkill(null); }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      if (recordingKey) { stopRecording(); return; }
      if (audioState.isPlaying && audioState.text === text) { window.speechSynthesis.pause(); setAudioState({ isPlaying: false, text: '' }); return; }
      if (!audioState.isPlaying && audioState.text === text && window.speechSynthesis.paused) { window.speechSynthesis.resume(); setAudioState({ isPlaying: true, text }); return; }
      window.speechSynthesis.cancel();
      let cleanText = text; const match = text.match(/['"]([^'"]+)['"]/); if (match) cleanText = match[1];
      const u = new SpeechSynthesisUtterance(cleanText); u.lang = 'en-US'; u.rate = 0.9;
      u.onend = () => setAudioState({ isPlaying: false, text: '' }); u.onerror = () => setAudioState({ isPlaying: false, text: '' });
      window.speechSynthesis.speak(u); setAudioState({ isPlaying: true, text });
    }
  };

  const stopAudio = () => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); setAudioState({ isPlaying: false, text: '' }); } };

  const stopRecording = () => {
    if (recRef.current) { try { recRef.current.stop(); } catch(e) {} recRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecordingKey(null);
    setRecordingTime(0);
  };

  const startRecording = (key: string) => {
    if (audioState.isPlaying) stopAudio();
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge."); return; }
    const r = new SR(); r.lang = 'en-US';
    recRef.current = r;
    setRecordingKey(key);
    setRecordingTime(0);
    const timerInterval = setInterval(() => setRecordingTime(p => p + 1), 1000);
    timerRef.current = timerInterval;
    r.onresult = (e: any) => {
      handleAnswerSelect(key, e.results[0][0].transcript);
      clearInterval(timerInterval);
      timerRef.current = null;
      recRef.current = null;
      setRecordingKey(null);
    };
    r.onerror = (e: any) => {
      clearInterval(timerInterval);
      timerRef.current = null;
      recRef.current = null;
      setRecordingKey(null);
      if (e.error === 'no-speech') alert("No se detectó voz. Intenta de nuevo.");
    };
    r.onend = () => {
      clearInterval(timerInterval);
      timerRef.current = null;
      recRef.current = null;
      setRecordingKey(null);
    };
    r.start();
  };

  const formatRecordTime = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}`; };

  const getScoreColor = (score: number) => score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  const getBorderColor = (score: number) => score >= 80 ? 'border-green-700' : score >= 50 ? 'border-yellow-700' : 'border-red-700';

  const skillLabels: { key: SkillTab; label: string; icon: string }[] = [
    { key: 'grammar', label: 'Grammar', icon: '📝' }, { key: 'vocabulary', label: 'Vocabulary', icon: '📚' },
    { key: 'reading', label: 'Reading', icon: '📖' }, { key: 'listening', label: 'Listening', icon: '🎧' },
    { key: 'writing', label: 'Writing', icon: '✍️' }, { key: 'pronunciation', label: 'Speaking', icon: '🎤' },
  ];

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Cargando TECLINGO AI...</div>;
  
  if (showOnboardingManual && user) {
    return <OnboardingFlow userEmail={user.email} onComplete={() => { setShowOnboardingManual(false); setActiveTab('settings'); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <header className="mb-6 header-border">
          <div className="header-bar">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-500">TECLINGO AI</h1>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5">Nivel A1 - Modulo 1 · {user.nombre}</p>
            </div>
            <button onClick={() => setNavOpen(!navOpen)} className={`hamburger-btn ${navOpen ? 'hamburger-open' : ''}`}>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <div className="header-desktop-nav flex flex-wrap gap-2 items-center">
              <button onClick={() => { setActiveTab('lesson'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'lesson' ? 'nav-active-blue' : 'nav-btn-inactive'}`}><span className="nav-icon">📚</span> Lección</button>
              <button onClick={() => { setActiveTab('progress'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'progress' ? 'nav-active-green' : 'nav-btn-inactive'}`}><span className="nav-icon">📊</span> Progreso</button>
              <button onClick={() => { setActiveTab('library'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'library' ? 'nav-active-amber' : 'nav-btn-inactive'}`}><span className="nav-icon">📚</span> Librería</button>
              <button onClick={() => { setActiveTab('settings'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'settings' ? 'nav-active-purple' : 'nav-btn-inactive'}`}><span className="nav-icon">⚙️</span> Ajustes</button>
              <button onClick={() => { setActiveTab('exam'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'exam' ? 'nav-active-amber' : 'nav-btn-inactive'}`}><span className="nav-icon">📝</span> Examen</button>
              <button onClick={() => { setActiveTab('games'); setGameType(null); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'games' ? 'nav-active-pink' : 'nav-btn-inactive'}`}><span className="nav-icon">🎮</span> Juegos</button>
              <button
                onClick={openOnboarding}
                className="nav-btn-3d relative overflow-hidden group bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold px-4 py-2 rounded-xl shadow-lg hover:shadow-pink-500/50 transition-all duration-300 transform hover:scale-105"
              >
                <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></span>
                <span className="flex items-center gap-2">
                  <span className="text-xl">🧠</span>
                  <span className="text-sm">Descubre tu ADN</span>
                </span>
              </button>
              <button onClick={() => { handleLogout(); setNavOpen(false); }} className="nav-btn-3d nav-btn-logout">Salir</button>
            </div>
          </div>
          <div className={`nav-accordion ${navOpen ? 'nav-accordion-open' : ''}`}>
            <div className="nav-accordion-grid">
              <button onClick={() => { setActiveTab('lesson'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'lesson' ? 'nav-active-blue' : 'nav-btn-inactive'}`}><span className="nav-icon">📚</span> Lección</button>
              <button onClick={() => { setActiveTab('progress'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'progress' ? 'nav-active-green' : 'nav-btn-inactive'}`}><span className="nav-icon">📊</span> Progreso</button>
              <button onClick={() => { setActiveTab('library'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'library' ? 'nav-active-amber' : 'nav-btn-inactive'}`}><span className="nav-icon">📚</span> Librería</button>
              <button onClick={() => { setActiveTab('settings'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'settings' ? 'nav-active-purple' : 'nav-btn-inactive'}`}><span className="nav-icon">⚙️</span> Ajustes</button>
              <button onClick={() => { setActiveTab('exam'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'exam' ? 'nav-active-amber' : 'nav-btn-inactive'}`}><span className="nav-icon">📝</span> Examen</button>
              <button onClick={() => { setActiveTab('games'); setGameType(null); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'games' ? 'nav-active-pink' : 'nav-btn-inactive'}`}><span className="nav-icon">🎮</span> Juegos</button>
              <button
                onClick={() => { openOnboarding(); setNavOpen(false); }}
                className="nav-btn-3d bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold col-span-2"
              >
                🧠 Descubre tu ADN
              </button>
              <button onClick={() => { handleLogout(); setNavOpen(false); }} className="nav-btn-3d nav-btn-logout" style={{ gridColumn: 'span 2' }}>Cerrar sesión</button>
            </div>
          </div>
        </header>

        {activeTab === 'progress' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {realProgress ? (
              <>
                {realProgress.a1_achieved && (
                  <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-500 p-6 rounded-xl text-center">
                    <p className="text-5xl mb-2">🏆</p>
                    <h2 className="text-2xl font-bold text-green-400 mb-1">¡NIVEL A1 ALCANZADO!</h2>
                    <p className="text-green-300 text-sm">Has demostrado competencia en todas las habilidades del nivel A1.</p>
                  </div>
                )}

                {!realProgress.a1_achieved && (
                  <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-700 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">🗺️ Tu Camino hacia la Certificación A1</h3>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1 group/bar">
                        <div className="flex justify-between text-sm text-slate-300 mb-1">
                          <span>Progreso Total</span>
                          <span className="font-bold text-blue-400">{realProgress.overall_completion}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-4 relative overflow-visible">
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-500 h-4 rounded-full transition-all relative z-0" style={{ width: `${realProgress.overall_completion}%` }}></div>
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white z-10">{realProgress.overall_completion}%</div>
                          <div className="absolute top-full left-0 right-0 mt-2 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-300 pointer-events-none group-hover/bar:pointer-events-auto z-20">
                            <div className="flex gap-1 items-end">
                              {subtopicsList.map((st, idx) => {
                                const totalLessons = subtopicsList.length;
                                const widthPct = totalLessons > 0 ? (100 / totalLessons) : 10;
                                const skills = ['grammar','vocabulary','reading','listening','writing','pronunciation'];
                                const hasProgress = skills.some(s => {
                                  const sStats = realProgress.skill_stats?.[s];
                                  return sStats && sStats.lessons_completed > 0 && st.sequence_order <= sStats.lessons_completed;
                                });
                                const isCompleted = st.sequence_order === 10 || (realProgress.a1_skills_passed && Object.values(realProgress.a1_skills_passed).some(Boolean) && st.sequence_order <= 3);
                                let barColor = 'bg-slate-600';
                                if (isCompleted) barColor = 'bg-green-500';
                                else if (hasProgress) barColor = 'bg-amber-400';
                                return (
                                  <div key={st.subtopic_id} className="flex flex-col items-center" style={{ width: `${widthPct}%` }}>
                                    <div className={`w-full h-1.5 rounded-full ${barColor} transition-all`} style={{ minHeight: '4px' }}></div>
                                    <span className="text-[9px] text-slate-500 mt-0.5 leading-none">{idx + 1}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex gap-3 mt-1.5 justify-center">
                              <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>Completada</span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>En progreso</span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-600 inline-block"></span>Sin iniciar</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(realProgress.skill_stats || {}).map(([skill, stats]: [string, any]) => {
                        const thresholds: Record<string, number> = { grammar: 70, vocabulary: 70, reading: 60, listening: 60, writing: 60, pronunciation: 60 };
                        const icons: Record<string, string> = { grammar: '📝', vocabulary: '📚', reading: '📖', listening: '🎧', writing: '✍️', pronunciation: '🎤' };
                        const labels: Record<string, string> = { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', writing: 'Writing', pronunciation: 'Speaking' };
                        const passed = realProgress.a1_skills_passed?.[skill] || false;
                        const threshold = thresholds[skill] || 60;
                        const avg = stats.avg_score || 0;
                        const pct = Math.min(avg, 100);
                        return (
                          <div key={skill} className={`p-3 rounded-xl border-2 transition-all ${passed ? 'bg-green-900/30 border-green-600' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${passed ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}>
                                {passed ? '✓' : (stats.lessons_completed > 0 ? Math.round(pct / 10) : '—')}
                              </span>
                              <span className="text-sm font-semibold text-white">{icons[skill]} {labels[skill]}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                              <div className={`h-2 rounded-full ${passed ? 'bg-green-500' : avg >= threshold * 0.7 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>{avg}/100</span>
                              <span>{passed ? '✅' : `Meta: ${threshold}+`}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {(() => {
                      const thresholds: Record<string, number> = { grammar: 70, vocabulary: 70, reading: 60, listening: 60, writing: 60, pronunciation: 60 };
                      const icons: Record<string, string> = { grammar: '📝', vocabulary: '📚', reading: '📖', listening: '🎧', writing: '✍️', pronunciation: '🎤' };
                      const labels: Record<string, string> = { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', writing: 'Writing', pronunciation: 'Speaking' };
                      const pending = Object.entries(realProgress.skill_stats || {}).filter(([skill, _stats]: [string, any]) => !realProgress.a1_skills_passed?.[skill]);
                      if (pending.length === 0) return null;
                      const weakest = pending.sort((a, b) => ((a[1] as any).avg_score || 0) - ((b[1] as any).avg_score || 0))[0];
                      const [worstSkill, worstStats] = weakest as [string, any];
                      const diff = (thresholds[worstSkill] || 60) - (worstStats.avg_score || 0);
                      return (
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-amber-600 mt-4">
                          <p className="text-amber-400 font-bold text-sm mb-1">💡 Siguiente Paso Recomendado</p>
                          <p className="text-slate-300 text-sm">
                            Tu habilidad más baja es <span className="text-white font-bold">{icons[worstSkill]} {labels[worstSkill]}</span> con {worstStats.avg_score}/100.
                            Necesitas <span className="text-amber-400 font-bold">+{Math.max(0, Math.round(diff))} puntos</span> para alcanzar el umbral A1 de {thresholds[worstSkill]}%.
                          </p>
                          <button onClick={() => setActiveTab('lesson')} className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold">
                            📚 Practicar {labels[worstSkill]} ahora
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="stat-card-3d p-6">
                    <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide">Progreso del Módulo</p>
                    <div className="flex items-end gap-2 mt-2"><span className="text-4xl font-bold text-white">{realProgress.overall_completion}%</span><span className="text-slate-500 mb-1">completado</span></div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 mt-4"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${realProgress.overall_completion}%` }}></div></div>
                  </div>
                  <div className="stat-card-3d p-6">
                    <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide">🎯 Promedio General</p>
                    <div className="flex items-end gap-2 mt-2"><span className="text-4xl font-bold text-amber-400">{realProgress.overall_average}</span><span className="text-slate-500 mb-1">/ 100</span></div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 mt-4"><div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${realProgress.overall_average}%` }}></div></div>
                  </div>
                  <div className="stat-card-3d p-6">
                    <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide">🌍 Mundo</p>
                    <div className="flex items-end gap-2 mt-2"><span className="text-2xl font-bold text-blue-400 capitalize">{realProgress.world || userContext.institutional_world.replace('_', ' ')}</span></div>
                    <p className="text-slate-500 text-xs mt-2">{realProgress.total_entries} ejercicios evaluados</p>
                  </div>
                </div>

                <div className="panel-3d p-6">
                  <h3 className="text-lg font-bold text-white mb-4">📊 Detalle por Habilidad</h3>
                  <div className="space-y-4">
                    {Object.entries(realProgress.skill_stats || {}).map(([skill, stats]: [string, any]) => {
                      const thresholds: Record<string, number> = { grammar: 70, vocabulary: 70, reading: 60, listening: 60, writing: 60, pronunciation: 60 };
                      const passed = realProgress.a1_skills_passed?.[skill] || false;
                      const threshold = thresholds[skill] || 60;
                      const icons: Record<string, string> = { grammar: '📝', vocabulary: '📚', reading: '📖', listening: '🎧', writing: '✍️', pronunciation: '🎤' };
                      return (
                        <div key={skill} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">{icons[skill]} {skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
                            <span className={`text-sm font-bold ${passed ? 'text-green-400' : 'text-slate-400'}`}>
                              {passed ? '✅ A1 PASS' : `⚠️ Need ${threshold}+`}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>Promedio: {stats.avg_score}/100</span>
                                <span>{stats.lessons_completed}/{stats.total_lessons} lecciones</span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-3">
                                <div className={`h-3 rounded-full transition-all ${stats.avg_score >= threshold ? 'bg-green-500' : stats.avg_score >= threshold * 0.7 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(stats.avg_score, 100)}%` }}></div>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-1 mt-1 relative">
                                <div className="absolute top-0 h-1 w-0.5 bg-white" style={{ left: `${threshold}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="panel-3d p-6">
                  <h3 className="text-lg font-bold text-white mb-4">🚀 Acciones Rápidas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button onClick={() => setActiveTab('lesson')} className="action-btn-3d action-btn-blue p-4 text-left justify-start">
                      <div>
                        <p className="font-bold text-sm">📚 Practicar Lecciones</p>
                        <p className="text-blue-100/70 text-xs mt-1">Mejora tus habilidades con ejercicios</p>
                      </div>
                    </button>
                    <button onClick={() => setActiveTab('exam')} className="action-btn-3d action-btn-amber p-4 text-left justify-start">
                      <div>
                        <p className="font-bold text-sm">📝 Tomar Examen A1</p>
                        <p className="text-amber-100/70 text-xs mt-1">Certifica tu nivel</p>
                      </div>
                    </button>
                    <button onClick={() => setActiveTab('library')} className="action-btn-3d action-btn-purple p-4 text-left justify-start">
                      <div>
                        <p className="font-bold text-sm">📖 Ver Librería</p>
                        <p className="text-purple-100/70 text-xs mt-1">Consulta reglas gramaticales</p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-12 text-slate-400">
                <p className="text-4xl mb-4">📊</p>
                <p className="text-lg">Aún no hay datos de progreso.</p>
                <p className="text-sm mt-2">Empieza a practicar lecciones para ver tu avance aquí.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="panel-header-3d panel-header-amber p-6">
              <h2 className="text-2xl font-bold text-amber-400 mb-2">📚 Librería del Módulo 1</h2>
              <p className="text-slate-300 text-sm">Referencia rápida de todo lo que necesitas saber en este nivel.</p>
            </div>
            <LibraryPanel world={userContext.institutional_world} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="panel-header-3d panel-header-blue p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🌎</span>
                <div>
                  <h2 className="text-2xl font-bold text-white">Tu Realidad Local</h2>
                  <p className="text-blue-200 text-sm">La IA usará estos datos para adaptar nombres, lugares y ejemplos a tu entorno.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-blue-200 text-xs font-semibold mb-1.5 uppercase tracking-wider">Pais</label>
                  <select value={userContext.country} onChange={(e) => setUserContext({...userContext, country: e.target.value})} className="w-full bg-slate-800/80 text-white p-3 rounded-xl border border-blue-500/30 focus:border-blue-400 outline-none transition-all">
                    <option value="Mexico">MX Mexico</option><option value="Colombia">CO Colombia</option><option value="Argentina">AR Argentina</option><option value="Espana">ES Espana</option>
                  </select>
                </div>
                <div>
                  <label className="block text-blue-200 text-xs font-semibold mb-1.5 uppercase tracking-wider">Ciudad</label>
                  <input type="text" value={userContext.city} onChange={(e) => setUserContext({...userContext, city: e.target.value})} className="w-full bg-slate-800/80 text-white p-3 rounded-xl border border-blue-500/30 focus:border-blue-400 outline-none transition-all" placeholder="Ej. Monterrey, Puebla..." />
                </div>
                <div>
                  <label className="block text-blue-200 text-xs font-semibold mb-1.5 uppercase tracking-wider">Tu Institucion o Empresa</label>
                  <select 
                    value={userContext.institutional_world} 
                    onChange={(e) => setUserContext({ ...userContext, institutional_world: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value="tecnm">TecNM (Tecnologico Nacional)</option>
                    <option value="empresa">Empresa Exportadora / PyME</option>
                    <option value="usa_university">USA University</option>
                    <option value="viajes">Viajes</option>
                    <option value="vida_diaria">Vida Diaria</option>
                  </select>
                </div>
              </div>
            </div>
            <ActivityEngine onNavigateToGames={(gameType) => {
              setActiveTab('games');
              if (gameType === 'multiple_choice' || gameType === 'true_false') setGameType('true_false');
              else if (gameType === 'flashcards') setGameType('flashcards');
              else if (gameType === 'hangman') setGameType('hangman');
              else if (gameType === 'drag_drop') setGameType('drag_drop');
              else if (gameType === 'timed_quiz') setGameType('timer_quiz');
              else if (gameType === 'ai_conversation') setGameType('ai_conversation');
              else setGameType(null);
            }} />
          </div>
        )}

        {activeTab === 'exam' && (
          <ExamPage userId={userId} userContext={userContext} />
        )}

        {activeTab === 'games' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {!gameType ? (
              <>
                <div className="panel-header-3d panel-header-pink p-6">
                  <h2 className="text-2xl font-bold text-pink-400 mb-2">🎮 Mini-Juegos</h2>
                  <p className="text-slate-300 text-sm">Practica inglés de forma divertida con juegos interactivos. ¡Usa el vocabulario y gramática de la lección actual!</p>
                </div>

                <div className="panel-3d p-4">
                  <p className="text-sm text-slate-400 mb-3">Selecciona una habilidad para practicar:</p>
                  <div className="flex flex-wrap gap-2">
                    {skillLabels.map(s => (
                      <button key={s.key} onClick={() => setGameSkill(s.key)} className={`skill-tab-3d ${gameSkill === s.key ? 'skill-tab-active' : 'skill-tab-inactive'}`}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button onClick={() => setGameType('true_false')} className="game-card-3d game-card-green p-6 text-left">
                    <p className="text-3xl mb-2">✅</p>
                    <h3 className="text-white font-bold">True / False</h3>
                    <p className="text-slate-400 text-sm mt-1">Determina si las oraciones son correctas</p>
                    <p className="text-green-400 text-xs mt-2">📝 Grammar · 📚 Vocabulary</p>
                  </button>
                  <button onClick={() => setGameType('flashcards')} className="game-card-3d game-card-purple p-6 text-left">
                    <p className="text-3xl mb-2">🃏</p>
                    <h3 className="text-white font-bold">Flashcards</h3>
                    <p className="text-slate-400 text-sm mt-1">Voltea tarjetas para memorizar vocabulario</p>
                    <p className="text-purple-400 text-xs mt-2">📚 Vocabulary</p>
                  </button>
                  <button onClick={() => setGameType('hangman')} className="game-card-3d game-card-orange p-6 text-left">
                    <p className="text-3xl mb-2">💀</p>
                    <h3 className="text-white font-bold">Hangman</h3>
                    <p className="text-slate-400 text-sm mt-1">Adivina la palabra letra por letra</p>
                    <p className="text-orange-400 text-xs mt-2">📚 Vocabulary · 📝 Grammar</p>
                  </button>
                  <button onClick={() => setGameType('drag_drop')} className="game-card-3d game-card-cyan p-6 text-left">
                    <p className="text-3xl mb-2">🎯</p>
                    <h3 className="text-white font-bold">Emparejar</h3>
                    <p className="text-slate-400 text-sm mt-1">Conecta palabras con sus traducciones</p>
                    <p className="text-cyan-400 text-xs mt-2">📚 Vocabulary</p>
                  </button>
                  <button onClick={() => setGameType('timer_quiz')} className="game-card-3d game-card-yellow p-6 text-left">
                    <p className="text-3xl mb-2">⏱️</p>
                    <h3 className="text-white font-bold">Quiz Reloj</h3>
                    <p className="text-slate-400 text-sm mt-1">Responde rápido antes de que se agote el tiempo</p>
                    <p className="text-yellow-400 text-xs mt-2">📝 All Skills</p>
                  </button>
                  <button onClick={() => setGameType('ai_conversation')} className="game-card-3d game-card-blue p-6 text-left">
                    <p className="text-3xl mb-2">🗣️</p>
                    <h3 className="text-white font-bold">AI Conversation</h3>
                    <p className="text-slate-400 text-sm mt-1">Chatea con el tutor de IA en inglés</p>
                    <p className="text-blue-400 text-xs mt-2">🎤 Speaking · ✍️ Writing</p>
                  </button>
                </div>

                {Object.keys(gameResults).length > 0 && (
                  <div className="panel-3d p-4">
                    <h3 className="text-white font-bold mb-3">📊 Resultados Recientes</h3>
                    <div className="space-y-2">
                      {Object.entries(gameResults).map(([game, score]) => (
                        <div key={game} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 capitalize">{game.replace('_', ' ')}</span>
                          <span className={`font-bold ${score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <button onClick={() => setGameType(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all">
                  ← Volver a Juegos
                </button>

                <div className="panel-3d p-4 flex items-center justify-between">
                  <h3 className="text-white font-bold">
                    {gameType === 'true_false' && '✅ True / False'}
                    {gameType === 'flashcards' && '🃏 Flashcards'}
                    {gameType === 'hangman' && '💀 Hangman'}
                    {gameType === 'drag_drop' && '🎯 Emparejar'}
                    {gameType === 'timer_quiz' && '⏱️ Quiz Reloj'}
                    {gameType === 'ai_conversation' && '🗣️ AI Conversation'}
                  </h3>
                  <span className="text-slate-400 text-sm">{skillLabels.find(s => s.key === gameSkill)?.icon} {skillLabels.find(s => s.key === gameSkill)?.label}</span>
                </div>

                <div className="panel-3d p-6">
                  {gameType === 'true_false' && grammarExercises.length > 0 && (
                    <TrueFalseExercise
                      exercises={grammarExercises}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, true_false: score });
                        saveProgress({ subtopicId: currentSubtopicId, skill: 'grammar', score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                        saveActivity('juego', `true_false - ${currentSubtopicId} - score:${score}`).catch(() => {});
                      }}
                    />
                  )}
                  {gameType === 'flashcards' && vocabularyExercises.length > 0 && (
                    <FlashcardExercise
                      exercises={vocabularyExercises}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, flashcards: score });
                        saveProgress({ subtopicId: currentSubtopicId, skill: 'vocabulary', score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                        saveActivity('juego', `flashcards - ${currentSubtopicId} - score:${score}`).catch(() => {});
                      }}
                    />
                  )}
                  {gameType === 'hangman' && vocabularyExercises.length > 0 && (
                    <HangmanExercise
                      exercises={vocabularyExercises}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, hangman: score });
                        saveProgress({ subtopicId: currentSubtopicId, skill: 'vocabulary', score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                        saveActivity('juego', `hangman - ${currentSubtopicId} - score:${score}`).catch(() => {});
                      }}
                    />
                  )}
                  {gameType === 'drag_drop' && vocabularyExercises.length > 0 && (
                    <DragDropExercise
                      exercises={vocabularyExercises}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, drag_drop: score });
                        saveProgress({ subtopicId: currentSubtopicId, skill: 'vocabulary', score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                        saveActivity('juego', `drag_drop - ${currentSubtopicId} - score:${score}`).catch(() => {});
                      }}
                    />
                  )}
                  {gameType === 'timer_quiz' && grammarExercises.length > 0 && (
                    <TimerQuizExercise
                      exercises={grammarExercises}
                      skill={gameSkill}
                      timePerQuestion={15}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, timer_quiz: score });
                        saveProgress({ subtopicId: currentSubtopicId, skill: gameSkill, score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                        saveActivity('juego', `timer_quiz - ${currentSubtopicId} - score:${score}`).catch(() => {});
                      }}
                    />
                  )}
                  {gameType === 'ai_conversation' && (
                    <AIConversationExercise
                      lessonContext={`${data?.title || ''}. ${data?.theory || ''}`}
                      subtopicId={currentSubtopicId}
                      world={userContext.institutional_world}
                      userContext={userContext}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, ai_conversation: score });
                        saveProgress({ subtopicId: currentSubtopicId, skill: 'pronunciation', score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                        saveActivity('juego', `ai_conversation - ${currentSubtopicId} - score:${score}`).catch(() => {});
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'lesson' && (
          <div className="space-y-8">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700/50 shadow-2xl">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Selecciona una lección:
              </h3>
              <div className="lesson-grid-3d">
                {subtopicsList && subtopicsList.length > 0 && subtopicsList.map((st) => {
                  const isActive = currentSubtopicId === st.subtopic_id;
                  const isCompleted = st.sequence_order === 10 || (currentSubtopicId === st.subtopic_id && allSkillsCompleted());
                  const btnClass = isActive ? 'lesson-btn-active' : isCompleted ? 'lesson-btn-completed' : 'lesson-btn-pending';
                  const displayTitle = adaptText(st.title) && adaptText(st.title).length > 28
                    ? adaptText(st.title).substring(0, 28) + '...'
                    : adaptText(st.title);
                  return (
                    <button key={st.subtopic_id} onClick={() => { if (isGuest) { setPendingLessonId(st.subtopic_id); setShowGuestAlert(true); return; } setCurrentSubtopicId(st.subtopic_id); }}
                      className={`lesson-btn-3d ${btnClass}`}>
                      <span className="lesson-num">{st.sequence_order}</span>
                      <span className="lesson-title">{displayTitle}</span>
                      {isCompleted && <span className="lesson-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {data ? (
              <>
                <section className="panel-3d p-6">
                  <h2 className="text-xl font-bold text-white mb-2">{adaptText(data.title)}</h2>
                  <p className="text-slate-400 italic">"{data.mcer_goal || data.mcer_descriptor}"</p>
                </section>

                {data.theory && <section className="panel-3d p-6"><h3 className="text-xl font-bold text-blue-400 mb-3">📖 Teoría</h3><p className="text-slate-300 leading-relaxed">{adaptText(data.theory)}</p></section>}

                {allSkillsCompleted() ? (
                  <section className="bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl p-8 text-center shadow-2xl">
                    <p className="text-5xl mb-4">🏆</p>
                    <h2 className="text-2xl font-bold text-green-400 mb-2">¡Lección Completada al 100%!</h2>
                    <p className="text-green-300/80 text-base mb-2">Has completado todas las secciones de esta lección con excelencia.</p>
                    <p className="text-slate-400 text-sm mb-6">Grammar ✅ Vocabulary ✅ Reading ✅ Listening ✅ Writing ✅ Speaking ✅</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button onClick={() => {
                        const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId);
                        if (subIdx >= 0 && subIdx < subtopicsList.length - 1) {
                          setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id);
                        } else {
                          setActiveTab('lesson');
                        }
                      }} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-green-900/50">
                        {subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId) < subtopicsList.length - 1 ? '➡️ Ir a la siguiente lección' : '🏠 Volver al panel principal'}
                      </button>
                      <button onClick={() => setActiveTab('progress')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                        📊 Ver progreso
                      </button>
                    </div>
                  </section>
                ) : (
                <section className="panel-3d panel-header-purple p-6">
                  <h3 className="text-xl font-bold text-purple-400 mb-4">Práctica por Habilidad</h3>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-3">
                      {skillLabels.map(s => (<button key={s.key} onClick={() => setSkillTab(s.key)} className={`px-3 py-2 rounded-lg text-sm font-medium ${skillTab === s.key ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{s.icon} {s.label}</button>))}
                    </div>
                    <div className="relative">
                      {showHelpHint && (
                        <div className="absolute -top-10 right-0 flex flex-col items-end gap-1 z-30 animate-bounce">
                          <span className="text-amber-400 font-bold text-xs whitespace-nowrap bg-slate-800/90 px-2 py-1 rounded-lg border border-amber-500/30">Lee cómo funciona cada ejercicio</span>
                          <svg className="w-6 h-6 text-amber-400 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                      )}
                      <button 
                        onClick={() => { openHelp(skillTab); if (showHelpHint) { setShowHelpHint(false); localStorage.setItem('teclingo_hide_help_hint', 'true'); } }}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-blue-400 rounded-lg text-sm font-semibold transition-all border border-slate-600 hover:border-blue-500"
                        title="Ver instrucciones de esta sección"
                      >
                        <span className="text-lg">❓</span>
                        <span className="hidden sm:inline">¿Cómo funciona?</span>
                      </button>
                    </div>
                  </div>

                  {/* GRAMMAR */}
                  {skillTab === 'grammar' && grammarExercises.length > 0 && (
                    isSkillPerfect('grammar') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Grammar completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        {grammarExercises.map((ex, idx) => {
                          const key = `g-${ex.id || idx}`;
                          const fb: BatchResult | undefined = batchFeedbacks['grammar']?.results[idx];
                          const currentAttempts = attempts['grammar'] || 0;
                          const isLocked = currentAttempts === 2 || (currentAttempts === 1 && fb?.is_correct);
                          const isUnscramble = ex.type === 'unscramble' && Array.isArray(ex.words) && ex.words.length > 0;
                          const hasOptions = ex.options && ex.options.length > 0;
                          const open = isExerciseOpen(key);
                          const statusIcon = getExerciseIcon(fb, isLocked);
                          const borderClass = fb ? (fb.is_correct ? 'accordion-correct' : isLocked ? 'accordion-wrong' : 'accordion-partial') : '';
                          return (
                            <div key={idx} className={`${borderClass}`}>
                              <div className={`accordion-header ${borderClass}`} onClick={() => toggleExercise(key)}>
                                <div className="accordion-header-left">
                                  <span className="accordion-num">{idx + 1}.</span>
                                  <span className="accordion-preview">{ex.question || 'Ejercicio de audio'}</span>
                                </div>
                                <span className="accordion-status">{statusIcon}</span>
                                <span className={`accordion-chevron ${open ? 'open' : ''}`}>▼</span>
                              </div>
                              <div className={`accordion-body ${open ? 'open' : ''}`}>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                  {isUnscramble ? (
                                    <UnscrambleExercise exercise={ex} index={idx} userAnswer={selectedAnswers[key] || ''} onAnswerChange={(answer: string) => !isLocked && handleAnswerSelect(key, answer)} feedback={fb} isLocked={isLocked} />
                                  ) : hasOptions ? (
                                    <div className="flex gap-2 flex-wrap">
                                      {ex.options!.map((opt, i) => (
                                        <button key={i} onClick={() => !isLocked && handleAnswerSelect(key, opt)} disabled={isLocked}
                                          className={`exercise-opt-3d ${isLocked ? 'exercise-opt-locked' : selectedAnswers[key] === opt ? 'exercise-opt-selected' : 'exercise-opt-default'}`}
                                        >{opt}</button>
                                      ))}
                                    </div>
                                  ) : (
                                    <textarea value={selectedAnswers[key] || ''} onChange={(e) => !isLocked && handleAnswerSelect(key, e.target.value)} disabled={isLocked} placeholder="Escribe tu respuesta aquí..." className={`w-full p-3 rounded-lg border focus:outline-none transition-all ${isLocked ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed' : 'bg-slate-700 text-white border-slate-600 focus:border-purple-500'}`} rows={2} />
                                  )}
                                  {fb && (
                                    <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                      <span className={`font-bold ${getScoreColor(fb.score)}`}>{fb.is_correct ? '✅ Correcto' : (currentAttempts === 1 ? '💡 Incorrecto, ¡intenta corregirlo!' : '💡 Necesita mejora')} - Puntaje: {fb.score}/100</span>
                                      <p className="text-slate-200 text-sm mt-1">{fb.feedback}</p>
                                      {!fb.is_correct && fb.rule_hint && (
                                        <button onClick={() => { setTimeout(() => { setActiveTab('library'); }, 100); }} className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer">
                                          📖 Ver regla gramatical: {fb.rule_hint}
                                        </button>
                                      )}
                                      <p className="text-slate-400 text-xs italic mt-1">📚 Fundamento: {fb.pedagogical_reason}</p>
                                      {currentAttempts === 1 && !fb.is_correct && <p className="text-yellow-400 text-xs mt-2 font-semibold animate-pulse">🔄 Tienes una oportunidad más para corregir esta respuesta.</p>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {(attempts['grammar'] || 0) < 2 ? (
                        <button onClick={() => evaluateBatch('grammar', grammarExercises)} disabled={evaluatingSkill === 'grammar'} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg font-bold text-lg">
                          {evaluatingSkill === 'grammar' ? '🤖 Analizando...' : (attempts['grammar'] === 1 ? '🔄 Evaluar correcciones (Último intento)' : '🤖 Evaluar todo el bloque de Grammar con IA')}
                        </button>
                      ) : (
                        <div className="text-center p-4 bg-green-900/20 border border-green-700 rounded-lg">
                          <p className="text-green-400 font-bold text-lg">✅ Evaluación de Grammar finalizada</p>
                          {isAlternateMode['grammar'] && (
                            <button onClick={() => exitAlternateMode('grammar')} className="mt-3 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-semibold">← Volver a ejercicios originales</button>
                          )}
                          <button onClick={() => loadAlternateExercises('grammar')} disabled={loadingAlternate === 'grammar' || !!completedSkills['grammar']} className={`repasar-btn-3d mt-3 ${completedSkills['grammar'] ? 'repasar-completed' : ''}`}>
                            {completedSkills['grammar'] ? '✅ Ejercicio completado' : (loadingAlternate === 'grammar' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                          </button>
                        </div>
                      )}
                    </div>
                    )
                  )}

                  {/* VOCABULARY */}
                  {skillTab === 'vocabulary' && vocabularyExercises.length > 0 && (
                    isSkillPerfect('vocabulary') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Vocabulary completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700 p-6 rounded-xl">
                        <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2"><span>📚</span> Contexto de Referencia</h4>
                        <p className="text-slate-300 mb-4 text-sm">Lee el texto y escucha el audio para familiarizarte con el vocabulario.</p>
                        <div className="bg-yellow-900/30 border border-yellow-700 p-3 rounded-lg mb-4">
                          <p className="text-yellow-400 text-xs font-semibold mb-1">💡 Nota importante:</p>
                          <p className="text-slate-300 text-xs">El texto y el audio presentan situaciones diferentes para que practiques más vocabulario. ¡No son el mismo contenido!</p>
                        </div>
                        {readingExercises?.text && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2"><span className="text-green-400 font-semibold text-sm">📖 Texto de Lectura:</span></div>
                            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700"><p className="text-slate-200 leading-relaxed text-sm">{adaptText(readingExercises.text)}</p></div>
                          </div>
                        )}
                        {listeningExercises?.script && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2"><span className="text-purple-400 font-semibold text-sm">🎧 Audio de Listening (contenido diferente):</span></div>
                            <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-lg border border-slate-700">
                              <div className="flex gap-2">
                                <button onClick={() => speak(listeningExercises.script || '')} className={`px-4 py-2 rounded-lg font-semibold transition-all ${audioState.isPlaying && audioState.text === (listeningExercises.script || '') ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}>
                                  {audioState.isPlaying && audioState.text === (listeningExercises.script || '') ? '⏸️ Pausar' : '▶️ Play'}
                                </button>
                                {audioState.text === (listeningExercises.script || '') && <button onClick={stopAudio} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold">⏹️ Stop</button>}
                              </div>
                              <div className="flex-1"><p className="text-slate-400 text-xs italic">"{adaptText(listeningExercises.script)}"</p></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {vocabularyExercises.map((ex, idx) => {
                          const key = `v-${ex.id || idx}`;
                          const fb: BatchResult | undefined = batchFeedbacks['vocabulary']?.results[idx];
                          const currentAttempts = attempts['vocabulary'] || 0;
                          const isLocked = currentAttempts === 2 || (currentAttempts === 1 && fb?.is_correct);
                          const open = isExerciseOpen(key);
                          const statusIcon = getExerciseIcon(fb, isLocked);
                          const borderClass = fb ? (fb.is_correct ? 'accordion-correct' : isLocked ? 'accordion-wrong' : 'accordion-partial') : '';
                          return (
                            <div key={idx} className={borderClass}>
                              <div className={`accordion-header ${borderClass}`} onClick={() => toggleExercise(key)}>
                                <div className="accordion-header-left">
                                  <span className="accordion-num">{idx + 1}.</span>
                                  <span className="accordion-preview">{ex.question}</span>
                                </div>
                                <span className="accordion-status">{statusIcon}</span>
                                <span className={`accordion-chevron ${open ? 'open' : ''}`}>▼</span>
                              </div>
                              <div className={`accordion-body ${open ? 'open' : ''}`}>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                  <UnscrambleExercise exercise={ex} index={idx} userAnswer={selectedAnswers[key] || ''} onAnswerChange={(answer: string) => !isLocked && handleAnswerSelect(key, answer)} feedback={fb} isLocked={isLocked} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {(attempts['vocabulary'] || 0) < 2 ? (
                        <button onClick={() => evaluateBatch('vocabulary', vocabularyExercises)} disabled={evaluatingSkill === 'vocabulary'} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg font-bold text-lg">
                          {evaluatingSkill === 'vocabulary' ? '🤖 Analizando...' : (attempts['vocabulary'] === 1 ? '🔄 Evaluar correcciones (Último intento)' : '🤖 Evaluar todo el bloque de Vocabulary con IA')}
                        </button>
                      ) : (
                        <div className="text-center p-4 bg-green-900/20 border border-green-700 rounded-lg">
                          <p className="text-green-400 font-bold text-lg">✅ Evaluación de Vocabulary finalizada</p>
                          {isAlternateMode['vocabulary'] && (
                            <button onClick={() => exitAlternateMode('vocabulary')} className="mt-3 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-semibold">← Volver a ejercicios originales</button>
                          )}
                          <button onClick={() => loadAlternateExercises('vocabulary')} disabled={loadingAlternate === 'vocabulary' || !!completedSkills['vocabulary']} className={`repasar-btn-3d mt-3 ${completedSkills['vocabulary'] ? 'repasar-completed' : ''}`}>
                            {completedSkills['vocabulary'] ? '✅ Ejercicio completado' : (loadingAlternate === 'vocabulary' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                          </button>
                        </div>
                      )}
                    </div>
                    )
                  )}

                  {/* READING */}
                  {skillTab === 'reading' && readingExercises && readingExercises.questions && readingExercises.questions.length > 0 && (
                    isSkillPerfect('reading') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Reading completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-green-900/40 to-teal-900/40 border border-green-700 p-6 rounded-xl">
                        <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2"><span>📖</span> Texto de Lectura</h4>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700">
                          <p className="text-slate-200 leading-relaxed">{adaptText(readingExercises.text)}</p>
                        </div>
                        <button onClick={() => speak(readingExercises.text)} className={`mt-4 px-4 py-2 rounded-lg font-semibold transition-all ${audioState.isPlaying && audioState.text === readingExercises.text ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white`}>
                          {audioState.isPlaying && audioState.text === readingExercises.text ? '⏸️ Pausar' : '🔊 Escuchar texto'}
                        </button>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-green-400 font-semibold">Preguntas de Comprensión</h4>
                        {readingExercises.questions.map((q, idx) => {
                          const key = `r-${q.id || idx}`;
                          const fb: BatchResult | undefined = batchFeedbacks['reading']?.results[idx];
                          const currentAttempts = attempts['reading'] || 0;
                          const isLocked = currentAttempts === 2 || (currentAttempts === 1 && fb?.is_correct);
                          const open = isExerciseOpen(key);
                          const statusIcon = getExerciseIcon(fb, isLocked);
                          const borderClass = fb ? (fb.is_correct ? 'accordion-correct' : isLocked ? 'accordion-wrong' : 'accordion-partial') : '';
                          return (
                            <div key={idx} className={borderClass}>
                              <div className={`accordion-header ${borderClass}`} onClick={() => toggleExercise(key)}>
                                <div className="accordion-header-left">
                                  <span className="accordion-num">{idx + 1}.</span>
                                  <span className="accordion-preview">{q.question}</span>
                                </div>
                                <span className="accordion-status">{statusIcon}</span>
                                <span className={`accordion-chevron ${open ? 'open' : ''}`}>▼</span>
                              </div>
                              <div className={`accordion-body ${open ? 'open' : ''}`}>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                  <div className="flex gap-2 flex-wrap">
                                    {q.options.map((opt, i) => (
                                      <button key={i} onClick={() => !isLocked && handleAnswerSelect(key, opt)} disabled={isLocked}
                                        className={`exercise-opt-3d ${isLocked ? 'exercise-opt-locked' : selectedAnswers[key] === opt ? 'exercise-opt-selected' : 'exercise-opt-default'}`}
                                      >{opt}</button>
                                    ))}
                                  </div>
                                  {fb && (
                                    <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                      <span className={`font-bold ${getScoreColor(fb.score)}`}>{fb.is_correct ? '✅ Correcto' : '💡 Necesita mejora'} - Puntaje: {fb.score}/100</span>
                                      <p className="text-slate-200 text-sm mt-1">{fb.feedback}</p>
                                      <p className="text-slate-400 text-xs italic mt-1">📚 Fundamento: {fb.pedagogical_reason}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {(attempts['reading'] || 0) < 2 ? (
                        <button onClick={() => {
                          const qs = readingExercises.questions;
                          evaluateBatch('reading', qs.map((q: any) => ({ question: q.question, answer: q.answer, id: q.id })));
                        }} disabled={evaluatingSkill === 'reading'} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg font-bold text-lg">
                          {evaluatingSkill === 'reading' ? '🤖 Analizando...' : '🤖 Evaluar comprensión lectora con IA'}
                        </button>
                      ) : (
                        <div className="text-center p-4 bg-green-900/20 border border-green-700 rounded-lg">
                          <p className="text-green-400 font-bold text-lg">✅ Evaluación de Reading finalizada</p>
                          {isAlternateMode['reading'] && (
                            <button onClick={() => exitAlternateMode('reading')} className="mt-3 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-semibold">← Volver a ejercicios originales</button>
                          )}
                          <button onClick={() => loadAlternateExercises('reading')} disabled={loadingAlternate === 'reading' || !!completedSkills['reading']} className={`repasar-btn-3d mt-3 ${completedSkills['reading'] ? 'repasar-completed' : ''}`}>
                            {completedSkills['reading'] ? '✅ Ejercicio completado' : (loadingAlternate === 'reading' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                  )}

                  {/* LISTENING */}
                  {skillTab === 'listening' && listeningExercises && listeningExercises.questions && listeningExercises.questions.length > 0 && (
                    isSkillPerfect('listening') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Listening completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-700 p-6 rounded-xl">
                        <h4 className="text-purple-400 font-semibold mb-3 flex items-center gap-2"><span>🎧</span> Audio de Listening</h4>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700">
                          <p className="text-slate-400 text-xs italic mb-3">Escucha el audio y responde las preguntas:</p>
                          <p className="text-slate-200 leading-relaxed italic">"{adaptText(listeningExercises.script)}"</p>
                        </div>
                        <div className="flex gap-3 mt-4">
                          <button onClick={() => speak(listeningExercises.script)} className={`px-4 py-2 rounded-lg font-semibold transition-all ${audioState.isPlaying && audioState.text === listeningExercises.script ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}>
                            {audioState.isPlaying && audioState.text === listeningExercises.script ? '⏸️ Pausar' : '▶️ Play'}
                          </button>
                          {audioState.text === listeningExercises.script && <button onClick={stopAudio} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold">⏹️ Stop</button>}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-purple-400 font-semibold">Preguntas de Listening</h4>
                        {listeningExercises.questions.map((q, idx) => {
                          const key = `l-${q.id || idx}`;
                          const fb: BatchResult | undefined = batchFeedbacks['listening']?.results[idx];
                          const currentAttempts = attempts['listening'] || 0;
                          const isLocked = currentAttempts === 2 || (currentAttempts === 1 && fb?.is_correct);
                          return (
                            <div key={idx} className={`bg-slate-900/50 p-4 rounded-lg border ${fb ? getBorderColor(fb.score) : 'border-slate-700'}`}>
                              <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {q.question}</p>
                              <div className="flex gap-2 flex-wrap">
                                {q.options.map((opt, i) => (
                                  <button key={i} onClick={() => !isLocked && handleAnswerSelect(key, opt)} disabled={isLocked}
                                    className={`exercise-opt-3d ${isLocked ? 'exercise-opt-locked' : selectedAnswers[key] === opt ? 'exercise-opt-selected' : 'exercise-opt-default'}`}
                                  >{opt}</button>
                                ))}
                              </div>
                              {fb && (
                                <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                  <span className={`font-bold ${getScoreColor(fb.score)}`}>{fb.is_correct ? '✅ Correcto' : '💡 Necesita mejora'} - Puntaje: {fb.score}/100</span>
                                  <p className="text-slate-200 text-sm mt-1">{fb.feedback}</p>
                                  <p className="text-slate-400 text-xs italic mt-1">📚 Fundamento: {fb.pedagogical_reason}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {(attempts['listening'] || 0) < 2 ? (
                        <button onClick={() => {
                          const qs = listeningExercises.questions;
                          evaluateBatch('listening', qs.map((q: any) => ({ question: q.question, answer: q.answer, id: q.id })));
                        }} disabled={evaluatingSkill === 'listening'} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg font-bold text-lg">
                          {evaluatingSkill === 'listening' ? '🤖 Analizando...' : '🤖 Evaluar listening con IA'}
                        </button>
                      ) : (
                        <div className="text-center p-4 bg-green-900/20 border border-green-700 rounded-lg">
                          <p className="text-green-400 font-bold text-lg">✅ Evaluación de Listening finalizada</p>
                          {isAlternateMode['listening'] && (
                            <button onClick={() => exitAlternateMode('listening')} className="mt-3 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-semibold">← Volver a ejercicios originales</button>
                          )}
                          <button onClick={() => loadAlternateExercises('listening')} disabled={loadingAlternate === 'listening' || !!completedSkills['listening']} className={`repasar-btn-3d mt-3 ${completedSkills['listening'] ? 'repasar-completed' : ''}`}>
                            {completedSkills['listening'] ? '✅ Ejercicio completado' : (loadingAlternate === 'listening' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                  )}

                  {/* WRITING */}
                  {skillTab === 'writing' && writingExercises.length > 0 && (
                    isSkillPerfect('writing') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Writing completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-indigo-900/40 to-blue-900/40 border border-indigo-700 p-6 rounded-xl">
                        <h4 className="text-indigo-400 font-semibold mb-3 flex items-center gap-2"><span>✍️</span> Ejercicios de Escritura</h4>
                        <p className="text-slate-300 text-sm">Ordena las palabras para formar oraciones correctas o escribe tu respuesta.</p>
                      </div>
                      <WritingRulesPanel />
                      <div className="space-y-4">
                        {writingExercises.map((ex, idx) => {
                          const key = `w-${ex.id || idx}`;
                          const fb: BatchResult | undefined = batchFeedbacks['writing']?.results[idx];
                          const currentAttempts = attempts['writing'] || 0;
                          const isLocked = currentAttempts === 2 || (currentAttempts === 1 && fb?.is_correct);
                          const isUnscramble = ex.type === 'unscramble' && Array.isArray(ex.words) && ex.words.length > 0;
                          return (
                            <div key={idx} className={`bg-slate-900/50 p-4 rounded-lg border ${fb ? getBorderColor(fb.score) : 'border-slate-700'}`}>
                              <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {ex.question || ex.prompt || 'Escribe la oración correcta:'}</p>
                              {isUnscramble ? (
                                <UnscrambleExercise exercise={ex} index={idx} userAnswer={selectedAnswers[key] || ''} onAnswerChange={(answer: string) => !isLocked && handleAnswerSelect(key, answer)} feedback={fb} isLocked={isLocked} />
                              ) : (
                                <input type="text" value={selectedAnswers[key] || ''} onChange={(e) => !isLocked && handleAnswerSelect(key, e.target.value)} disabled={isLocked} placeholder="Escribe tu respuesta aquí..." className={`w-full p-3 rounded-lg border transition-all ${isLocked ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed' : 'bg-slate-700 text-white border-slate-600 focus:border-indigo-500'}`} />
                              )}
                              {fb && (
                                <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                  <span className={`font-bold ${getScoreColor(fb.score)}`}>{fb.is_correct ? '✅ Correcto' : '💡 Necesita mejora'} - Puntaje: {fb.score}/100</span>
                                  <p className="text-slate-200 text-sm mt-1">{fb.feedback}</p>
                                  <p className="text-slate-400 text-xs italic mt-1">📚 Fundamento: {fb.pedagogical_reason}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {(attempts['writing'] || 0) < 2 ? (
                        <button onClick={() => evaluateBatch('writing', writingExercises)} disabled={evaluatingSkill === 'writing'} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg font-bold text-lg">
                          {evaluatingSkill === 'writing' ? '🤖 Analizando...' : '🤖 Evaluar escritura con IA'}
                        </button>
                      ) : (
                        <div className="text-center p-4 bg-green-900/20 border border-green-700 rounded-lg">
                          <p className="text-green-400 font-bold text-lg">✅ Evaluación de Writing finalizada</p>
                          {isAlternateMode['writing'] && (
                            <button onClick={() => exitAlternateMode('writing')} className="mt-3 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-semibold">← Volver a ejercicios originales</button>
                          )}
                          <button onClick={() => loadAlternateExercises('writing')} disabled={loadingAlternate === 'writing' || !!completedSkills['writing']} className={`repasar-btn-3d mt-3 ${completedSkills['writing'] ? 'repasar-completed' : ''}`}>
                            {completedSkills['writing'] ? '✅ Ejercicio completado' : (loadingAlternate === 'writing' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                  )}

                  {/* SPEAKING / PRONUNCIATION */}
                  {skillTab === 'pronunciation' && pronunciationExercises.length > 0 && (
                    isSkillPerfect('pronunciation') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Pronunciation completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-pink-900/40 to-rose-900/40 border border-pink-700 p-6 rounded-xl">
                        <h4 className="text-pink-400 font-semibold mb-3 flex items-center gap-2"><span>🎤</span> Pronunciación y Speaking</h4>
                        <p className="text-slate-300 text-sm">Practica la pronunciación y graba tu voz para ser evaluada.</p>
                      </div>
                      {speakingExercises.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-pink-400 font-semibold">Speaking - Practica tu voz</h4>
                          {speakingExercises.map((ex, idx) => {
                            const key = `p-${ex.id || idx}`;
                            const fb: BatchResult | undefined = batchFeedbacks['pronunciation']?.results[idx];
                            const currentAttempts = attempts['pronunciation'] || 0;
                            const isLocked = currentAttempts === 2 || (currentAttempts === 1 && fb?.is_correct);
                            const open = isExerciseOpen(key);
                            const statusIcon = getExerciseIcon(fb, isLocked);
                            const borderClass = fb ? (fb.is_correct ? 'accordion-correct' : isLocked ? 'accordion-wrong' : 'accordion-partial') : (recordingKey === key ? 'accordion-partial' : '');
                            return (
                              <div key={idx} className={borderClass}>
                                <div className={`accordion-header ${borderClass}`} onClick={() => toggleExercise(key)}>
                                  <div className="accordion-header-left">
                                    <span className="accordion-num">{idx + 1}.</span>
                                    <span className="accordion-preview">{ex.prompt}</span>
                                  </div>
                                  <span className="accordion-status">{statusIcon}</span>
                                  <span className={`accordion-chevron ${open ? 'open' : ''}`}>▼</span>
                                </div>
                                <div className={`accordion-body ${open ? 'open' : ''}`}>
                                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                    <div className="flex gap-3 items-center">
                                      <button onClick={() => { if (recordingKey) stopRecording(); speak(ex.prompt); }} disabled={isLocked} className={`px-4 py-2 rounded-lg font-semibold transition-all ${audioState.isPlaying && audioState.text === ex.prompt ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-purple-600 hover:bg-purple-700'} text-white ${isLocked && !audioState.isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        {audioState.isPlaying && audioState.text === ex.prompt ? '⏸️ Pausar' : '🔊 Escuchar'}
                                      </button>
                                      <button onClick={() => recordingKey === key ? stopRecording() : startRecording(key)} disabled={isLocked} className={`px-4 py-2 rounded-lg font-semibold transition-all ${recordingKey === key ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400' : 'bg-pink-600 hover:bg-pink-700 text-white'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        {recordingKey === key ? '⏹️ Detener' : '🎤 Grabar'}
                                      </button>
                                      {recordingKey === key && (
                                        <div className="flex items-center gap-2 bg-green-900/50 px-3 py-1.5 rounded-full border border-green-600">
                                          <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                                          <span className="text-green-400 text-sm font-mono font-bold">{formatRecordTime(recordingTime)}</span>
                                        </div>
                                      )}
                                      {selectedAnswers[key] && recordingKey !== key && (
                                        <span className="text-green-400 text-sm self-center italic bg-green-900/30 px-2 py-1 rounded border border-green-700">"{selectedAnswers[key]}"</span>
                                      )}
                                    </div>
                                    {fb && (
                                      <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <span className={`font-bold ${getScoreColor(fb.score)}`}>{fb.is_correct ? '✅ Correcto' : '💡 Necesita mejora'} - Puntaje: {fb.score}/100</span>
                                        <p className="text-slate-200 text-sm mt-1">{fb.feedback}</p>
                                        <p className="text-slate-400 text-xs italic mt-1">📚 Fundamento: {fb.pedagogical_reason}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="space-y-2">
                        <h4 className="text-pink-400 font-semibold">Pronunciación - Tips</h4>
                        {pronunciationExercises.map((ex, idx) => {
                          const key = `pron-tip-${idx}`;
                          const open = isExerciseOpen(key);
                          return (
                            <div key={idx}>
                              <div className={`accordion-header`} onClick={() => toggleExercise(key)}>
                                <div className="accordion-header-left">
                                  <span className="accordion-num">{idx + 1}.</span>
                                  <span className="accordion-preview">"{ex.phrase}"</span>
                                </div>
                                <span className="accordion-status">🔊</span>
                                <span className={`accordion-chevron ${open ? 'open' : ''}`}>▼</span>
                              </div>
                              <div className={`accordion-body ${open ? 'open' : ''}`}>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                  <p className="text-pink-400 text-sm italic mb-3">{ex.focus}</p>
                                  <button onClick={() => speak(ex.phrase)} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold text-sm">🔊 Escuchar pronunciación</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {(attempts['pronunciation'] || 0) < 2 ? (
                        <button onClick={() => evaluateBatch('pronunciation', speakingExercises)} disabled={evaluatingSkill === 'pronunciation'} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg font-bold text-lg">
                          {evaluatingSkill === 'pronunciation' ? '🤖 Analizando...' : '🤖 Evaluar speaking con IA'}
                        </button>
                      ) : (
                        <div className="text-center p-4 bg-green-900/20 border border-green-700 rounded-lg">
                          <p className="text-green-400 font-bold text-lg">✅ Evaluación de Speaking finalizada</p>
                          {isAlternateMode['pronunciation'] && (
                            <button onClick={() => exitAlternateMode('pronunciation')} className="mt-3 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-semibold">← Volver a ejercicios originales</button>
                          )}
                          <button onClick={() => loadAlternateExercises('pronunciation')} disabled={loadingAlternate === 'pronunciation' || !!completedSkills['pronunciation']} className={`repasar-btn-3d mt-3 ${completedSkills['pronunciation'] ? 'repasar-completed' : ''}`}>
                            {completedSkills['pronunciation'] ? '✅ Ejercicio completado' : (loadingAlternate === 'pronunciation' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                  )}
                </section>
                )}
              </>
            ) : (
              <div className="panel-header-3d panel-header-amber p-6 text-center">
                <p className="text-yellow-400 text-lg mb-2">⚠️ No se pudo cargar el contenido de la lección</p>
                <button onClick={() => window.location.reload()} className="action-btn-3d action-btn-amber mt-4">Recargar Página</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FLECHA FLOTANTE - Scroll Hint */}
      {showScrollHint && data && activeTab === 'lesson' && (
        <div className="fixed top-0 left-0 right-0 z-40 flex flex-col items-center pt-3 pb-4 px-4 bg-gradient-to-b from-slate-900 via-slate-900/95 to-transparent pointer-events-none">
          <div className="bg-slate-800/90 backdrop-blur-md border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-500/10 px-6 py-4 flex flex-col items-center gap-2 pointer-events-auto">
            <p className="text-amber-400 font-extrabold text-sm md:text-base tracking-wide animate-pulse text-center">Desliza hacia abajo para ver el contenido</p>
            <div className="animate-bounce cursor-pointer" onClick={() => document.querySelector('.panel-3d')?.scrollIntoView({ behavior: 'smooth' })}>
              <svg className="w-16 h-16 md:w-20 md:h-20 text-amber-400 drop-shadow-[0_0_16px_rgba(251,191,36,0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none group/check">
              <input type="checkbox" onChange={dismissScrollHint} className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer" />
              <span className="text-slate-400 text-xs group-hover/check:text-slate-200 transition-colors">No volver a mostrar</span>
            </label>
          </div>
        </div>
      )}

      {/* MODAL DE AYUDA GLOBAL (Corregido: ahora está dentro del return de App) */}
      <HelpModal 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
        title={helpInstructions[currentHelpType]?.title || "Ayuda"}
        instructions={helpInstructions[currentHelpType]?.instructions || ["Instrucciones no disponibles."]}
      />

      {/* MODAL DE ALERTA INVITADO */}
      {showGuestAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-amber-500/50 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-white">Modo Invitado</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Estás usando la app como <span className="text-amber-400 font-semibold">invitado</span>. Tu progreso <span className="text-red-400 font-semibold">no se guardará</span> ni se sincronizará entre dispositivos.
            </p>
            <p className="text-slate-400 text-xs">
              Regístrate con Google para que tu avance quede registrado permanentemente.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => { setShowGuestAlert(false); setPendingLessonId(null); handleLogin(); }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg"
              >
                🔑 Registrarme con Google
              </button>
              <button
                onClick={() => { setShowGuestAlert(false); if (pendingLessonId) setCurrentSubtopicId(pendingLessonId); setPendingLessonId(null); }}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-semibold text-sm transition-all"
              >
                Continuar sin guardar progreso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENTE: MODAL DE AYUDA / INSTRUCCIONES
// ==========================================
interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  instructions: string[];
}

function HelpModal({ isOpen, onClose, title, instructions }: HelpModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
          <span className="text-2xl">❓</span> {title}
        </h3>
        
        <ul className="space-y-3 mb-6">
          {instructions.map((inst, i) => (
            <li key={i} className="flex gap-3 text-slate-300 text-sm leading-relaxed">
              <span className="text-blue-500 font-bold mt-0.5 shrink-0">•</span>
              <span>{inst}</span>
            </li>
          ))}
        </ul>
        
        <button 
          onClick={onClose} 
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/50"
        >
          ¡Entendido, a practicar!
        </button>
      </div>
    </div>
  );
}

export default App;